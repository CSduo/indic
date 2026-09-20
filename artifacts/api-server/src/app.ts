import express, { type ErrorRequestHandler, type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { rateLimit } from "express-rate-limit";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";
import { ensureDefaultCategories } from "./lib/publication-sync";
import { UPLOADS_DIR } from "./lib/storage";
import healthRouter from "./routes/health";
import sitemapRouter from "./routes/sitemap";
import rssRouter from "./routes/rss";
import indexnowRouter from "./routes/indexnow";
import { DEFAULT_INDEXNOW_KEY } from "./lib/indexnow";
import { db, articlesTable, papersTable, usersTable, categoriesTable, submissionsTable, ensureDatabaseSchema, coreTablesExist } from "@workspace/db";
import { eq, and, or, ilike, isNull } from "drizzle-orm";
import { sanitizeArticleBody } from "./lib/content";
import fs from "fs";

const app: Express = express();
const isProduction = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
const configuredOrigins = new Set(
  (process.env.FRONTEND_URL || "")
    .split(",")
    .map(value => value.trim().replace(/\/$/, ""))
    .filter(Boolean),
);
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Vercel forwards through one trusted proxy hop. Local development does not
// trust user-controlled forwarding headers.
app.set("trust proxy", isProduction ? 1 : false);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// Ensure req.log remains available in constrained serverless environments.
app.use((req, _res, next) => {
  if (!req.log) {
    (req as any).log = {
      info: (...args: any[]) => console.log(...args),
      error: (...args: any[]) => console.error(...args),
      warn: (...args: any[]) => console.warn(...args),
      debug: (...args: any[]) => console.debug(...args),
    };
  }
  next();
});

// Cross-origin credentials are opt-in in production. Same-origin browser
// requests do not need a CORS response header.
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const normalized = origin.replace(/\/$/, "");
    const localDevelopment =
      !isProduction &&
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalized);
    callback(null, configuredOrigins.has(normalized) || localDevelopment);
  },
  credentials: true,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Safe URI decoding boundary - catches malformed percent encoding (%ZZ) and returns 400
app.use((req, res, next) => {
  try {
    decodeURI(req.path);
    next();
    return;
  } catch (err) {
    if (err instanceof URIError) {
      res.status(400).json({ error: "Invalid percent-encoded character sequence", code: "BAD_REQUEST" });
      return;
    }
    next(err);
    return;
  }
});

// Administrative and private routes non-indexable header
app.use((req, res, next) => {
  const privatePrefixes = ["/admin", "/account", "/api/private", "/messages", "/saved"];
  if (privatePrefixes.some(prefix => req.path === prefix || req.path.startsWith(`${prefix}/`))) {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
  }
  next();
});

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), geolocation=(), microphone=(self)");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");

  const isUploadOrStatic =
    req.path === "/api/uploads" ||
    req.path.startsWith("/api/uploads/") ||
    req.path === "/uploads" ||
    req.path.startsWith("/uploads/");
  // The locked-down `default-src 'none'` policy is correct for JSON API
  // responses but fatal for the server-rendered article/paper HTML below: it
  // blocks the app's own scripts, styles, and images, so the page renders blank.
  // Only apply it to the API surface.
  const isApiJson = req.path.startsWith("/api/") && !isUploadOrStatic;
  if (isApiJson) {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    );
  }

  if (isProduction) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

// Cookie-authenticated writes must originate from this host or an explicitly
// configured frontend. This blocks CSRF even when cross-site cookies are used.
app.use((req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get("origin");
  const fetchSite = req.get("sec-fetch-site");
  if (!origin) {
    if (fetchSite === "cross-site") {
      return res.status(403).json({ error: "Cross-site request blocked" });
    }
    return next();
  }

  try {
    const parsed = new URL(origin);
    const sameHost = parsed.host === req.get("host");
    const configured = configuredOrigins.has(parsed.origin.replace(/\/$/, ""));
    const localDevelopment =
      !isProduction && /^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname);
    if (sameHost || configured || localDevelopment) return next();
  } catch {
    // Invalid origins are rejected below.
  }

  return res.status(403).json({ error: "Origin not allowed" });
});

// A submission body carries sanitized rich-text HTML that can legitimately
// embed base64 images when no blob/CDN provider is configured. The old 2 MB cap
// rejected those bodies before any route saw them, and the raw payload error
// surfaced to the author as a bare "Request failed".
const JSON_BODY_LIMIT = process.env.JSON_BODY_LIMIT || "25mb";
app.use(express.json({ limit: JSON_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: JSON_BODY_LIMIT }));
app.use(cookieParser());

// Liveness and readiness probes must remain available when the database is
// missing or unhealthy.
app.use("/api", healthRouter);

app.use((req, res, next) => {
  if (!process.env.DATABASE_URL) {
    res.status(503).json({ error: "Service database is not configured." });
    return;
  }
  next();
});

let bootstrap: Promise<unknown> | null = null;

app.use(async (req, res, next) => {
  // Schema repair runs before the default categories are seeded: seeding
  // inserts into columns that a drifted production database may not have yet.
  bootstrap ||= ensureDatabaseSchema().then(() => ensureDefaultCategories());
  try {
    await bootstrap;
    next();
  } catch (err) {
    bootstrap = null;
    req.log.error({ err }, "Failed to initialize the publication database");

    /*
      A failed repair is not by itself a reason to refuse the request. On a
      database that already has its tables — which is every deploy after the
      first — the repair is a formality, and treating a hiccup in it as fatal
      turned a warning into a site-wide outage: every endpoint returned 500,
      which reached people as an empty inbox and a profile that would not save.

      So the question asked here is the one that actually matters: can the
      database serve this request? If the tables are there, carry on and let
      the repair be retried by a later request.
    */
    try {
      if (await coreTablesExist()) {
        req.log.warn("Serving anyway: the schema repair failed but the database has its tables");
        return next();
      }
    } catch (probeErr) {
      req.log.error({ err: probeErr }, "Could not check whether the database has its tables");
    }

    res.status(500).json({
      error: "The publication database could not be initialized. Please try again.",
    });
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/signup", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/google", authLimiter);
app.use("/api/admin/login", authLimiter);

/**
 * Signed-in authors are not the abuse case this limiter exists for. Writing one
 * article legitimately costs dozens of writes — a cover upload, an inline image
 * per figure, repeated autosaves — so counting a signed-in session against a
 * 20/hour anonymous budget made normal authoring fail with 429 partway through.
 * Authenticated requests are exempt; anonymous ones keep a per-IP budget.
 */
function hasSessionCookie(req: import("express").Request): boolean {
  const cookies = (req as any).cookies || {};
  if (cookies.user_session || cookies.admin_session) return true;
  const header = req.headers.cookie || "";
  if (/(?:^|;\s*)(?:user|admin)_session=/.test(header)) return true;
  return /^Bearer\s+\S+/i.test(req.get("authorization") || "");
}

const publicWriteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.PUBLIC_WRITE_RATE_LIMIT || 60),
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => SAFE_METHODS.has(req.method) || hasSessionCookie(req),
  message: { error: "Too many requests from this address. Please try again later." },
});

// Media uploads are inherently high-volume for a single piece of work, so they
// get a much larger anonymous budget than form posts.
const mediaWriteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.MEDIA_WRITE_RATE_LIMIT || 300),
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => SAFE_METHODS.has(req.method) || hasSessionCookie(req),
  message: { error: "Too many uploads from this address. Please try again later." },
});

for (const route of [
  "/api/contact",
  "/api/newsletter",
  "/api/submissions",
  "/api/articles",
  "/api/extract-url",
]) {
  app.use(route, publicWriteLimiter);
}

for (const route of ["/api/media", "/api/uploads"]) {
  app.use(route, mediaWriteLimiter);
}

app.use("/api/uploads", express.static(UPLOADS_DIR, {
  setHeaders(res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const displayable = new Set([
      ".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif",
      ".mp3", ".ogg", ".wav", ".m4a", ".webm",
    ]);
    if (ext === ".pdf") res.setHeader("Content-Type", "application/pdf");
    if (ext === ".txt") res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Disposition", displayable.has(ext) ? "inline" : "attachment");
  },
}));

app.use("/api", router);

// Direct root protocol endpoints
app.use(sitemapRouter);
app.use(rssRouter);
app.use(indexnowRouter);

// Serve IndexNow verification key file at root
app.get(["/indexnow-key.txt", `/${DEFAULT_INDEXNOW_KEY}.txt`], (_req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  return res.status(200).send(DEFAULT_INDEXNOW_KEY);
});

export const CANONICAL_DOMAIN = "https://anvikshikijournal.in";

export function buildCanonicalUrl(pathname: string, query?: Record<string, any> | string): string {
  let cleanPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (cleanPath.length > 1 && cleanPath.endsWith("/")) {
    cleanPath = cleanPath.replace(/\/+$/, "");
  }

  // Publication pages, author hubs, and domain hubs have clean entity URLs without query params
  const isEntityRoute = /^\/(articles|papers|authors|domains|essays|categories)\/[^/?#]+/i.test(cleanPath);
  if (isEntityRoute) {
    return `${CANONICAL_DOMAIN}${cleanPath}`;
  }

  // For general pages, strip marketing/tracking parameters
  let searchParams: URLSearchParams;
  if (typeof query === "string") {
    searchParams = new URLSearchParams(query);
  } else if (query && typeof query === "object") {
    searchParams = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) {
        if (Array.isArray(v)) {
          v.forEach(item => searchParams.append(k, String(item)));
        } else {
          searchParams.append(k, String(v));
        }
      }
    }
  } else {
    searchParams = new URLSearchParams();
  }

  const trackingKeys = new Set(["ref", "fbclid", "gclid", "msclkid", "mc_eid", "_ga", "campaign"]);
  const toDelete: string[] = [];
  searchParams.forEach((_, key) => {
    const lower = key.toLowerCase();
    if (trackingKeys.has(lower) || lower.startsWith("utm_")) {
      toDelete.push(key);
    }
  });
  toDelete.forEach(key => searchParams.delete(key));

  const qs = searchParams.toString();
  return qs ? `${CANONICAL_DOMAIN}${cleanPath}?${qs}` : `${CANONICAL_DOMAIN}${cleanPath}`;
}

let cachedHtmlTemplate: string | null = null;

export function getHtmlTemplate(): string {
  if (cachedHtmlTemplate) return cachedHtmlTemplate;

  const possiblePaths = [
    path.join(process.cwd(), "artifacts", "anvikshiki", "dist", "public", "index.html"),
    path.join(process.cwd(), "dist", "public", "index.html"),
    path.join(__dirname, "..", "..", "anvikshiki", "dist", "public", "index.html"),
    path.join(process.cwd(), "artifacts", "anvikshiki", "index.html"),
    path.join(__dirname, "..", "..", "anvikshiki", "index.html"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      cachedHtmlTemplate = fs.readFileSync(p, "utf-8");
      return cachedHtmlTemplate;
    }
  }

  return "";
}

export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  return str
    .replace(/&(?!amp;|lt;|gt;|quot;|#39;|#x27;|#x2F;|#\d+;)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function safeUrl(url: unknown): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (/^(?:https?:\/\/|\/|mailto:)/i.test(trimmed)) {
    return escapeHtml(trimmed);
  }
  return "";
}

export function stripHtml(html: unknown): string {
  if (!html || typeof html !== "string") return "";
  return html
    .replace(/<script[^>]*>([\S\s]*?)<\/script>/gim, "")
    .replace(/<style[^>]*>([\S\s]*?)<\/style>/gim, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatDate(date: Date | string | number | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatIsoDate(date: Date | string | number | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toISOString();
}

export function formatScholarDate(date: Date | string | number | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `<meta name="citation_publication_date" content="${yyyy}/${mm}/${dd}" />`;
}

export function slugify(text: string): string {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/^(dr|prof|vidwan|acharya|pandit|shri|smt)\.?\s+/i, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface BreadcrumbItem {
  name: string;
  url?: string;
}

export function renderBreadcrumbs(items: BreadcrumbItem[]): string {
  const listItems = items.map((item, index) => {
    const position = index + 1;
    const isLast = index === items.length - 1 || !item.url;
    const nameEscaped = escapeHtml(item.name);

    if (isLast) {
      return `<li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
        <span itemprop="name">${nameEscaped}</span>
        <meta itemprop="position" content="${position}" />
      </li>`;
    }

    return `<li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
      <a itemprop="item" href="${safeUrl(item.url)}">
        <span itemprop="name">${nameEscaped}</span>
      </a>
      <meta itemprop="position" content="${position}" />
    </li>`;
  }).join('<li class="ssr-sep" aria-hidden="true">/</li>\n');

  return `<nav aria-label="Breadcrumb" class="ssr-breadcrumbs">
    <ol itemscope itemtype="https://schema.org/BreadcrumbList">
      ${listItems}
    </ol>
  </nav>`;
}

export function renderReferences(rawRefs: unknown): string {
  if (!Array.isArray(rawRefs) || rawRefs.length === 0) return "";

  const items = rawRefs.map((ref, idx) => {
    const indexNum = idx + 1;

    if (typeof ref === "string") {
      return `<li>
        <span class="ssr-ref-num">${indexNum}.</span>
        <span class="ssr-ref-text"><em>${escapeHtml(ref)}</em></span>
      </li>`;
    }

    if (ref && typeof ref === "object") {
      const title = (ref as any).title || (ref as any).name || (ref as any).text || String(ref);
      const url = (ref as any).url || (ref as any).href || (ref as any).link || null;
      const author = (ref as any).authors || (ref as any).author || null;
      const year = (ref as any).year || (ref as any).date || null;
      const publication = (ref as any).publication || (ref as any).journal || (ref as any).publisher || null;

      let authorSnippet = "";
      if (author) {
        authorSnippet = `<span class="ssr-ref-author">${escapeHtml(author)}${year ? ` (${escapeHtml(year)})` : ""}. </span>`;
      }

      let titleSnippet = "";
      if (url) {
        titleSnippet = `<a href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer" class="ssr-ref-link">${escapeHtml(title)}</a>`;
      } else {
        titleSnippet = `<em>${escapeHtml(title)}</em>`;
      }

      const pubSnippet = publication ? `<span class="ssr-ref-pub"> — ${escapeHtml(publication)}</span>` : "";

      return `<li>
        <span class="ssr-ref-num">${indexNum}.</span>
        <span class="ssr-ref-text">${authorSnippet}${titleSnippet}${pubSnippet}</span>
      </li>`;
    }

    return `<li>
      <span class="ssr-ref-num">${indexNum}.</span>
      <span class="ssr-ref-text">${escapeHtml(String(ref))}</span>
    </li>`;
  }).join("\n");

  return `<section class="ssr-section ssr-references" id="references">
    <h2>Sources &amp; References</h2>
    <ol class="ssr-reference-list">
      ${items}
    </ol>
  </section>`;
}

export function renderTags(tags: unknown, label = "Topics & Tags"): string {
  const tagList = Array.isArray(tags)
    ? tags
    : typeof tags === "string"
      ? tags.split(",").map(t => t.trim())
      : [];

  const validTags = tagList.filter(t => typeof t === "string" && t.trim().length > 0);
  if (validTags.length === 0) return "";

  const items = validTags.map(tag => {
    const cleanTag = tag.trim();
    return `<li><a href="/search?q=${encodeURIComponent(cleanTag)}">${escapeHtml(cleanTag)}</a></li>`;
  }).join("\n");

  return `<section class="ssr-section ssr-tags">
    <h2>${escapeHtml(label)}</h2>
    <ul class="ssr-tag-list">
      ${items}
    </ul>
  </section>`;
}

export function renderBodyHtml(body: unknown, fallbackExcerpt?: string): string {
  if (typeof body === "string" && body.trim().length > 0) {
    const raw = body.trim();
    const isHtml = /<[a-z][\s\S]*>/i.test(raw);
    const contentToSanitize = isHtml
      ? raw
      : raw.split(/\n{2,}/).map(p => `<p>${escapeHtml(p.trim())}</p>`).join("\n");
    const sanitized = sanitizeArticleBody(contentToSanitize);
    return sanitized.replace(/<img(?![^>]*\bloading=)/gi, '<img loading="lazy" decoding="async"');
  }

  if (fallbackExcerpt && fallbackExcerpt.trim().length > 0) {
    return `<div class="ssr-prose-fallback">
      <p>${escapeHtml(fallbackExcerpt)}</p>
    </div>`;
  }

  return `<p class="ssr-note"><em>Full text coming soon.</em></p>`;
}

export function sanitizeTemplateHead(html: string): string {
  return html
    .replace(/<title>.*?<\/title>/gis, "")
    .replace(/<meta\s+name=["']description["'][^>]*>/gi, "")
    .replace(/<meta\s+name=["']robots["'][^>]*>/gi, "")
    .replace(/<meta\s+name=["']author["'][^>]*>/gi, "")
    .replace(/<meta\s+property=["']article:[^"']*["'][^>]*>/gi, "")
    .replace(/<meta\s+property=["']og:[^"']*["'][^>]*>/gi, "")
    .replace(/<meta\s+name=["']twitter:[^"']*["'][^>]*>/gi, "")
    .replace(/<meta\s+name=["']citation_[^"']*["'][^>]*>/gi, "")
    .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, "")
    .replace(/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gis, "");
}

export const SSR_CSS_STYLES = `<style id="anvikshiki-ssr-styles">
  :root {
    --ssr-bg: #faf7f2;
    --ssr-ink: #1a1612;
    --ssr-ink-soft: #4a433a;
    --ssr-ink-faint: #8c8273;
    --ssr-gold: #c9944a;
    --ssr-border: #e8e0d2;
    --ssr-surface: #fbf8f2;
    --ssr-surface-alt: #f4eee3;
  }
  html.dark {
    --ssr-bg: #0e0d0b;
    --ssr-ink: #f5f0e8;
    --ssr-ink-soft: #ded8ce;
    --ssr-ink-faint: #a69e90;
    --ssr-gold: #e8b066;
    --ssr-border: #2b2721;
    --ssr-surface: #171512;
    --ssr-surface-alt: #1a1815;
  }
  body {
    margin: 0;
    background-color: var(--ssr-bg);
    color: var(--ssr-ink);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .ssr-content {
    max-width: 860px;
    margin: 0 auto;
    padding: 2.5rem 1.25rem;
    box-sizing: border-box;
  }
  .ssr-domain-hub, .ssr-author-hub {
    max-width: 1080px;
  }
  .ssr-breadcrumbs {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    padding: 0;
    margin: 0 0 1.5rem 0;
    list-style: none;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--ssr-ink-faint);
  }
  .ssr-breadcrumbs a {
    color: var(--ssr-ink-faint);
    text-decoration: none;
    transition: color 0.15s;
  }
  .ssr-breadcrumbs a:hover {
    color: var(--ssr-ink);
    text-decoration: underline;
  }
  .ssr-breadcrumbs li:not(:last-child)::after {
    content: "/";
    margin-left: 0.5rem;
    color: var(--ssr-border);
  }
  .ssr-badge {
    display: inline-block;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    background: #eedfc8;
    color: #8c5324;
    text-decoration: none;
  }
  html.dark .ssr-badge {
    background: #2a2218;
    color: #e8b066;
  }
  .ssr-title {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: clamp(2.1rem, 4.5vw, 3.5rem);
    line-height: 1.12;
    font-weight: 700;
    color: var(--ssr-ink);
    margin: 0.75rem 0;
  }
  .ssr-subtitle {
    font-size: 1.25rem;
    line-height: 1.4;
    font-style: italic;
    color: var(--ssr-ink-soft);
    margin: 0 0 1.5rem 0;
  }
  .ssr-byline-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 1.25rem;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ssr-ink-faint);
    border-top: 1px solid var(--ssr-border);
    border-bottom: 1px solid var(--ssr-border);
    padding: 0.85rem 0;
    margin: 1.75rem 0;
  }
  .ssr-author-link {
    color: var(--ssr-ink);
    font-weight: 600;
    text-decoration: none;
  }
  .ssr-author-link:hover {
    text-decoration: underline;
  }
  .ssr-hero-figure {
    margin: 2rem 0;
    text-align: center;
  }
  .ssr-hero-figure img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    border: 1px solid var(--ssr-border);
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
  }
  .ssr-hero-figure figcaption {
    font-size: 0.8rem;
    color: var(--ssr-ink-faint);
    margin-top: 0.5rem;
    font-style: italic;
  }
  .ssr-abstract-box {
    background: var(--ssr-surface-alt);
    border-left: 4px solid var(--ssr-gold);
    padding: 1.25rem 1.5rem;
    border-radius: 4px;
    margin: 2rem 0;
    text-align: left;
  }
  .ssr-section-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--ssr-gold);
    margin: 0 0 0.5rem 0;
  }
  .ssr-abstract-text {
    font-style: italic;
    font-size: 1.05rem;
    line-height: 1.6;
    color: var(--ssr-ink-soft);
    margin: 0;
  }
  .ssr-body {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 1.25rem;
    line-height: 1.85;
    color: var(--ssr-ink);
    margin: 2.5rem 0;
  }
  .ssr-body p {
    margin-bottom: 1.75rem;
  }
  .ssr-body h2, .ssr-body h3, .ssr-body h4 {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-weight: 700;
    color: var(--ssr-ink);
    margin-top: 2.25rem;
    margin-bottom: 1rem;
    line-height: 1.25;
  }
  .ssr-body blockquote {
    border-left: 3px solid var(--ssr-gold);
    padding-left: 1.25rem;
    margin: 1.75rem 0;
    font-style: italic;
    color: var(--ssr-ink-soft);
  }
  .ssr-tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0;
    list-style: none;
    margin: 1rem 0;
  }
  .ssr-tag-list a {
    display: inline-block;
    font-size: 0.75rem;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    border: 1px solid var(--ssr-border);
    color: var(--ssr-ink-soft);
    text-decoration: none;
    background: var(--ssr-surface);
  }
  .ssr-author-bio-card {
    background: var(--ssr-surface);
    border: 1px solid var(--ssr-border);
    border-left: 4px solid var(--ssr-gold);
    padding: 1.5rem;
    border-radius: 6px;
    margin: 2.5rem 0;
    text-align: left;
  }
  .ssr-author-bio-card h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.1rem;
    color: var(--ssr-ink);
  }
  .ssr-author-bio-card p {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.6;
    color: var(--ssr-ink-soft);
  }
  .ssr-citation-note {
    background: var(--ssr-surface);
    border: 1px dashed var(--ssr-border);
    padding: 1rem 1.25rem;
    border-radius: 6px;
    font-size: 0.85rem;
    color: var(--ssr-ink-faint);
    margin: 1.5rem 0;
    word-break: break-all;
    text-align: left;
  }
  .ssr-contributor-cta {
    background: var(--ssr-surface-alt);
    border: 1px solid var(--ssr-border);
    padding: 1.25rem 1.5rem;
    border-radius: 6px;
    margin: 2rem 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    text-align: left;
  }
  .ssr-contributor-cta a {
    display: inline-block;
    background: #8c5324;
    color: #ffffff;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 600;
    text-decoration: none;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .ssr-author-header {
    display: flex;
    gap: 2rem;
    align-items: center;
    background: var(--ssr-surface);
    border: 1px solid var(--ssr-border);
    padding: 2rem;
    border-radius: 8px;
    margin-bottom: 2.5rem;
    flex-wrap: wrap;
  }
  .ssr-avatar-container {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    overflow: hidden;
    border: 2px solid var(--ssr-gold);
    box-shadow: 0 0 0 4px var(--ssr-bg);
    flex-shrink: 0;
  }
  .ssr-author-avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .ssr-author-avatar-placeholder {
    width: 100%;
    height: 100%;
    background: #eedfc8;
    color: #8c5324;
    font-weight: 700;
    font-size: 2rem;
    display: grid;
    place-items: center;
  }
  .ssr-author-details {
    flex: 1;
    min-width: 260px;
    text-align: left;
  }
  .ssr-handle {
    font-size: 0.85rem;
    color: var(--ssr-ink-faint);
    margin: -0.25rem 0 0.5rem 0;
  }
  .ssr-institution {
    font-size: 0.9rem;
    color: var(--ssr-ink-soft);
    margin: 0.25rem 0;
  }
  .ssr-author-counts {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
    flex-wrap: wrap;
  }
  .ssr-count-badge {
    font-size: 0.8rem;
    padding: 0.25rem 0.65rem;
    border-radius: 4px;
    background: var(--ssr-surface-alt);
    border: 1px solid var(--ssr-border);
    color: var(--ssr-ink-soft);
  }
  .ssr-work-list {
    list-style: none;
    padding: 0;
    margin: 1.5rem 0;
    display: grid;
    gap: 1.25rem;
  }
  .ssr-work-item {
    background: var(--ssr-surface);
    border: 1px solid var(--ssr-border);
    border-radius: 6px;
    padding: 1.25rem 1.5rem;
    text-align: left;
    transition: border-color 0.15s;
  }
  .ssr-work-item h3, .ssr-work-item h4 {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 1.35rem;
    margin: 0 0 0.5rem 0;
    line-height: 1.25;
  }
  .ssr-work-item a {
    color: var(--ssr-ink);
    text-decoration: none;
  }
  .ssr-work-item a:hover {
    color: var(--ssr-gold);
    text-decoration: underline;
  }
  .ssr-work-excerpt {
    font-size: 0.9rem;
    color: var(--ssr-ink-soft);
    line-height: 1.6;
    margin: 0.5rem 0;
  }
  .ssr-work-meta {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ssr-ink-faint);
    display: flex;
    gap: 1rem;
    margin-top: 0.75rem;
  }
  .ssr-columns-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 2rem;
    margin-top: 1.5rem;
  }
</style>`;

export function injectSsrHtml(template: string, metaTags: string, ssrBody: string, initialData?: unknown): string {
  const cleanTemplate = sanitizeTemplateHead(template);
  const dataScript = initialData !== undefined
    ? `\n<script id="__ANVIKSHIKI_DATA__" type="application/json">${JSON.stringify(initialData).replace(/</g, "\\u003c")}</script>`
    : "";
  const withMeta = cleanTemplate.replace(/<\/head>/i, `${SSR_CSS_STYLES}\n${metaTags}${dataScript}\n</head>`);
  if (withMeta.includes('<div id="root"></div>')) {
    return withMeta.replace('<div id="root"></div>', `<div id="root">${ssrBody}</div>`);
  }
  return withMeta.replace(/<div id=["']root["']>[\s\S]*?<\/div>/i, `<div id="root">${ssrBody}</div>`);
}

export function buildFallbackHtml(metaTags: string, ssrBody: string, initialData?: unknown): string {
  const dataScript = initialData !== undefined
    ? `\n<script id="__ANVIKSHIKI_DATA__" type="application/json">${JSON.stringify(initialData).replace(/</g, "\\u003c")}</script>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${SSR_CSS_STYLES}
    ${metaTags}
    ${dataScript}
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <script src="/theme-init.js"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root">${ssrBody}</div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
}

export function renderErrorPage(statusCode: 404 | 410, resourceType: string, slug: string): string {
  const is410 = statusCode === 410;
  const title = is410 ? "410 - Content Permanently Withdrawn" : "404 - Page Not Found";
  const heading = is410 ? "410 - Content Permanently Withdrawn" : "404 - Not Found";
  const message = is410
    ? `The requested ${escapeHtml(resourceType)} <code>${escapeHtml(slug)}</code> has been permanently withdrawn or removed from publication.`
    : `The requested ${escapeHtml(resourceType)} <code>${escapeHtml(slug)}</code> could not be found in the Ānvīkṣikī archive.`;

  const metaTags = `
    <title>${escapeHtml(title)} — Ānvīkṣikī</title>
    <meta name="robots" content="noindex, nofollow" />
  `;

  const bodyHtml = `
  <main class="error-container ssr-content ssr-error ${is410 ? "ssr-gone" : "ssr-not-found"}">
    <h1>${heading}</h1>
    <p>${message}</p>
    <p><a href="/browse">Browse the Archive</a> · <a href="/">Return to Home</a></p>
  </main>
  `;

  const template = getHtmlTemplate();
  if (template) {
    return injectSsrHtml(template, metaTags, bodyHtml);
  }

  return buildFallbackHtml(metaTags, bodyHtml);
}

export function send404(res: import("express").Response, resourceType: string, slug: string) {
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  const html = renderErrorPage(404, resourceType, slug);
  return res.status(404).send(html);
}

export function send410(res: import("express").Response, resourceType: string, slug: string) {
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  const html = renderErrorPage(410, resourceType, slug);
  return res.status(410).send(html);
}

export function generateArticleSsrHtml(article: any, domainDisplayName: string): string {
  const author = article.authorName || "Ānvīkṣikī Editorial Collective";
  const authorSlug = slugify(author);
  const isoPublished = formatIsoDate(article.publishedAt);
  const formattedPublished = formatDate(article.publishedAt);
  const isoUpdated = formatIsoDate(article.updatedAt);
  const formattedUpdated = formatDate(article.updatedAt);
  const readingTime = article.readingMinutes ? `${article.readingMinutes} min read` : "Essay";

  const breadcrumbsHtml = renderBreadcrumbs([
    { name: "Home", url: "/" },
    { name: "Journal", url: "/browse" },
    { name: domainDisplayName, url: `/domains/${article.categorySlug}` },
    { name: article.title },
  ]);

  const tagsHtml = renderTags(article.tags, "Topics");
  const referencesHtml = renderReferences(article.references);
  const bodyHtml = renderBodyHtml(article.body, article.excerpt || undefined);

  return `<article class="ssr-content ssr-article" itemscope itemtype="https://schema.org/Article">
  ${breadcrumbsHtml}

  <header class="ssr-article-header">
    <div class="ssr-domain-pill">
      <a href="/domains/${escapeHtml(article.categorySlug)}" class="ssr-badge">${escapeHtml(domainDisplayName)}</a>
    </div>

    <h1 class="ssr-title" itemprop="headline">${escapeHtml(article.title)}</h1>

    ${article.subtitle ? `<p class="ssr-subtitle" itemprop="alternativeHeadline">${escapeHtml(article.subtitle)}</p>` : ""}

    <div class="ssr-byline-bar">
      <div class="ssr-author" itemprop="author" itemscope itemtype="https://schema.org/Person">
        <span>By </span>
        <a itemprop="url" href="/authors/${escapeHtml(authorSlug)}" class="ssr-author-link">
          <span itemprop="name">${escapeHtml(author)}</span>
        </a>
      </div>

      <div class="ssr-metadata-items">
        ${isoPublished ? `<time datetime="${isoPublished}" itemprop="datePublished" class="ssr-date">${escapeHtml(formattedPublished)}</time>` : ""}
        ${article.updatedAt && isoUpdated !== isoPublished ? `<span class="ssr-updated-date">(Updated <time datetime="${isoUpdated}" itemprop="dateModified">${escapeHtml(formattedUpdated)}</time>)</span>` : ""}
        <span class="ssr-reading-time">${escapeHtml(readingTime)}</span>
      </div>
    </div>

    ${article.heroImageUrl ? `
    <figure class="ssr-hero-figure" itemprop="image" itemscope itemtype="https://schema.org/ImageObject">
      <img src="${safeUrl(article.heroImageUrl)}" alt="${escapeHtml(article.heroImageAlt || article.title)}" itemprop="url" loading="eager" />
      ${article.heroImageAlt ? `<figcaption>${escapeHtml(article.heroImageAlt)}</figcaption>` : ""}
    </figure>
    ` : ""}

    ${article.excerpt ? `
    <div class="ssr-abstract-box" itemprop="description">
      <p class="ssr-section-label">Abstract</p>
      <p class="ssr-abstract-text">${escapeHtml(article.excerpt)}</p>
    </div>
    ` : ""}

    ${article.keyTakeaways && Array.isArray(article.keyTakeaways) && article.keyTakeaways.length > 0 ? `
    <section class="ssr-section ssr-takeaways">
      <h2>Key Takeaways</h2>
      <ul>
        ${article.keyTakeaways.map((item: string) => `<li>${escapeHtml(item)}</li>`).join("\n")}
      </ul>
    </section>
    ` : ""}
  </header>

  <div class="ssr-body" itemprop="articleBody">
    ${bodyHtml}
  </div>

  ${tagsHtml}
  ${referencesHtml}

    <div class="ssr-author-bio-card">
      <h3>About the Author</h3>
      <p><strong><a href="/authors/${escapeHtml(authorSlug)}">${escapeHtml(author)}</a></strong> is a contributor to Ānvīkṣikī Journal.</p>
    </div>
    <section class="ssr-section ssr-citation-details">
      <h2>Citation &amp; Scholarly Attribution</h2>
      <div class="ssr-citation-card">
        <p class="ssr-citation-formatted"><strong>APA:</strong> ${escapeHtml(author)} (${article.publishedAt ? new Date(article.publishedAt).getFullYear() : new Date().getFullYear()}). "${escapeHtml(article.title)}". <em>Ānvīkṣikī: An Open Journal of Indic Philosophy &amp; Intellectual Traditions</em>. <a href="https://anvikshikijournal.in/articles/${escapeHtml(article.slug)}">https://anvikshikijournal.in/articles/${escapeHtml(article.slug)}</a></p>
        <p class="ssr-citation-formatted"><strong>MLA:</strong> ${escapeHtml(author)}. "${escapeHtml(article.title)}." <em>Ānvīkṣikī</em>, ${article.publishedAt ? new Date(article.publishedAt).getFullYear() : new Date().getFullYear()}, &lt;https://anvikshikijournal.in/articles/${escapeHtml(article.slug)}&gt;.</p>
        <p class="ssr-citation-formatted"><strong>Chicago:</strong> ${escapeHtml(author)}. ${article.publishedAt ? new Date(article.publishedAt).getFullYear() : new Date().getFullYear()}. "${escapeHtml(article.title)}." <em>Ānvīkṣikī: An Open Journal of Indic Philosophy &amp; Intellectual Traditions</em>. https://anvikshikijournal.in/articles/${escapeHtml(article.slug)}</p>
        <pre class="ssr-bibtex-code"><code>@article{${slugify(author).replace(/-/g, "_")}_${article.publishedAt ? new Date(article.publishedAt).getFullYear() : new Date().getFullYear()},
  title={${article.title}},
  author={${author}},
  journal={Ānvīkṣikī: An Open Journal of Indic Philosophy & Intellectual Traditions},
  year={${article.publishedAt ? new Date(article.publishedAt).getFullYear() : new Date().getFullYear()}},
  url={https://anvikshikijournal.in/articles/${article.slug}}
}</code></pre>
      </div>
      <div class="ssr-social-share-links" style="margin-top: 1rem; display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
        <span><strong>Share Publication:</strong> </span>
        <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(`https://anvikshikijournal.in/articles/${article.slug}`)}" target="_blank" rel="noopener noreferrer">X (Twitter)</a> · 
        <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://anvikshikijournal.in/articles/${article.slug}`)}" target="_blank" rel="noopener noreferrer">LinkedIn</a> · 
        <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(`${article.title} https://anvikshikijournal.in/articles/${article.slug}`)}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
      </div>
    </section>
    <div class="ssr-contributor-cta">
      <h3>Contribute to Ānvīkṣikī</h3>
      <p>Have research, translations, or philosophical arguments in Indic studies worth publishing? <a href="/submit">Submit your manuscript or essay for editorial review</a>.</p>
    </div>
  </footer>
</article>`;
}

export function generatePaperSsrHtml(paper: any, domainDisplayName: string): string {
  const author = paper.authorName || "Anonymous Scholar";
  const authorsList = author.split(/,\s*/);
  const year = paper.year || (paper.publishedAt ? new Date(paper.publishedAt).getFullYear() : new Date().getFullYear());
  const isoPublished = formatIsoDate(paper.publishedAt);
  const formattedPublished = formatDate(paper.publishedAt);
  const typeLabel = (paper.paperType || "RESEARCH_PAPER").replace(/_/g, " ");

  const breadcrumbsHtml = renderBreadcrumbs([
    { name: "Home", url: "/" },
    { name: "Papers", url: "/papers" },
    { name: domainDisplayName, url: `/domains/${paper.categorySlug}` },
    { name: paper.title },
  ]);

  const tagsHtml = renderTags(paper.tags, "Keywords");
  const referencesHtml = renderReferences(paper.references);
  const bodyHtml = renderBodyHtml(paper.body, paper.abstract || undefined);

  const citationText = paper.citationText || `${author} (${year}). "${paper.title}". Ānvīkṣikī Journal of Indic Studies.`;
  const bibtexAuthor = author.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
  const bibtex = `@article{${bibtexAuthor}_${year},
  title={${paper.title}},
  author={${author}},
  journal={Ānvīkṣikī: An Open Journal of Indic Philosophy & Intellectual Traditions},
  year={${year}},
  url={https://anvikshikijournal.in/papers/${paper.slug}}${paper.doi ? `,\n  doi={${paper.doi}}` : ""}
}`;

  const authorsHtml = authorsList.map((auth: string) => {
    const aSlug = slugify(auth);
    return `<span class="ssr-author" itemprop="author" itemscope itemtype="https://schema.org/Person">
      <a itemprop="url" href="/authors/${escapeHtml(aSlug)}" class="ssr-author-link">
        <span itemprop="name">${escapeHtml(auth.trim())}</span>
      </a>
    </span>`;
  }).join(", ");

  return `<article class="ssr-content ssr-paper" itemscope itemtype="https://schema.org/ScholarlyArticle">
  ${breadcrumbsHtml}

  <header class="ssr-paper-header">
    <div class="ssr-badge-bar">
      <span class="ssr-badge ssr-badge-type">${escapeHtml(typeLabel)}</span>
      ${paper.peerReviewed ? `<span class="ssr-badge ssr-badge-peer-reviewed">Peer Reviewed</span>` : ""}
      <span class="ssr-badge ssr-badge-year">${escapeHtml(year)}</span>
      <a href="/domains/${escapeHtml(paper.categorySlug)}" class="ssr-badge ssr-badge-domain">${escapeHtml(domainDisplayName)}</a>
    </div>

    <h1 class="ssr-title" itemprop="headline">${escapeHtml(paper.title)}</h1>

    <div class="ssr-byline-bar">
      <div class="ssr-authors-wrap">
        <span>By </span>
        ${authorsHtml}
        ${paper.institution ? `<span class="ssr-institution">(${escapeHtml(paper.institution)})</span>` : ""}
      </div>

      <div class="ssr-metadata-items">
        ${isoPublished ? `<time datetime="${isoPublished}" itemprop="datePublished" class="ssr-date">${escapeHtml(formattedPublished)}</time>` : ""}
        ${paper.readingMinutes ? `<span class="ssr-reading-time">${paper.readingMinutes} min read</span>` : ""}
      </div>

      ${paper.doi ? `
      <div class="ssr-doi" itemprop="identifier">
        <span>DOI: </span>
        <a href="https://doi.org/${escapeHtml(paper.doi)}" target="_blank" rel="noopener noreferrer" class="ssr-doi-link">https://doi.org/${escapeHtml(paper.doi)}</a>
      </div>
      ` : ""}
    </div>

    ${paper.pdfUrl ? `
    <div class="ssr-pdf-actions">
      <a href="${safeUrl(paper.pdfUrl)}" target="_blank" rel="noopener noreferrer" class="ssr-btn-download" itemprop="encoding" itemscope itemtype="https://schema.org/MediaObject">
        <span itemprop="contentUrl" content="${safeUrl(paper.pdfUrl)}">Download Full PDF Manuscript</span>
      </a>
    </div>
    ` : ""}

    ${paper.abstract ? `
    <section class="ssr-abstract-box" itemprop="description">
      <h2 class="ssr-section-label">Abstract</h2>
      <p class="ssr-abstract-text">${escapeHtml(paper.abstract)}</p>
    </section>
    ` : ""}
  </header>

  <div class="ssr-body" itemprop="articleBody">
    ${bodyHtml}
  </div>

  <section class="ssr-section ssr-citation-details">
    <h2>Citation Details</h2>
    <div class="ssr-citation-card">
      <p class="ssr-citation-formatted">${escapeHtml(citationText)}</p>
      <pre class="ssr-bibtex-code"><code>${escapeHtml(bibtex)}</code></pre>
    </div>
  </section>

  ${tagsHtml}
  ${referencesHtml}

  <footer class="ssr-paper-footer">
    <div class="ssr-contributor-cta">
      <h3>Contribute to Ānvīkṣikī</h3>
      <p>Have research, translations, or philosophical arguments in Indic studies worth publishing? <a href="/submit">Submit your manuscript or essay for editorial review</a>.</p>
    </div>
  </footer>
</article>`;
}

export function generateAuthorHubSsrHtml(
  author: {
    name: string;
    handle?: string | null;
    bio?: string | null;
    institution?: string | null;
    avatarUrl?: string | null;
    articleCount: number;
    paperCount: number;
  },
  articles: Array<any>,
  papers: Array<any>
): string {
  const initials = (author.name || "A")
    .split(" ")
    .filter(Boolean)
    .map(n => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const breadcrumbsHtml = renderBreadcrumbs([
    { name: "Home", url: "/" },
    { name: "Authors", url: "/browse" },
    { name: author.name },
  ]);

  return `<main class="ssr-content ssr-author-hub" itemscope itemtype="https://schema.org/ProfilePage">
  ${breadcrumbsHtml}

  <header class="ssr-author-header" itemprop="mainEntity" itemscope itemtype="https://schema.org/Person">
    <div class="ssr-avatar-container">
      ${author.avatarUrl ? `
        <img src="${safeUrl(author.avatarUrl)}" alt="${escapeHtml(author.name)}" itemprop="image" class="ssr-author-avatar" />
      ` : `
        <div class="ssr-author-avatar-placeholder" aria-hidden="true">${escapeHtml(initials)}</div>
      `}
    </div>

    <div class="ssr-author-details">
      <h1 class="ssr-title" itemprop="name">${escapeHtml(author.name)}</h1>
      ${author.handle ? `<p class="ssr-handle">@${escapeHtml(author.handle)}</p>` : ""}
      ${author.institution ? `<p class="ssr-institution" itemprop="worksFor">${escapeHtml(author.institution)}</p>` : ""}

      ${author.bio ? `
      <div class="ssr-bio" itemprop="description">
        <p>${escapeHtml(author.bio)}</p>
      </div>
      ` : ""}

      <div class="ssr-author-counts">
        <span class="ssr-count-badge"><strong>${articles.length}</strong> Essays &amp; Articles</span>
        <span class="ssr-count-badge"><strong>${papers.length}</strong> Research Papers</span>
      </div>
    </div>
  </header>

  ${articles.length > 0 ? `
  <section class="ssr-section ssr-author-publications">
    <h2>Published Essays &amp; Articles (${articles.length})</h2>
    <ul class="ssr-work-list">
      ${articles.map(art => `
        <li class="ssr-work-item">
          <article itemscope itemtype="https://schema.org/Article">
            <h3 itemprop="headline"><a itemprop="url" href="/articles/${escapeHtml(art.slug)}">${escapeHtml(art.title)}</a></h3>
            ${art.excerpt ? `<p class="ssr-work-excerpt" itemprop="description">${escapeHtml(art.excerpt)}</p>` : ""}
            <div class="ssr-work-meta">
              ${art.publishedAt ? `<time datetime="${formatIsoDate(art.publishedAt)}" itemprop="datePublished">${escapeHtml(formatDate(art.publishedAt))}</time>` : ""}
              ${art.categorySlug ? `<span class="ssr-work-domain"><a href="/domains/${escapeHtml(art.categorySlug)}">${escapeHtml(art.categorySlug)}</a></span>` : ""}
            </div>
          </article>
        </li>
      `).join("\n")}
    </ul>
  </section>
  ` : ""}

  ${papers.length > 0 ? `
  <section class="ssr-section ssr-author-publications">
    <h2>Research Papers &amp; Monographs (${papers.length})</h2>
    <ul class="ssr-work-list">
      ${papers.map(p => `
        <li class="ssr-work-item">
          <article itemscope itemtype="https://schema.org/ScholarlyArticle">
            <h3 itemprop="headline"><a itemprop="url" href="/papers/${escapeHtml(p.slug)}">${escapeHtml(p.title)}</a></h3>
            ${p.abstract ? `<p class="ssr-work-excerpt" itemprop="description">${escapeHtml(stripHtml(p.abstract).slice(0, 220))}...</p>` : ""}
            <div class="ssr-work-meta">
              ${p.year ? `<span class="ssr-work-year">Year: ${escapeHtml(p.year)}</span>` : ""}
              ${p.publishedAt ? `<time datetime="${formatIsoDate(p.publishedAt)}" itemprop="datePublished">${escapeHtml(formatDate(p.publishedAt))}</time>` : ""}
              ${p.doi ? `<span class="ssr-work-doi">DOI: ${escapeHtml(p.doi)}</span>` : ""}
            </div>
          </article>
        </li>
      `).join("\n")}
    </ul>
  </section>
  ` : ""}
  ${articles.length === 0 && papers.length === 0 ? `
  <section class="ssr-section ssr-author-publications">
    <p>No published articles or papers currently catalogued for this scholar.</p>
  </section>
  ` : ""}
</main>`;
}

export function generateDomainHubSsrHtml(
  category: {
    slug: string;
    name: string;
    description?: string | null;
    icon?: string | null;
  },
  articles: Array<any>,
  papers: Array<any>
): string {
  const totalWorks = articles.length + papers.length;

  const breadcrumbsHtml = renderBreadcrumbs([
    { name: "Home", url: "/" },
    { name: "Explore", url: "/browse" },
    { name: category.name },
  ]);

  return `<main class="ssr-content ssr-domain-hub" itemscope itemtype="https://schema.org/CollectionPage">
  ${breadcrumbsHtml}

  <header class="ssr-domain-header">
    <span class="ssr-domain-label">Discipline</span>
    <h1 class="ssr-title" itemprop="name">${escapeHtml(category.name)}</h1>
    ${category.description ? `<p class="ssr-description" itemprop="description">${escapeHtml(category.description)}</p>` : ""}
    <div class="ssr-domain-stats">
      <span><strong>${articles.length}</strong> Essays</span> · <span><strong>${papers.length}</strong> Papers</span>
    </div>
  </header>

  <section class="ssr-section ssr-domain-publications">
    <h2>Published Works in ${escapeHtml(category.name)}</h2>

    ${totalWorks === 0 ? `
      <div class="ssr-empty-box">
        <p>The first folio for this domain is being compiled. Essays and research papers in ${escapeHtml(category.name)} are actively invited.</p>
        <p><a href="/submit" class="ssr-btn-submit">Submit a Manuscript in ${escapeHtml(category.name)}</a></p>
      </div>
    ` : `
      <div class="ssr-columns-container">
        ${articles.length > 0 ? `
        <div class="ssr-column">
          <h3>Essays &amp; Articles (${articles.length})</h3>
          <ul class="ssr-work-list">
            ${articles.map(art => `
              <li class="ssr-work-item">
                <article>
                  <h4><a href="/articles/${escapeHtml(art.slug)}">${escapeHtml(art.title)}</a></h4>
                  ${art.authorName ? `<p class="ssr-byline">By <a href="/authors/${slugify(art.authorName)}">${escapeHtml(art.authorName)}</a></p>` : ""}
                  ${art.excerpt ? `<p class="ssr-work-excerpt">${escapeHtml(art.excerpt)}</p>` : ""}
                  ${art.publishedAt ? `<time datetime="${formatIsoDate(art.publishedAt)}">${escapeHtml(formatDate(art.publishedAt))}</time>` : ""}
                </article>
              </li>
            `).join("\n")}
          </ul>
        </div>
        ` : ""}

        ${papers.length > 0 ? `
        <div class="ssr-column">
          <h3>Research Papers (${papers.length})</h3>
          <ul class="ssr-work-list">
            ${papers.map(p => `
              <li class="ssr-work-item">
                <article>
                  <h4><a href="/papers/${escapeHtml(p.slug)}">${escapeHtml(p.title)}</a></h4>
                  ${p.authorName ? `<p class="ssr-byline">By <a href="/authors/${slugify(p.authorName)}">${escapeHtml(p.authorName)}</a></p>` : ""}
                  ${p.abstract ? `<p class="ssr-work-excerpt">${escapeHtml(stripHtml(p.abstract).slice(0, 220))}...</p>` : ""}
                  <div class="ssr-work-meta">
                    ${p.year ? `<span>Year: ${escapeHtml(p.year)}</span>` : ""}
                    ${p.doi ? `<span>DOI: ${escapeHtml(p.doi)}</span>` : ""}
                  </div>
                </article>
              </li>
            `).join("\n")}
          </ul>
        </div>
        ` : ""}
      </div>
    `}
  </section>
</main>`;
}

// HTTP 301 Permanent Redirects for legacy routes
app.get("/essays/:slug", (req, res) => {
  let rawSlug = "";
  try {
    rawSlug = decodeURIComponent(String(req.params.slug || ""));
  } catch {
    return res.status(400).json({ error: "Invalid percent-encoded character sequence", code: "BAD_REQUEST" });
  }
  const cleanSlug = rawSlug.replace(/\/+$/, "");
  const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  return res.redirect(301, `/articles/${encodeURIComponent(cleanSlug)}${qs}`);
});
app.get("/essays", (req, res) => {
  const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  return res.redirect(301, `/articles${qs}`);
});

app.get("/categories/:slug", (req, res) => {
  let rawSlug = "";
  try {
    rawSlug = decodeURIComponent(String(req.params.slug || ""));
  } catch {
    return res.status(400).json({ error: "Invalid percent-encoded character sequence", code: "BAD_REQUEST" });
  }
  const cleanSlug = rawSlug.replace(/\/+$/, "");
  const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  return res.redirect(301, `/domains/${encodeURIComponent(cleanSlug)}${qs}`);
});
app.get("/categories", (req, res) => {
  const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  return res.redirect(301, `/domains${qs}`);
});

export function generateAboutAnvikshikiSsrHtml(): string {
  const breadcrumbsHtml = renderBreadcrumbs([
    { name: "Home", url: "/" },
    { name: "About", url: "/about" },
    { name: "Meaning of Ānvīkṣikī" },
  ]);

  return `<article class="ssr-content ssr-meaning-article" itemscope itemtype="https://schema.org/Article">
  ${breadcrumbsHtml}

  <header class="ssr-article-header">
    <div class="ssr-domain-pill">
      <a href="/domains/philosophy" class="ssr-badge">Classical Epistemology &amp; Nyāya</a>
    </div>
    <h1 class="ssr-title" itemprop="headline">The Meaning of Ānvīkṣikī: Etymology, Philosophy &amp; Classical Heritage</h1>
    <p class="ssr-subtitle" itemprop="alternativeHeadline">आन्वीक्षिकी — The Science of Critical Inquiry and Rational Examination</p>
  </header>

  <div class="ssr-body" itemprop="articleBody">
    <h2>Etymological Origin in Sanskrit (Pāṇinian Vyutpatti)</h2>
    <p>In the classical Sanskrit intellectual tradition, <strong>Ānvīkṣikī</strong> (Devanagari: <em>आन्वीक्षिकी</em>; IAST: <em>ānvīkṣikī</em>; commonly Anglicized as <em>Anvikshiki</em>) designates <strong>the science of critical inquiry, logical investigation, and philosophical examination</strong>.</p>
    <p>Morphologically, the compound is derived according to Pāṇinian grammatical principles from:</p>
    <ul>
      <li><strong>anu (अनु)</strong> — prefix meaning "following upon", "after", or "subsequent to" (direct sensory observation or received testimony).</li>
      <li><strong>īkṣā (ईक्षा)</strong> — verbal root meaning "to look closely", "to scrutinize", "to behold", or "to investigate".</li>
      <li><strong>ikī (इक / की)</strong> — feminine secondary affix (*ṭhañ* / *striyām*) denoting a recognized discipline or branch of systematic learning (<em>vidyā</em>).</li>
    </ul>
    <p>Taken together, Ānvīkṣikī literally signifies: <em>"That systematic science which undertakes inquiry (*īkṣā*) subsequent to (*anu*) immediate perception or textual authority by means of rigorous reason (*yukti*)."</em> In English academic scholarship, it translates as <strong>"rational inquiry"</strong>, <strong>"critical philosophy"</strong>, <strong>"investigative science"</strong>, or <strong>"dialectic epistemology"</strong>.</p>

    <h2>The Classical Doctrine in Kautilya's Arthaśāstra</h2>
    <p>The most celebrated classical exposition of Ānvīkṣikī appears in the opening book of Kautilya's <em>Arthaśāstra</em> (circa 4th–3rd century BCE). Kautilya divides all civilizational learning into four foundational sciences (*catasra eva vidyā iti kauṭilyaḥ*):</p>
    <ol>
      <li><strong>Ānvīkṣikī (आन्वीक्षिकी)</strong> — Philosophy, logic, and rational scrutiny.</li>
      <li><strong>Trayī (त्रयी)</strong> — The sacred ethical and cultural knowledge of the three Vedas.</li>
      <li><strong>Vārtā (वार्ता)</strong> — Economics, commerce, agriculture, and animal husbandry.</li>
      <li><strong>Daṇḍanīti (दण्डनीति)</strong> — Political theory, jurisprudence, and statecraft.</li>
    </ol>
    <blockquote>
      <p><em>"प्रदीपः सर्वविद्यानाम् उपायः सर्वकर्मणाम् ।<br />आश्रयः सर्वधर्माणां शश्वदान्वीक्षिकी मता ॥"</em><br />
      — <strong>Kautilya, Arthaśāstra 1.2.12</strong></p>
      <p><em>"Ānvīkṣikī is ever held to be the illuminating lamp of all sciences, the pragmatic means of all actions, and the foundational support of all civic and ethical duties."</em></p>
    </blockquote>
    <p>Significantly, Kautilya identifies Ānvīkṣikī with three schools of disciplined thought: <strong>Sāṅkhya</strong> (analytical metaphysics), <strong>Yoga</strong> (disciplined introspection and psychological verification), and <strong>Lokāyata</strong> (empirical observation and material inquiry). By testing what is sound and unsound in economics, right and wrong in law, and strength and weakness in governance, Ānvīkṣikī illuminates the intellect (*buddhim avasthāpayati*) and confers poise (*prajñā-vākya-kriyā-vaiśāradyaṃ*) in prosperity and adversity alike.</p>

    <h2>Evolution into Epistemology: The Nyāya Tradition</h2>
    <p>In subsequent centuries, Ānvīkṣikī became synonymous with the formal school of logic: the <strong>Nyāya-darśana</strong>. In his authoritative commentary on the <em>Nyāyasūtra</em> (<em>Nyāyabhāṣya</em> 1.1.1), master philosopher <strong>Vātsyāyana</strong> defined the discipline with utmost precision:</p>
    <blockquote>
      <p><em>"प्रत्यक्षागमाभ्यामीक्षितस्यान्वीक्षणमन्वीक्षा । तया प्रवर्तत इत्यान्वीक्षिकी न्यायविद्या न्यायशास्त्रम् ।"</em><br />
      — <strong>Vātsyāyana, Nyāyabhāṣya 1.1.1</strong></p>
      <p><em>"Anvīkṣā is the critical re-examination (*anv-īkṣaṇa*) of what has already been cognized through perception (*pratyakṣa*) and tradition (*āgama*). That science which proceeds by this method is Ānvīkṣikī — the science of Nyāya, the discipline of rational critique."</em></p>
    </blockquote>
    <p>Vātsyāyana famously describes its method as <em>pramāṇair artha-parīkṣaṇam</em>: the rigorous testing and verification of objects of knowledge through the valid instruments of cognition (<em>pramāṇas</em>): direct perception (<em>pratyakṣa</em>), inference (<em>anumāna</em>), comparison (<em>upamāna</em>), and authoritative testimony (<em>śabda</em>).</p>

    <h2>Why the Journal Bears the Name Ānvīkṣikī</h2>
    <p><strong>Ānvīkṣikī</strong> was established as an open-access journal and living research archive to revive this intellectual heritage. In an era often dominated by fragmented attention, dogmatic assertions, and disposable media, the journal provides a permanent sanctuary for calm, rigorous, and beautiful long-form scholarship across Indic philosophy, Sanskrit studies, civilizational history, and related disciplines.</p>
  </div>

  <footer class="ssr-article-footer">
    <div class="ssr-citation-note">
      <p><strong>Related Destinations</strong>: <a href="/domains/philosophy">Indian Philosophy Hub</a> · <a href="/domains/sanskrit-studies">Sanskrit Studies Hub</a> · <a href="/domains/history">History &amp; Civilizational Memory</a> · <a href="/browse">Publication Index</a> · <a href="/submit">Submit Your Research</a></p>
    </div>
  </footer>
</article>`;
}

export function generateBrowseSsrHtml(
  articles: Array<any>,
  papers: Array<any>,
  categories: Array<any>
): string {
  const breadcrumbsHtml = renderBreadcrumbs([
    { name: "Home", url: "/" },
    { name: "Browse Archive" },
  ]);

  return `<main class="ssr-content ssr-browse-hub" itemscope itemtype="https://schema.org/CollectionPage">
  ${breadcrumbsHtml}

  <header class="ssr-domain-header">
    <span class="ssr-domain-label">Publication Index</span>
    <h1 class="ssr-title" itemprop="name">Browse Research Papers, Articles &amp; Scholarly Archives</h1>
    <p class="ssr-description" itemprop="description">Explore published research papers, peer-level philosophical essays, monographs, and archives across Indic studies, Sanskrit traditions, and civilizational history.</p>
    <div class="ssr-domain-stats">
      <span><strong>${articles.length}</strong> Essays</span> · <span><strong>${papers.length}</strong> Papers</span> · <span><strong>${categories.length}</strong> Disciplines</span>
    </div>
  </header>

  <section class="ssr-section ssr-disciplines">
    <h2>Disciplines &amp; Research Domains</h2>
    <div class="ssr-disciplines-grid" style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 1rem 0 2rem 0;">
      ${categories.map(c => `
        <a href="/domains/${escapeHtml(c.slug)}" class="ssr-badge" style="display: inline-block; padding: 0.35rem 0.75rem; border: 1px solid var(--ssr-border); border-radius: 4px; text-decoration: none; color: var(--ssr-ink);">
          ${escapeHtml(c.name)}
        </a>
      `).join("\n")}
    </div>
  </section>

  <section class="ssr-section ssr-publications">
    <h2>Published Research &amp; Essays</h2>
    <div class="ssr-columns-container">
      <div class="ssr-column">
        <h3>Recent Articles &amp; Monographs (${articles.length})</h3>
        <ul class="ssr-work-list">
          ${articles.map(art => `
            <li class="ssr-work-item">
              <article>
                <h4><a href="/articles/${escapeHtml(art.slug)}">${escapeHtml(art.title)}</a></h4>
                ${art.authorName ? `<p class="ssr-byline">By <a href="/authors/${slugify(art.authorName)}">${escapeHtml(art.authorName)}</a></p>` : ""}
                ${art.excerpt ? `<p class="ssr-work-excerpt">${escapeHtml(art.excerpt)}</p>` : ""}
                ${art.publishedAt ? `<time datetime="${formatIsoDate(art.publishedAt)}">${escapeHtml(formatDate(art.publishedAt))}</time>` : ""}
              </article>
            </li>
          `).join("\n")}
        </ul>
      </div>

      ${papers.length > 0 ? `
      <div class="ssr-column">
        <h3>Research Papers (${papers.length})</h3>
        <ul class="ssr-work-list">
          ${papers.map(p => `
            <li class="ssr-work-item">
              <article>
                <h4><a href="/papers/${escapeHtml(p.slug)}">${escapeHtml(p.title)}</a></h4>
                ${p.authorName ? `<p class="ssr-byline">By <a href="/authors/${slugify(p.authorName)}">${escapeHtml(p.authorName)}</a></p>` : ""}
                ${p.abstract ? `<p class="ssr-work-excerpt">${escapeHtml(stripHtml(p.abstract).slice(0, 220))}...</p>` : ""}
              </article>
            </li>
          `).join("\n")}
        </ul>
      </div>
      ` : ""}
    </div>
  </section>
</main>`;
}

// SSR for /about/anvikshiki (Meaning of Ānvīkṣikī Canonical Hub)
app.get("/about/anvikshiki", (_req, res) => {
  const template = getHtmlTemplate();
  const canonicalUrl = "https://anvikshikijournal.in/about/anvikshiki";
  const title = "Meaning of Ānvīkṣikī: Etymology, Philosophy & Classical Heritage — Ānvīkṣikī";
  const description = "Explore the profound meaning of Ānvīkṣikī (आन्वीक्षिकी): the Sanskrit etymology, Kautilya's Arthaśāstra doctrine of the foundational science, and Nyāya rational inquiry.";
  const definedTermJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        "@id": `${canonicalUrl}#webpage`,
        "url": canonicalUrl,
        "name": title,
        "description": description,
        "inLanguage": "en",
        "publisher": {
          "@type": "Organization",
          "@id": "https://anvikshikijournal.in/#organization",
          "name": "Ānvīkṣikī Journal",
          "url": "https://anvikshikijournal.in",
        },
        "mainEntity": {
          "@type": "DefinedTerm",
          "@id": `${canonicalUrl}#term`,
          "name": "Ānvīkṣikī",
          "alternateName": ["Anvikshiki", "आन्वीक्षिकी", "Aanvikshiki", "Anvikshiki Vidya"],
          "description": "The classical Sanskrit science of critical inquiry, logical examination, and rational philosophy as articulated in Kautilya's Arthaśāstra and Vātsyāyana's Nyāyabhāṣya.",
          "inDefinedTermSet": "https://anvikshikijournal.in/domains/philosophy",
        },
      },
    ],
  };

  const metaTags = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="keywords" content="anvikshiki meaning, anvikshiki meaning in english, meaning of anvikshiki, anvikshiki philosophy, ānvīkṣikī, kautilya anvikshiki, arthashastra anvikshiki, nyaya anvikshiki, indic philosophy, sanskrit inquiry" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta property="og:site_name" content="Ānvīkṣikī Journal" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="https://anvikshikijournal.in/opengraph.jpg" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="https://anvikshikijournal.in/opengraph.jpg" />
    <link rel="canonical" href="${canonicalUrl}" />
    <script type="application/ld+json">
${JSON.stringify(definedTermJsonLd, null, 2)}
    </script>
  `;

  const ssrHtml = generateAboutAnvikshikiSsrHtml();
  const finalHtml = template ? injectSsrHtml(template, metaTags, ssrHtml) : buildFallbackHtml(metaTags, ssrHtml);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(finalHtml);
});

// SSR for /about
app.get("/about", (_req, res) => {
  const template = getHtmlTemplate();
  const canonicalUrl = "https://anvikshikijournal.in/about";
  const title = "About Ānvīkṣikī: An Open Journal of Indic Philosophy & Civilizational Thought";
  const description = "Ānvīkṣikī is an open-access journal and living archive dedicated to rigorous scholarship in Indic philosophy, Sanskrit traditions, history, and civilizational inquiry.";
  const metaTags = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta property="og:site_name" content="Ānvīkṣikī Journal" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="https://anvikshikijournal.in/opengraph.jpg" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="canonical" href="${canonicalUrl}" />
  `;
  const ssrHtml = `<main class="ssr-content ssr-about">
    <h1>About Ānvīkṣikī</h1>
    <p>An open journal and research platform for rigorous inquiry, civilizational memory, and beautiful long-form scholarship.</p>
    <p>We publish essays, research papers, translations, and commentary across philosophy, history, psychology, sociology, science, geopolitics, civilizational thought, and the Sanskrit tradition.</p>
    <p><strong><a href="/about/anvikshiki">Read the complete treatise on the Meaning of Ānvīkṣikī</a></strong></p>
    <p><a href="/browse">Browse Published Works</a> · <a href="/submit">Submit Your Work</a></p>
  </main>`;
  const finalHtml = template ? injectSsrHtml(template, metaTags, ssrHtml) : buildFallbackHtml(metaTags, ssrHtml);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(finalHtml);
});

// SSR for /browse
app.get("/browse", async (_req, res) => {
  const template = getHtmlTemplate();
  const canonicalUrl = "https://anvikshikijournal.in/browse";
  const title = "Browse Research Papers, Articles & Scholarly Archives — Ānvīkṣikī";
  const description = "Explore published research papers, peer-level philosophical essays, monographs, and archives across Indic studies, Sanskrit traditions, and civilizational history.";

  let articles: any[] = [];
  let papers: any[] = [];
  let categories: any[] = [];

  try {
    [articles, papers, categories] = await Promise.all([
      db.select({ slug: articlesTable.slug, title: articlesTable.title, excerpt: articlesTable.excerpt, authorName: articlesTable.authorName, categorySlug: articlesTable.categorySlug, publishedAt: articlesTable.publishedAt })
        .from(articlesTable)
        .where(and(eq(articlesTable.status, "PUBLISHED"), isNull(articlesTable.deletedAt)))
        .limit(30),
      db.select({ slug: papersTable.slug, title: papersTable.title, abstract: papersTable.abstract, authorName: papersTable.authorName, categorySlug: papersTable.categorySlug, publishedAt: papersTable.publishedAt })
        .from(papersTable)
        .where(and(eq(papersTable.status, "PUBLISHED"), isNull(papersTable.deletedAt)))
        .limit(30),
      db.select().from(categoriesTable).where(eq(categoriesTable.visible, true)),
    ]);
  } catch {}

  const metaTags = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta property="og:site_name" content="Ānvīkṣikī Journal" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="https://anvikshikijournal.in/opengraph.jpg" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="canonical" href="${canonicalUrl}" />
  `;

  const ssrHtml = generateBrowseSsrHtml(articles, papers, categories);
  const finalHtml = template ? injectSsrHtml(template, metaTags, ssrHtml) : buildFallbackHtml(metaTags, ssrHtml);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(finalHtml);
});

// SSR / Landing Route Handlers for Submissions
app.get(/^\/submit(?:\/.*)?$/, (_req, res) => {
  const template = getHtmlTemplate();
  const metaTags = `
    <title>Submit Research &amp; Essays — Ānvīkṣikī Journal</title>
    <meta name="description" content="Submit your research paper, translation, essay, or review to Ānvīkṣikī. Open journal and research platform for Indic philosophy and civilizational inquiry." />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="https://anvikshikijournal.in/submit" />
  `;
  const ssrHtml = `<main class="ssr-content ssr-submit-landing">
    <h1>Submit to Ānvīkṣikī</h1>
    <p>Ānvīkṣikī welcomes submissions of scholarly research papers, monographs, philosophical essays, and translations in Indic studies.</p>
    <p><a href="/submit/write">Open Writing Panel</a> or <a href="/submit/upload">Upload Manuscript</a></p>
  </main>`;
  const finalHtml = template ? injectSsrHtml(template, metaTags, ssrHtml) : buildFallbackHtml(metaTags, ssrHtml);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(finalHtml);
});

const ARTICLE_TOPIC_KEYWORDS: Record<string, string[]> = {
  "beyond-angkor-why-is-vietnam-frequently-excluded-from-the-history-of-hindu-influence-in-southeast-asia": [
    "Champa civilization",
    "Mỹ Sơn sanctuary",
    "Hinduism in Vietnam",
    "Southeast Asian Indic traditions",
    "Sanskrit inscriptions of Champa",
    "Śaivism in Champa",
    "Greater India historiography",
    "Indianized kingdoms"
  ],
  "beyond-angkor-why-is-vietnam-frequently-excluded-from-the-history-of-hindu-influence-in-southeast-asia-86ef8134": [
    "Champa civilization",
    "Mỹ Sơn sanctuary",
    "Hinduism in Vietnam",
    "Southeast Asian Indic traditions",
    "Sanskrit inscriptions of Champa",
    "Śaivism in Champa",
    "Greater India historiography",
    "Indianized kingdoms"
  ],
  "quantum-eternal": [
    "Quantum physics and Vedanta",
    "Indic philosophy and quantum mechanics",
    "Schrödinger and Upanishads",
    "Consciousness in Indian philosophy",
    "Brahman and quantum reality",
    "Eastern metaphysics"
  ],
  "arithmetic-betrayal": [
    "Indian economic history",
    "Colonial deindustrialization",
    "Drain of wealth theory",
    "Dadabhai Naoroji",
    "Indic civilization economics"
  ],
  "triple-fragmentation": [
    "Indic historiography",
    "Civilizational memory",
    "Colonial fragmentation of India",
    "Indian intellectual history"
  ],
  "indo-fijians-overtook-indigenous-fijians-numerically-1940s": [
    "Indo-Fijian history",
    "Girmitiya indenture system",
    "Indian diaspora in Fiji",
    "Colonial migration",
    "Fijian demographic history"
  ],
  "the-human-tapestry-of-the-slave-trade": [
    "Indian Ocean slave trade",
    "Historical slavery in South Asia",
    "Colonial servitude",
    "Maritime history of India"
  ],
  "why-this-website-exists-0fc91e71": [
    "Ānvīkṣikī journal",
    "Indic studies open access",
    "Classical Indian philosophy",
    "Sanskrit intellectual traditions",
    "Critical rational inquiry"
  ],
  "why-this-website-exists": [
    "Ānvīkṣikī journal",
    "Indic studies open access",
    "Classical Indian philosophy",
    "Sanskrit intellectual traditions",
    "Critical rational inquiry"
  ]
};

// SSR Route Handlers for Articles and Research Papers
app.get(["/articles/:slug", "/papers/:slug"], async (req, res, next) => {
  try {
    let rawSlug = "";
    try {
      rawSlug = decodeURIComponent(String(req.params.slug || ""));
    } catch {
      res.status(400).json({ error: "Invalid percent-encoded character sequence", code: "BAD_REQUEST" });
      return;
    }
    const cleanSlug = rawSlug.replace(/-[a-f0-9]{4,8}$/, "");
    const isPaper = req.path.startsWith("/papers");
    const resourceType = isPaper ? "research paper" : "article";

    let item: any = null;
    if (isPaper) {
      let [paper] = await db
        .select()
        .from(papersTable)
        .where(eq(papersTable.slug, rawSlug))
        .limit(1);
      if (!paper && cleanSlug !== rawSlug) {
        [paper] = await db
          .select()
          .from(papersTable)
          .where(eq(papersTable.slug, cleanSlug))
          .limit(1);
      }
      item = paper;
    } else {
      let [article] = await db
        .select()
        .from(articlesTable)
        .where(eq(articlesTable.slug, rawSlug))
        .limit(1);
      if (!article && cleanSlug !== rawSlug) {
        [article] = await db
          .select()
          .from(articlesTable)
          .where(eq(articlesTable.slug, cleanSlug))
          .limit(1);
      }
      item = article;
    }

    if (!item) {
      send404(res, resourceType, rawSlug);
      return;
    }
    if (item.deletedAt) {
      send410(res, resourceType, rawSlug);
      return;
    }
    const isDraft = item.status !== "PUBLISHED";
    if (isDraft && !hasSessionCookie(req)) {
      send404(res, resourceType, rawSlug);
      return;
    }

    // Resolve domain category display name
    let domainDisplayName = item.categorySlug || "Indic Studies";
    try {
      if (item.categorySlug) {
        const [cat] = await db
          .select()
          .from(categoriesTable)
          .where(eq(categoriesTable.slug, item.categorySlug))
          .limit(1);
        if (cat?.name) {
          domainDisplayName = cat.name;
        }
      }
    } catch {}

    const title = item.title;
    const excerpt = isPaper ? (item.abstract || item.title) : (item.excerpt || item.subtitle || item.title);
    let imageUrl = isPaper ? (item.coverImageUrl || "") : (item.heroImageUrl || "");
    const canonicalPath = isPaper ? `/papers/${item.slug}` : `/articles/${item.slug}`;
    const canonicalUrl = buildCanonicalUrl(canonicalPath);

    const fallbackImage = `https://anvikshikijournal.in/api/og/${isPaper ? "paper" : "article"}/${encodeURIComponent(item.slug)}`;
    if (!imageUrl) {
      imageUrl = fallbackImage;
    } else if (imageUrl.startsWith("/")) {
      imageUrl = `https://anvikshikijournal.in${imageUrl}`;
    }

    const cleanTitle = escapeHtml(title);
    const cleanExcerpt = escapeHtml(stripHtml(excerpt).slice(0, 300));
    const cleanUrl = escapeHtml(canonicalUrl);
    const cleanImage = escapeHtml(imageUrl);
    const isoPublished = formatIsoDate(item.publishedAt);
    const isoUpdated = formatIsoDate(item.updatedAt);
    const authorRaw = item.authorName || (isPaper ? "Anonymous Scholar" : "Ānvīkṣikī Editorial Collective");
    const cleanAuthor = escapeHtml(authorRaw);

    // Split authors by comma or "and" to handle multiple contributors
    const rawAuthors = authorRaw.split(/,\s*|\s+and\s+/i).map((s: string) => s.trim()).filter(Boolean);
    const authors = rawAuthors.length > 0 ? rawAuthors : [authorRaw];
    const scholarCitationAuthorTags = authors.map((a: string) => `<meta name="citation_author" content="${escapeHtml(a)}" />`).join("\n    ");
    const scholarAuthorMeta = authors.map((a: string) => `<meta name="author" content="${escapeHtml(a)}" />\n    <meta property="article:author" content="${escapeHtml(a)}" />`).join("\n    ");

    const robotsDirective = isDraft
      ? '<meta name="robots" content="noindex, nofollow" />'
      : '<meta name="robots" content="index, follow, max-image-preview:large" />';
    if (isDraft) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
    }

    // Resolve enriched topic keywords
    const mappedKeywords = ARTICLE_TOPIC_KEYWORDS[item.slug] || ARTICLE_TOPIC_KEYWORDS[cleanSlug] || [];
    const itemDbTags = Array.isArray(item.tags)
      ? item.tags
      : (typeof item.tags === "string" ? item.tags.split(/,\s*/).filter(Boolean) : []);
    const mergedKeywords = Array.from(new Set([...itemDbTags, ...mappedKeywords]));
    const keywordsStr = mergedKeywords.length > 0 ? mergedKeywords.join(", ") : undefined;

    const authorSchema = isPaper || authors.length > 1
      ? authors.map((a: string) => ({
          "@type": "Person",
          "@id": `https://anvikshikijournal.in/authors/${slugify(a)}#person`,
          "name": a,
          "url": `https://anvikshikijournal.in/authors/${slugify(a)}`,
        }))
      : {
          "@type": "Person",
          "@id": `https://anvikshikijournal.in/authors/${slugify(authorRaw)}#person`,
          "name": authorRaw,
          "url": `https://anvikshikijournal.in/authors/${slugify(authorRaw)}`,
        };

    const jsonLdData: any = {
      "@context": "https://schema.org",
      "@type": isPaper ? "ScholarlyArticle" : "Article",
      "@id": `${canonicalUrl}#${isPaper ? "scholarlyarticle" : "article"}`,
      "isPartOf": {
        "@type": "Periodical",
        "@id": "https://anvikshikijournal.in/#periodical",
        "name": "Ānvīkṣikī: An Open Journal of Indic Philosophy & Intellectual Traditions",
      },
      "headline": item.title,
      "name": item.title,
      "description": stripHtml(excerpt).slice(0, 300),
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": canonicalUrl,
      },
      "url": canonicalUrl,
      "inLanguage": "en",
      "publisher": {
        "@type": "Organization",
        "@id": "https://anvikshikijournal.in/#organization",
        "name": "Ānvīkṣikī Journal",
        "url": "https://anvikshikijournal.in",
        "logo": {
          "@type": "ImageObject",
          "url": "https://anvikshikijournal.in/favicon.svg",
        },
      },
      "author": authorSchema,
      "datePublished": isoPublished || undefined,
      "dateModified": isoUpdated || isoPublished || undefined,
      "image": imageUrl || undefined,
      "articleSection": domainDisplayName || undefined,
      "keywords": keywordsStr || undefined,
      "about": mergedKeywords.length > 0 ? mergedKeywords.map(k => ({ "@type": "Thing", "name": k })) : undefined,
    };

    if (isPaper && item.pdfUrl) {
      jsonLdData.encoding = {
        "@type": "MediaObject",
        "contentUrl": safeUrl(item.pdfUrl),
        "encodingFormat": "application/pdf",
      };
    }

    const breadcrumbJsonLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": {
            "@type": "WebPage",
            "@id": "https://anvikshikijournal.in",
            "name": "Home",
          },
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": isPaper ? "Papers" : "Journal",
          "item": {
            "@type": "WebPage",
            "@id": isPaper ? "https://anvikshikijournal.in/papers" : "https://anvikshikijournal.in/browse",
            "name": isPaper ? "Papers" : "Journal",
          },
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": domainDisplayName,
          "item": {
            "@type": "WebPage",
            "@id": `https://anvikshikijournal.in/domains/${item.categorySlug || "philosophy"}`,
            "name": domainDisplayName,
          },
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": item.title,
          "item": {
            "@type": "WebPage",
            "@id": canonicalUrl,
            "name": item.title,
          },
        },
      ],
    };

    const ogTags = `
    <!-- Dynamic Open Graph & Twitter Card Meta Tags -->
    <title>${cleanTitle} — Ānvīkṣikī</title>
    <meta name="description" content="${cleanExcerpt}" />
    ${keywordsStr ? `<meta name="keywords" content="${escapeHtml(keywordsStr)}" />` : ""}
    ${mergedKeywords.map(k => `<meta property="article:tag" content="${escapeHtml(k)}" />`).join("\n    ")}
    ${robotsDirective}
    ${scholarAuthorMeta}
    ${isoPublished ? `<meta property="article:published_time" content="${isoPublished}" />` : ""}
    ${isoUpdated ? `<meta property="article:modified_time" content="${isoUpdated}" />` : ""}
    ${item.categorySlug ? `<meta property="article:section" content="${escapeHtml(item.categorySlug)}" />` : ""}
    <meta property="og:site_name" content="Ānvīkṣikī Journal" />
    <meta property="og:title" content="${cleanTitle}" />
    <meta property="og:description" content="${cleanExcerpt}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${cleanUrl}" />
    <meta property="og:image" content="${cleanImage}" />
    <meta property="og:image:secure_url" content="${cleanImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${cleanTitle}" />
    <meta name="twitter:description" content="${cleanExcerpt}" />
    <meta name="twitter:image" content="${cleanImage}" />
    <link rel="canonical" href="${cleanUrl}" />
    <script type="application/ld+json">
${JSON.stringify(jsonLdData, null, 2)}
    </script>
    <script type="application/ld+json">
${JSON.stringify(breadcrumbJsonLd, null, 2)}
    </script>
    <!-- Google Scholar Highwire Metadata -->
    <meta name="citation_title" content="${cleanTitle}" />
    ${scholarCitationAuthorTags}
    ${formatScholarDate(item.publishedAt)}
    <meta name="citation_journal_title" content="Ānvīkṣikī: An Open Journal of Indic Philosophy &amp; Intellectual Traditions" />
    ${item.pdfUrl ? `<meta name="citation_pdf_url" content="${safeUrl(item.pdfUrl)}" />` : ""}
    <meta name="citation_abstract_html_url" content="${cleanUrl}" />
    ${item.doi ? `<meta name="citation_doi" content="${escapeHtml(item.doi)}" />` : ""}
    ${keywordsStr ? `<meta name="citation_keywords" content="${escapeHtml(keywordsStr)}" />` : ""}
    `;

    const ssrHtml = isPaper
      ? generatePaperSsrHtml(item, domainDisplayName)
      : generateArticleSsrHtml(item, domainDisplayName);

    const template = getHtmlTemplate();
    const finalHtml = template
      ? injectSsrHtml(template, ogTags, ssrHtml, item)
      : buildFallbackHtml(ogTags, ssrHtml, item);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
    res.status(200).send(finalHtml);
    return;
  } catch (err) {
    req.log?.error({ err }, "Publication SSR error");
    next();
    return;
  }
});

// SSR Route Handler for Author Hubs
app.get("/authors/:slug", async (req, res, next) => {
  try {
    let rawSlug = "";
    try {
      rawSlug = decodeURIComponent(String(req.params.slug || ""));
    } catch {
      res.status(400).json({ error: "Invalid percent-encoded character sequence", code: "BAD_REQUEST" });
      return;
    }
    const cleanSlug = rawSlug.trim().replace(/\/+$/, "");
    const cleanHandle = cleanSlug.replace(/^@/, "").toLowerCase();
    const namePattern = cleanSlug.replace(/[-_]/g, " ");

    let [user] = await db
      .select()
      .from(usersTable)
      .where(
        or(
          eq(usersTable.id, cleanSlug),
          eq(usersTable.handle, cleanSlug),
          eq(usersTable.handle, cleanHandle),
          ilike(usersTable.name, namePattern),
          ilike(usersTable.name, `%${namePattern}%`)
        )
      )
      .limit(1);

    // If cleanSlug is user ID, or user has handle and URL is ID or @handle, 301 redirect to canonical handle
    if (user?.handle && (cleanSlug === user.id || cleanSlug === `@${user.handle}`)) {
      return res.redirect(301, `/authors/${encodeURIComponent(user.handle)}`);
    }

    const [allArticles, allPapers] = await Promise.all([
      db.select({
        id: articlesTable.id,
        slug: articlesTable.slug,
        title: articlesTable.title,
        subtitle: articlesTable.subtitle,
        excerpt: articlesTable.excerpt,
        categorySlug: articlesTable.categorySlug,
        authorName: articlesTable.authorName,
        readingMinutes: articlesTable.readingMinutes,
        heroImageUrl: articlesTable.heroImageUrl,
        publishedAt: articlesTable.publishedAt,
        authorId: submissionsTable.userId,
      }).from(articlesTable)
        .leftJoin(submissionsTable, eq(articlesTable.sourceSubmissionId, submissionsTable.id))
        .where(and(eq(articlesTable.status, "PUBLISHED"), isNull(articlesTable.deletedAt))),
      db.select({
        id: papersTable.id,
        slug: papersTable.slug,
        title: papersTable.title,
        abstract: papersTable.abstract,
        categorySlug: papersTable.categorySlug,
        authorName: papersTable.authorName,
        readingMinutes: papersTable.readingMinutes,
        coverImageUrl: papersTable.coverImageUrl,
        publishedAt: papersTable.publishedAt,
        year: papersTable.year,
        doi: papersTable.doi,
        authorId: submissionsTable.userId,
      }).from(papersTable)
        .leftJoin(submissionsTable, eq(papersTable.sourceSubmissionId, submissionsTable.id))
        .where(and(eq(papersTable.status, "PUBLISHED"), isNull(papersTable.deletedAt))),
    ]);

    const userNameSlug = user && user.name ? slugify(user.name) : "";
    const userCleanName = user && user.name ? user.name.replace(/^(dr|prof|vidwan|acharya)\.?\s+/i, "").trim().toLowerCase() : "";

    const authorArticles = allArticles.filter((a: any) => {
      if (user && a.authorId === user.id) return true;
      const aSlug = slugify(a.authorName || "");
      if (aSlug && (aSlug === cleanSlug || aSlug === cleanHandle)) return true;
      if (userNameSlug && aSlug === userNameSlug) return true;
      if (userCleanName && a.authorName && a.authorName.toLowerCase().includes(userCleanName)) return true;
      return false;
    });

    const authorPapers = allPapers.filter((p: any) => {
      if (user && p.authorId === user.id) return true;
      const pAuthors = (p.authorName || "").split(/,\s*/);
      return pAuthors.some((pa: string) => {
        const paSlug = slugify(pa);
        if (paSlug && (paSlug === cleanSlug || paSlug === cleanHandle)) return true;
        if (userNameSlug && paSlug === userNameSlug) return true;
        if (userCleanName && pa.toLowerCase().includes(userCleanName)) return true;
        return false;
      });
    });

    if (!user && authorArticles.length === 0 && authorPapers.length === 0) {
      send404(res, "author profile", cleanSlug);
      return;
    }

    const displayName = user?.name || authorArticles[0]?.authorName || (authorPapers[0]?.authorName ? authorPapers[0].authorName.split(/,\s*/)[0] : cleanSlug);
    const authorBio = user?.bio || `${displayName} is a contributing scholar to Ānvīkṣikī Journal.`;
    const authorData = {
      id: user?.id,
      name: displayName,
      handle: user?.handle || cleanSlug,
      bio: authorBio,
      institution: user?.institution || (authorPapers[0] as any)?.institution || null,
      avatarUrl: user?.avatarUrl || null,
      articleCount: authorArticles.length,
      paperCount: authorPapers.length,
    };

    const cleanName = escapeHtml(authorData.name);
    const cleanBio = escapeHtml(stripHtml(authorData.bio).slice(0, 300));
    const canonicalUrl = buildCanonicalUrl(`/authors/${cleanSlug}`);
    const cleanUrl = escapeHtml(canonicalUrl);
    const cleanImage = authorData.avatarUrl
      ? escapeHtml(authorData.avatarUrl)
      : `https://anvikshikijournal.in/api/og/author/${encodeURIComponent(cleanSlug)}`;

    // Extract keywords and subject domains from author's publications
    const authorKeywordsList = Array.from(new Set([
      ...authorArticles.flatMap(a => (a as any).tags || []),
      ...authorPapers.flatMap(p => (p as any).tags || []),
      ...authorArticles.map(a => a.categorySlug),
      ...authorPapers.map(p => p.categorySlug),
      ...(authorData.institution ? [authorData.institution] : []),
    ].filter(Boolean)));
    const authorKeywords = authorKeywordsList.length > 0 ? authorKeywordsList.join(", ") : undefined;

    const authorPersonJsonLd: any = {
      "@context": "https://schema.org",
      "@type": "Person",
      "@id": `https://anvikshikijournal.in/authors/${cleanSlug}#person`,
      "name": authorData.name,
      "url": canonicalUrl,
      "description": authorData.bio || undefined,
      "keywords": authorKeywords || undefined,
      "knowsAbout": authorKeywordsList.length > 0 ? authorKeywordsList : undefined,
      "worksFor": authorData.institution ? {
        "@type": "Organization",
        "name": authorData.institution,
      } : undefined,
      "image": authorData.avatarUrl || undefined,
    };

    const authorProfilePageJsonLd = {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      "@id": canonicalUrl,
      "url": canonicalUrl,
      "name": `${cleanName} — Author Profile — Ānvīkṣikī`,
      "keywords": authorKeywords || undefined,
      "mainEntity": {
        "@id": `https://anvikshikijournal.in/authors/${cleanSlug}#person`,
      },
    };

    const ogTags = `
    <!-- Dynamic Open Graph & Twitter Card Meta Tags for Author Hub -->
    <title>${cleanName} — Author Profile — Ānvīkṣikī</title>
    <meta name="description" content="${cleanBio}" />
    ${authorKeywords ? `<meta name="keywords" content="${escapeHtml(authorKeywords)}" />` : ""}
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta property="og:site_name" content="Ānvīkṣikī Journal" />
    <meta property="og:title" content="${cleanName} — Author Profile" />
    <meta property="og:description" content="${cleanBio}" />
    <meta property="og:type" content="profile" />
    <meta property="og:url" content="${cleanUrl}" />
    <meta property="og:image" content="${cleanImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${cleanName} — Author Profile" />
    <meta name="twitter:description" content="${cleanBio}" />
    <meta name="twitter:image" content="${cleanImage}" />
    <link rel="canonical" href="${cleanUrl}" />
    <script type="application/ld+json">
${JSON.stringify(authorPersonJsonLd, null, 2)}
    </script>
    <script type="application/ld+json">
${JSON.stringify(authorProfilePageJsonLd, null, 2)}
    </script>
    `;

    const ssrHtml = generateAuthorHubSsrHtml(authorData, authorArticles, authorPapers);
    const template = getHtmlTemplate();
    const finalHtml = template
      ? injectSsrHtml(template, ogTags, ssrHtml, authorData)
      : buildFallbackHtml(ogTags, ssrHtml, authorData);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
    res.status(200).send(finalHtml);
    return;
  } catch (err) {
    req.log?.error({ err }, "Author Hub SSR error");
    next();
    return;
  }
});

// SSR Route Handler for Domain Hubs
app.get("/domains/:slug", async (req, res, next) => {
  try {
    let rawSlug = "";
    try {
      rawSlug = decodeURIComponent(String(req.params.slug || ""));
    } catch {
      res.status(400).json({ error: "Invalid percent-encoded character sequence", code: "BAD_REQUEST" });
      return;
    }
    const cleanSlug = rawSlug.trim().replace(/\/+$/, "");

    const DOMAIN_ALIASES: Record<string, string> = {
      "sanskrit": "sanskrit-studies",
      "indian-philosophy": "philosophy",
      "indic-civilization": "civilizational-thought",
      "indian-history": "history",
      "art-aesthetics": "aesthetics",
      "iks": "science",
      "indian-knowledge-systems": "science",
      "political-science": "political-theory",
    };
    if (DOMAIN_ALIASES[cleanSlug]) {
      const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
      return res.redirect(301, `/domains/${DOMAIN_ALIASES[cleanSlug]}${qs}`);
    }

    const [category] = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.slug, cleanSlug))
      .limit(1);

    if (!category) {
      send404(res, "domain category", cleanSlug);
      return;
    }

    const [allArticles, allPapers] = await Promise.all([
      db.select().from(articlesTable).where(and(eq(articlesTable.categorySlug, category.slug), eq(articlesTable.status, "PUBLISHED"), isNull(articlesTable.deletedAt))),
      db.select().from(papersTable).where(and(eq(papersTable.categorySlug, category.slug), eq(papersTable.status, "PUBLISHED"), isNull(papersTable.deletedAt))),
    ]);

    const domainArticles = allArticles.filter((a: any) => a.categorySlug === category.slug);
    const domainPapers = allPapers.filter((p: any) => p.categorySlug === category.slug);

    const cleanName = escapeHtml(category.name);
    const descRaw = category.description || `Explore essays, research papers, and critical monographs in ${category.name} on Ānvīkṣikī.`;
    const cleanDesc = escapeHtml(stripHtml(descRaw).slice(0, 300));
    const canonicalUrl = buildCanonicalUrl(`/domains/${category.slug}`);
    const cleanUrl = escapeHtml(canonicalUrl);
    const cleanImage = `https://anvikshikijournal.in/api/og/domain/${encodeURIComponent(category.slug)}`;

    const domainKeywords = `${cleanName}, Indic Studies, Philosophy, Research Archive, Ānvīkṣikī`;
    const domainCollectionJsonLd = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": canonicalUrl,
      "url": canonicalUrl,
      "name": `${cleanName} — Domain Archive — Ānvīkṣikī`,
      "description": cleanDesc,
      "keywords": domainKeywords,
      "mainEntity": {
        "@type": "ItemList",
        "itemListElement": [
          ...domainArticles.map((a: any, i: number) => ({
            "@type": "ListItem",
            "position": i + 1,
            "url": `https://anvikshikijournal.in/articles/${a.slug}`,
            "name": a.title,
          })),
          ...domainPapers.map((p: any, i: number) => ({
            "@type": "ListItem",
            "position": domainArticles.length + i + 1,
            "url": `https://anvikshikijournal.in/papers/${p.slug}`,
            "name": p.title,
          })),
        ],
      },
    };

    const ogTags = `
    <!-- Dynamic Open Graph & Twitter Card Meta Tags for Domain Hub -->
    <title>${cleanName} — Domain Archive — Ānvīkṣikī</title>
    <meta name="description" content="${cleanDesc}" />
    <meta name="keywords" content="${domainKeywords}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta property="og:site_name" content="Ānvīkṣikī Journal" />
    <meta property="og:title" content="${cleanName} — Domain Archive" />
    <meta property="og:description" content="${cleanDesc}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${cleanUrl}" />
    <meta property="og:image" content="${cleanImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${cleanName} — Domain Archive" />
    <meta name="twitter:description" content="${cleanDesc}" />
    <meta name="twitter:image" content="${cleanImage}" />
    <link rel="canonical" href="${cleanUrl}" />
    <script type="application/ld+json">
${JSON.stringify(domainCollectionJsonLd, null, 2)}
    </script>
    `;

    const ssrHtml = generateDomainHubSsrHtml(category, domainArticles, domainPapers);
    const template = getHtmlTemplate();
    const finalHtml = template
      ? injectSsrHtml(template, ogTags, ssrHtml, category)
      : buildFallbackHtml(ogTags, ssrHtml, category);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
    res.status(200).send(finalHtml);
    return;
  } catch (err) {
    req.log?.error({ err }, "Domain Hub SSR error");
    next();
    return;
  }
});

// Direct robots.txt route for search engines & crawlers
app.get("/robots.txt", (_req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  return res.status(200).send(`User-agent: *
Allow: /
Allow: /api/sitemap.xml
Allow: /api/rss
Allow: /api/og/
Allow: /favicon.ico
Allow: /favicon.png
Allow: /icon.png
Allow: /apple-touch-icon.png
Allow: /opengraph.jpg
Allow: /logo.png
Allow: /brand-emblem.png
Disallow: /api/
Disallow: /admin/
Disallow: /account/
Disallow: /messages/
Disallow: /notifications
Disallow: /saved
Disallow: /submit/write
Disallow: /submit/upload

Sitemap: https://anvikshikijournal.in/sitemap.xml
Sitemap: https://anvikshikijournal.in/api/sitemap.xml
`);
});

// Canonical SSR redirection and pre-rendering for Profile URLs
app.get(["/profile/:userId", "/profile/@:handle"], async (req, res, next) => {
  try {
    const rawParam = req.params.handle || req.params.userId || "";
    const rawId = (Array.isArray(rawParam) ? rawParam[0] : String(rawParam || "")).trim();
    if (!rawId) return next();
    const cleanHandle = rawId.replace(/^@/, "").toLowerCase();

    const [user] = await db
      .select()
      .from(usersTable)
      .where(
        or(
          eq(usersTable.id, rawId),
          eq(usersTable.handle, cleanHandle),
          eq(usersTable.handle, rawId)
        )
      )
      .limit(1);

    if (user?.handle) {
      return res.redirect(301, `/authors/${encodeURIComponent(user.handle)}`);
    }

    if (user?.id) {
      return res.redirect(301, `/authors/${encodeURIComponent(user.id)}`);
    }

    return res.redirect(301, `/authors/${encodeURIComponent(rawId)}`);
  } catch (err) {
    req.log?.error({ err }, "Profile redirect error");
    next();
    return;
  }
});

const errorHandler: ErrorRequestHandler = (err: any, req, res, _next) => {
  if (err instanceof URIError) {
    return res.status(400).json({ error: "Invalid percent-encoded character sequence", code: "BAD_REQUEST" });
  }
  const malformedJson = err instanceof SyntaxError &&
    typeof err === "object" && err !== null && "body" in err;
  if (malformedJson) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  // body-parser rejects oversized payloads before any route runs. Reporting
  // that as a generic 500 left authors with "Request failed" and no idea that
  // their manuscript was simply too large to send in one piece.
  if (err?.type === "entity.too.large" || err?.status === 413) {
    return res.status(413).json({
      error: `This submission is larger than the ${JSON_BODY_LIMIT} request limit. Upload the largest images separately so they are stored by URL instead of inline, then save again.`,
      code: "PAYLOAD_TOO_LARGE",
    });
  }
  req.log?.error({ err }, "Unhandled request error");
  return res.status(500).json({ error: "Request failed" });
};

app.use(errorHandler);

export default app;

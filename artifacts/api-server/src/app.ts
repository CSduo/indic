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
import { db, articlesTable, papersTable, usersTable, categoriesTable, ensureDatabaseSchema, coreTablesExist } from "@workspace/db";
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

export function injectSsrHtml(template: string, metaTags: string, ssrBody: string): string {
  const cleanTemplate = sanitizeTemplateHead(template);
  const withMeta = cleanTemplate.replace(/<\/head>/i, `${metaTags}\n</head>`);
  if (withMeta.includes('<div id="root"></div>')) {
    return withMeta.replace('<div id="root"></div>', `<div id="root">${ssrBody}</div>`);
  }
  return withMeta.replace(/<div id=["']root["']>[\s\S]*?<\/div>/i, `<div id="root">${ssrBody}</div>`);
}

export function buildFallbackHtml(metaTags: string, ssrBody: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${metaTags}
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

  <footer class="ssr-article-footer">
    <div class="ssr-author-bio-card">
      <h3>About the Author</h3>
      <p><strong><a href="/authors/${escapeHtml(authorSlug)}">${escapeHtml(author)}</a></strong> is a contributor to Ānvīkṣikī Journal.</p>
    </div>
    <div class="ssr-citation-note">
      <p><strong>Citation</strong>: ${escapeHtml(author)} (${article.publishedAt ? new Date(article.publishedAt).getFullYear() : new Date().getFullYear()}). "${escapeHtml(article.title)}". <em>Ānvīkṣikī</em>. <a href="https://anvikshikijournal.in/articles/${escapeHtml(article.slug)}">https://anvikshikijournal.in/articles/${escapeHtml(article.slug)}</a></p>
    </div>
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
    location?: string | null;
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
      ${author.location ? `<p class="ssr-location" itemprop="homeLocation">${escapeHtml(author.location)}</p>` : ""}

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

    let scholarCitationAuthorTags = "";
    let scholarAuthorMeta = "";
    if (isPaper) {
      const authors = authorRaw.split(/,\s*/);
      scholarCitationAuthorTags = authors.map((a: string) => `<meta name="citation_author" content="${escapeHtml(a.trim())}" />`).join("\n");
      scholarAuthorMeta = authors.map((a: string) => `<meta name="author" content="${escapeHtml(a.trim())}" />\n<meta property="article:author" content="${escapeHtml(a.trim())}" />`).join("\n");
    } else {
      scholarAuthorMeta = `<meta name="author" content="${cleanAuthor}" />\n<meta property="article:author" content="${cleanAuthor}" />`;
    }

    const robotsDirective = isDraft
      ? '<meta name="robots" content="noindex, nofollow" />'
      : '<meta name="robots" content="index, follow, max-image-preview:large" />';
    if (isDraft) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
    }

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
      "author": isPaper
        ? authorRaw.split(/,\s*/).map((a: string) => ({
            "@type": "Person",
            "@id": `https://anvikshikijournal.in/authors/${slugify(a.trim())}#person`,
            "name": a.trim(),
            "url": `https://anvikshikijournal.in/authors/${slugify(a.trim())}`,
          }))
        : {
            "@type": "Person",
            "@id": `https://anvikshikijournal.in/authors/${slugify(authorRaw)}#person`,
            "name": authorRaw,
            "url": `https://anvikshikijournal.in/authors/${slugify(authorRaw)}`,
          },
      "datePublished": isoPublished || undefined,
      "dateModified": isoUpdated || isoPublished || undefined,
      "image": imageUrl || undefined,
      "articleSection": domainDisplayName || undefined,
      "keywords": item.tags ? (Array.isArray(item.tags) ? item.tags.join(", ") : String(item.tags)) : undefined,
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
    ${isPaper ? `
    <!-- Google Scholar Highwire Metadata -->
    <meta name="citation_title" content="${cleanTitle}" />
    ${scholarCitationAuthorTags}
    ${formatScholarDate(item.publishedAt)}
    <meta name="citation_journal_title" content="Ānvīkṣikī: An Open Journal of Indic Philosophy &amp; Intellectual Traditions" />
    ${item.pdfUrl ? `<meta name="citation_pdf_url" content="${safeUrl(item.pdfUrl)}" />` : ""}
    <meta name="citation_abstract_html_url" content="${cleanUrl}" />
    ${item.doi ? `<meta name="citation_doi" content="${escapeHtml(item.doi)}" />` : ""}
    ` : ""}
    `;

    const ssrHtml = isPaper
      ? generatePaperSsrHtml(item, domainDisplayName)
      : generateArticleSsrHtml(item, domainDisplayName);

    const template = getHtmlTemplate();
    const finalHtml = template
      ? injectSsrHtml(template, ogTags, ssrHtml)
      : buildFallbackHtml(ogTags, ssrHtml);

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

    let [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.handle, cleanSlug))
      .limit(1);
    if (!user) {
      [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, cleanSlug))
        .limit(1);
    }

    const [allArticles, allPapers] = await Promise.all([
      db.select().from(articlesTable).where(and(eq(articlesTable.status, "PUBLISHED"), isNull(articlesTable.deletedAt))),
      db.select().from(papersTable).where(and(eq(papersTable.status, "PUBLISHED"), isNull(papersTable.deletedAt))),
    ]);

    const userNameSlug = user && user.name ? slugify(user.name) : "";

    const authorArticles = allArticles.filter((a: any) => {
      if (user && a.authorId === user.id) return true;
      const aSlug = slugify(a.authorName || "");
      return aSlug === cleanSlug || (userNameSlug && aSlug === userNameSlug);
    });

    const authorPapers = allPapers.filter((p: any) => {
      if (user && p.authorId === user.id) return true;
      const pAuthors = (p.authorName || "").split(/,\s*/);
      return pAuthors.some((pa: string) => slugify(pa) === cleanSlug || (userNameSlug && slugify(pa) === userNameSlug));
    });

    if (!user && authorArticles.length === 0 && authorPapers.length === 0) {
      send404(res, "author profile", cleanSlug);
      return;
    }

    const displayName = user?.name || authorArticles[0]?.authorName || (authorPapers[0]?.authorName ? authorPapers[0].authorName.split(/,\s*/)[0] : cleanSlug);
    const authorBio = user?.bio || `${displayName} is a contributing scholar to Ānvīkṣikī Journal.`;
    const authorData = {
      name: displayName,
      handle: user?.handle || cleanSlug,
      bio: authorBio,
      institution: user?.institution || (authorPapers[0] as any)?.institution || null,
      location: user?.location || null,
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
    const authorPersonJsonLd = {
      "@context": "https://schema.org",
      "@type": "Person",
      "@id": `https://anvikshikijournal.in/authors/${cleanSlug}#person`,
      "name": authorData.name,
      "url": canonicalUrl,
      "description": authorData.bio || undefined,
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
      "mainEntity": {
        "@id": `https://anvikshikijournal.in/authors/${cleanSlug}#person`,
      },
    };

    const ogTags = `
    <!-- Dynamic Open Graph & Twitter Card Meta Tags for Author Hub -->
    <title>${cleanName} — Author Profile — Ānvīkṣikī</title>
    <meta name="description" content="${cleanBio}" />
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
      ? injectSsrHtml(template, ogTags, ssrHtml)
      : buildFallbackHtml(ogTags, ssrHtml);

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

    const domainCollectionJsonLd = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": canonicalUrl,
      "url": canonicalUrl,
      "name": `${cleanName} — Domain Archive — Ānvīkṣikī`,
      "description": descRaw,
      "publisher": {
        "@type": "Organization",
        "@id": "https://anvikshikijournal.in/#organization",
        "name": "Ānvīkṣikī Journal",
        "url": "https://anvikshikijournal.in",
      },
      "mainEntity": {
        "@type": "ItemList",
        "itemListElement": [
          ...domainArticles.map((art: any, i: number) => ({
            "@type": "ListItem",
            "position": i + 1,
            "url": `https://anvikshikijournal.in/articles/${art.slug}`,
            "name": art.title,
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
      ? injectSsrHtml(template, ogTags, ssrHtml)
      : buildFallbackHtml(ogTags, ssrHtml);

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

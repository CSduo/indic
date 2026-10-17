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
import llmsRouter from "./routes/llms";
import indexnowRouter from "./routes/indexnow";
import publicPagesRouter, { sendUnavailable } from "./routes/public-pages";
import { DEFAULT_INDEXNOW_KEY } from "./lib/indexnow";
import { db, articlesTable, papersTable, usersTable, categoriesTable, submissionsTable, ensureDatabaseSchema, coreTablesExist } from "@workspace/db";
import { eq, and, or, isNull } from "drizzle-orm";
import { slugify } from "./lib/slug";
import { workSeo, type WorkSeo } from "./lib/effective-seo";
import { referencesToCitations } from "./lib/references";
import { ROBOTS_TXT } from "./lib/robots";
import {
  CANONICAL_DOMAIN,
  SITE_NAME,
  PERIODICAL_ID,
  PERIODICAL_NAME,
  publisherNode,
  DEFAULT_SOCIAL_IMAGE,
  socialImage,
  socialImageMetaTags,
  jsonLdGraphScript,
  buildCanonicalUrl,
  getHtmlTemplate,
  escapeHtml,
  safeUrl,
  stripHtml,
  formatDate,
  formatIsoDate,
  formatScholarDate,
  renderBreadcrumbs,
  renderReferences,
  renderTopics,
  renderBodyHtml,
  injectSsrHtml,
  buildFallbackHtml,
  renderSsrDocument,
  renderSpaShell,
  PUBLIC_HTML_CACHE_CONTROL,
} from "./lib/ssr-html";
import { findCategory, hasPublishedPapers, listPublishedWorks, listVisibleCategories, listingSeo, listingSeoFor, loadAuthorUsers, withWorkCounts, type CategorySummary, type WorkSummary } from "./lib/public-content";
import { ABOUT_LATEST_COUNT, MISSION_ESSAY_SLUG, authorDescription, domainHubDescription, meaningPageReading } from "./lib/hub-content";
import { loadContinueReading } from "./lib/continue-reading";
import { renderContinueReading, renderListedWorks, workPath } from "./lib/listing-html";
import { CONTACT_EMAIL, PAGE_META } from "./lib/page-meta";
import { clientRouteTitle, looksLikeFile, matchClientOnlyRoute, normalizedPagePath, type ClientOnlyRoute } from "./lib/spa-routes";
import { MIN_WORKS_FOR_INDEXED_HUB } from "./lib/sitemap-entries";
import {
  findAuthorProfile,
  findPublicationBySlug,
  findPublishedSlugRedirect,
  findSubmissionOwner,
  listAuthorHubWorks,
  type AuthorHubArticle,
  type AuthorHubPaper,
} from "./lib/publication-lookup";
import { makeAuthorResolver, resolveAuthorRequest, workAuthorSegments } from "./lib/author-identity";
import { cleanTitle } from "./lib/seo-text";
import { sanitizeArticleBody } from "./lib/content";
import { getAdminAuth, getUserAuth } from "./lib/auth";
import { recoverLegacyInlineImages } from "./lib/legacy-content";

export * from "./lib/ssr-html";

const app: Express = express();
// Do not announce the framework on every response.
app.disable("x-powered-by");
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
  // Same value as vercel.json. Every page, /login included, is now answered
  // by this app, and Google Identity Services' sign-in popup needs
  // same-origin-allow-popups; plain same-origin severs it from the opener.
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");

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
    // robots.txt lets crawlers fetch the public read endpoints the SPA uses
    // (/api/articles, /api/papers, ...) so rendered pages are complete. The
    // JSON itself is not a search result; noindex keeps it out of the index
    // without blocking rendering. Uploaded files (/api/uploads) are exempt.
    res.setHeader("X-Robots-Tag", "noindex");
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

// URL normalisation and the client-only app shell. Neither needs the
// database, so both run before it is touched.
//
// - /about/ -> /about and /About -> /about (308; vercel.json's
//   "trailingSlash": false does the first at the edge as well).
// - Routes only the client renders (sign-in, account, admin, search, community
//   subpages; lib/spa-routes.ts) get the app shell with 200 and noindex.
//   Every other unknown path ends at the 404 handler at the bottom.
app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  const target = normalizedPagePath(req.path);
  if (target) {
    const index = req.originalUrl.indexOf("?");
    const query = index >= 0 ? req.originalUrl.slice(index) : "";
    return res.redirect(308, `${target}${query}`);
  }
  const clientRoute = matchClientOnlyRoute(req.path);
  if (clientRoute) return sendClientShell(res, clientRoute);
  return next();
});

function sendClientShell(res: import("express").Response, route: ClientOnlyRoute) {
  const robots = route.private ? "noindex, nofollow" : "noindex, follow";
  res.setHeader("X-Robots-Tag", robots);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // The shell carries no user data and only changes with a deploy.
  res.setHeader("Cache-Control", PUBLIC_HTML_CACHE_CONTROL);
  const metaTags = `
    <title>${escapeHtml(`${clientRouteTitle(route)} — ${SITE_NAME}`)}</title>
    <meta name="robots" content="${robots}" />`;
  return res.status(200).send(renderSpaShell(metaTags));
}

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

/**
 * The exemption needs a session that verifies. Any non-empty cookie or bearer
 * string used to skip the limit, so an anonymous script could add a fake one.
 */
async function hasVerifiedSession(req: import("express").Request): Promise<boolean> {
  if (!hasSessionCookie(req)) return false;
  try {
    return Boolean(await getUserAuth(req));
  } catch {
    return false;
  }
}

const publicWriteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.PUBLIC_WRITE_RATE_LIMIT || 60),
  standardHeaders: true,
  legacyHeaders: false,
  skip: async req => SAFE_METHODS.has(req.method) || (await hasVerifiedSession(req)),
  message: { error: "Too many requests from this address. Please try again later." },
});

// Media uploads are inherently high-volume for a single piece of work, so they
// get a much larger anonymous budget than form posts.
const mediaWriteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.MEDIA_WRITE_RATE_LIMIT || 300),
  standardHeaders: true,
  legacyHeaders: false,
  skip: async req => SAFE_METHODS.has(req.method) || (await hasVerifiedSession(req)),
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

// One sitemap only. The old duplicate at /api/sitemap.xml was declared in
// robots.txt alongside /sitemap.xml; send anything still asking for it to the
// canonical location. (vercel.json carries the same redirect at the edge.)
app.get("/api/sitemap.xml", (_req, res) => {
  res.redirect(301, "/sitemap.xml");
});

app.use("/api", router);

// Direct root protocol endpoints
app.use(sitemapRouter);
app.use(rssRouter);
app.use(llmsRouter);
app.use(indexnowRouter);
// Server-rendered /, /archive, /domains, /papers, /contact, /privacy, /terms,
// /community and /submit (see routes/public-pages.ts).
app.use(publicPagesRouter);

// Serve IndexNow verification key file at root
app.get(["/indexnow-key.txt", `/${DEFAULT_INDEXNOW_KEY}.txt`], (_req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  return res.status(200).send(DEFAULT_INDEXNOW_KEY);
});

/*
  Google Search Console verification.

  There is deliberately no google<token>.html responder here. The one that used
  to sit here echoed back whatever token was requested, which let any Google
  account verify itself as an owner of this site. The journal's Search Console
  property is a Domain property verified through DNS, which needs no file.

  If an HTML-file verification is ever genuinely required, commit the exact file
  Google issues (for example `google0123456789abcdef.html`) to
  artifacts/anvikshiki/public/ so the CDN serves that one filename and nothing
  else. The optional meta-tag method is handled by GOOGLE_SITE_VERIFICATION in
  injectSsrHtml/buildFallbackHtml below.
*/

// /api/seo/status, POST /api/seo/reindex and POST /api/indexnow/notify live in
// routes/indexnow.ts (mounted under /api and at the root). The duplicates that
// used to follow here were unreachable and unauthenticated; they are gone.

// SSR primitives (escaping, template, styles, structured-data helpers) live in
// lib/ssr-html.ts and are re-exported here for existing importers.

/**
 * The /authors/<segment> for each name in a work's byline, by the same rule as
 * the sitemap and the /authors/:slug route (lib/author-identity.ts): the
 * submitting account's handle when there is one, otherwise a slug of the name.
 * A name only gets a URL when that route serves it, so the byline and the
 * JSON-LD never point at a 404.
 */
/**
 * Whether this request may see an unpublished work: a verified administrator
 * session, or the verified account that submitted it. The mere presence of a
 * session cookie is not enough; it can be forged, and the page embeds the
 * full text.
 */
async function canPreviewDraft(
  req: import("express").Request,
  sourceSubmissionId: string | null | undefined,
): Promise<boolean> {
  if (await getAdminAuth(req).catch(() => null)) return true;
  const user = await getUserAuth(req).catch(() => null);
  if (!user?.userId) return false;
  const owner = await findSubmissionOwner(sourceSubmissionId).catch(() => null);
  return Boolean(owner && owner === user.userId);
}

async function loadBylineSegments(
  kind: "article" | "paper",
  authorName: string | null | undefined,
  sourceSubmissionId: string | null | undefined,
): Promise<(displayNames: string[]) => Map<string, string>> {
  try {
    const [users, ownerId] = await Promise.all([loadAuthorUsers(), findSubmissionOwner(sourceSubmissionId)]);
    const resolve = makeAuthorResolver(users);
    const served = new Set(workAuthorSegments({ kind, authorName, authorId: ownerId }, resolve));
    return (displayNames) => {
      const segments = new Map<string, string>();
      for (const name of displayNames) {
        const segment = resolve(name, ownerId, displayNames.length === 1);
        if (segment && served.has(segment)) segments.set(name, segment);
      }
      return segments;
    };
  } catch {
    // Without the account list a real single name falls back to its slug; the
    // author route redirects that to the handle when there is one.
    return (displayNames) => {
      const segments = new Map<string, string>();
      const segment = displayNames.length === 1 && (authorName || "").trim() ? slugify(displayNames[0]) : "";
      if (segment) segments.set(displayNames[0], segment);
      return segments;
    };
  }
}

/**
 * The request's query string without parameters a rewrite copied from the
 * path. Older Vercel rewrites ("/essays/:slug*") appended ?slug=<slug>, which
 * then leaked into redirect locations.
 */
function forwardedQuery(req: import("express").Request): string {
  const index = req.originalUrl.indexOf("?");
  if (index < 0) return "";
  const params = new URLSearchParams(req.originalUrl.slice(index + 1));
  for (const [key, value] of Object.entries(req.params || {})) {
    const values = params.getAll(key);
    if (values.length > 0 && values.every((v) => v === String(value))) params.delete(key);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
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

/**
 * `authorSegment` is the canonical /authors/<segment> for the byline; null
 * means the author route serves no page for this name, so the byline is not
 * linked. When it is omitted, the name slug is used.
 */
/** The parts of the effective SEO (lib/effective-seo.ts) the page body shows. */
type BodySeo = Pick<WorkSeo, "topics" | "references" | "sourcesNote">;

/**
 * `continueReading` is the rendered "Related essays" block (related works, the
 * domain hub when indexed, the archive); see renderContinueReading.
 */
export function generateArticleSsrHtml(article: any, domainDisplayName: string, authorSegment?: string | null, seo: BodySeo = workSeo(article, "article"), continueReading = ""): string {
  const author = article.authorName || "Ānvīkṣikī Editorial Collective";
  const authorSlug = authorSegment === undefined ? slugify(author) : authorSegment;
  const authorHref = authorSlug ? `/authors/${escapeHtml(encodeURIComponent(authorSlug))}` : null;
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

  const topicsHtml = renderTopics(seo.topics, "Topics");
  const referencesHtml = renderReferences(seo.references, seo.sourcesNote);
  const bodyHtml = renderBodyHtml(article.body, article.excerpt || undefined);

  return `<article class="ssr-content ssr-article" itemscope itemtype="https://schema.org/Article">
  ${breadcrumbsHtml}

  <header class="ssr-article-header">
    <div class="ssr-domain-pill">
      <a href="/domains/${escapeHtml(article.categorySlug)}" class="ssr-badge">${escapeHtml(domainDisplayName)}</a>
    </div>

    <h1 class="ssr-title" itemprop="headline">${escapeHtml(cleanTitle(article.title))}</h1>

    ${article.subtitle ? `<p class="ssr-subtitle" itemprop="alternativeHeadline">${escapeHtml(article.subtitle)}</p>` : ""}

    <div class="ssr-byline-bar">
      <div class="ssr-author" itemprop="author" itemscope itemtype="https://schema.org/Person">
        <span>By </span>
        ${authorHref ? `<a itemprop="url" href="${authorHref}" class="ssr-author-link">
          <span itemprop="name">${escapeHtml(author)}</span>
        </a>` : `<span itemprop="name">${escapeHtml(author)}</span>`}
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

  ${topicsHtml}
  ${referencesHtml}
  ${continueReading}

  <footer class="ssr-article-footer">
    <div class="ssr-author-bio-card">
      <h3>About the Author</h3>
      <p><strong>${authorHref ? `<a href="${authorHref}">${escapeHtml(author)}</a>` : escapeHtml(author)}</strong> is a contributor to Ānvīkṣikī Journal.</p>
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

export function generatePaperSsrHtml(paper: any, domainDisplayName: string, authorSegments?: Map<string, string>, seo: BodySeo = workSeo(paper, "paper"), continueReading = ""): string {
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

  const topicsHtml = renderTopics(seo.topics, "Keywords");
  const referencesHtml = renderReferences(seo.references, seo.sourcesNote);
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

  // Each name links to its canonical author page when the route serves one
  // (authorSegments from the caller); without the map, to the name slug.
  const authorsHtml = authorsList.map((auth: string) => {
    const aSlug = authorSegments ? authorSegments.get(auth) : slugify(auth);
    const name = `<span itemprop="name">${escapeHtml(auth.trim())}</span>`;
    return `<span class="ssr-author" itemprop="author" itemscope itemtype="https://schema.org/Person">
      ${aSlug ? `<a itemprop="url" href="/authors/${escapeHtml(encodeURIComponent(aSlug))}" class="ssr-author-link">${name}</a>` : name}
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

    <h1 class="ssr-title" itemprop="headline">${escapeHtml(cleanTitle(paper.title))}</h1>

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

  ${topicsHtml}
  ${referencesHtml}
  ${continueReading}

  <section class="ssr-section ssr-citation-details">
    <h2>Citation Details</h2>
    <div class="ssr-citation-card">
      <p class="ssr-citation-formatted">${escapeHtml(citationText)}</p>
      <pre class="ssr-bibtex-code"><code>${escapeHtml(bibtex)}</code></pre>
    </div>
  </section>

  <footer class="ssr-paper-footer">
    <div class="ssr-contributor-cta">
      <h3>Contribute to Ānvīkṣikī</h3>
      <p>Have research, translations, or philosophical arguments in Indic studies worth publishing? <a href="/submit">Submit your manuscript or essay for editorial review</a>.</p>
    </div>
  </footer>
</article>`;
}

/**
 * An author page's entry for one of their works: the listing fields, with the
 * work's own description and topic terms (lib/effective-seo.ts). The text
 * the description is derived from is not passed on.
 */
export function authorHubListing(
  work: AuthorHubArticle | AuthorHubPaper,
  authorPath: string | null,
  seo: { description: string; topics: string[] } = listingSeo(work, work.kind),
): WorkSummary & { year?: number | null; doi?: string | null } {
  const base = {
    kind: work.kind,
    id: work.id,
    slug: work.slug,
    title: work.title,
    authorName: work.authorName,
    authorPath,
    categorySlug: work.categorySlug,
    publishedAt: formatIsoDate(work.publishedAt) || null,
    updatedAt: formatIsoDate(work.updatedAt) || formatIsoDate(work.publishedAt) || null,
    readingMinutes: work.readingMinutes,
    description: seo.description,
    topics: seo.topics,
  };
  return work.kind === "paper"
    ? { ...base, excerpt: work.abstract ? stripHtml(work.abstract) : null, heroImageUrl: work.coverImageUrl, year: work.year, doi: work.doi }
    : { ...base, excerpt: work.excerpt ? stripHtml(work.excerpt) : work.subtitle, heroImageUrl: work.heroImageUrl };
}

/** A BreadcrumbList node; the visible breadcrumb trail lists the same pages. */
export function breadcrumbListNode(pageUrl: string, items: Array<{ name: string; url: string }>) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${pageUrl}#breadcrumb`,
    "itemListElement": items.map((item, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": item.name,
      "item": { "@type": "WebPage", "@id": item.url, "name": item.name },
    })),
  };
}

/** A listed work's description: its effective meta description, else its own summary. */
function listedDescription(work: any): string {
  if (typeof work.description === "string" && work.description.trim()) return work.description.trim();
  return stripHtml(work.excerpt || work.abstract || "");
}

/** A listed work's topic terms as plain text, or "" when it has none. */
function listedTopics(work: any): string {
  const topics: string[] = Array.isArray(work.topics) ? work.topics : [];
  return topics.length > 0
    ? `<p class="ssr-work-topics"><span class="ssr-topics-label">Topics</span> ${topics.map(escapeHtml).join(" · ")}</p>`
    : "";
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
  papers: Array<any>,
  categoryNames: Map<string, string> = new Map(),
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

  const domainLink = (slug: string | null | undefined) => {
    if (!slug) return "";
    const name = categoryNames.get(slug) || slug.replace(/-/g, " ");
    return `<span class="ssr-work-domain"><a href="/domains/${escapeHtml(encodeURIComponent(slug))}">${escapeHtml(name)}</a></span>`;
  };
  const domainSlugs = [...new Set([...articles, ...papers].map((w) => w.categorySlug).filter(Boolean))] as string[];

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
      ${articles.map(art => {
        const description = listedDescription(art);
        return `
        <li class="ssr-work-item">
          <article itemscope itemtype="https://schema.org/Article">
            <h3 itemprop="headline"><a itemprop="url" href="${workPath({ kind: "article", slug: art.slug })}">${escapeHtml(art.title)}</a></h3>
            <div class="ssr-work-meta">
              ${art.publishedAt ? `<time datetime="${formatIsoDate(art.publishedAt)}" itemprop="datePublished">${escapeHtml(formatDate(art.publishedAt))}</time>` : ""}
              ${domainLink(art.categorySlug)}
              ${art.readingMinutes ? `<span class="ssr-reading-time">${escapeHtml(art.readingMinutes)} min read</span>` : ""}
            </div>
            ${description ? `<p class="ssr-work-excerpt" itemprop="description">${escapeHtml(description)}</p>` : ""}
            ${listedTopics(art)}
          </article>
        </li>`;
      }).join("\n")}
    </ul>
  </section>
  ` : ""}

  ${papers.length > 0 ? `
  <section class="ssr-section ssr-author-publications">
    <h2>Research Papers &amp; Monographs (${papers.length})</h2>
    <ul class="ssr-work-list">
      ${papers.map(p => {
        const description = listedDescription(p);
        return `
        <li class="ssr-work-item">
          <article itemscope itemtype="https://schema.org/ScholarlyArticle">
            <h3 itemprop="headline"><a itemprop="url" href="${workPath({ kind: "paper", slug: p.slug })}">${escapeHtml(p.title)}</a></h3>
            <div class="ssr-work-meta">
              ${p.year ? `<span class="ssr-work-year">Year: ${escapeHtml(p.year)}</span>` : ""}
              ${p.publishedAt ? `<time datetime="${formatIsoDate(p.publishedAt)}" itemprop="datePublished">${escapeHtml(formatDate(p.publishedAt))}</time>` : ""}
              ${domainLink(p.categorySlug)}
              ${p.doi ? `<span class="ssr-work-doi">DOI: ${escapeHtml(p.doi)}</span>` : ""}
            </div>
            ${description ? `<p class="ssr-work-excerpt" itemprop="description">${escapeHtml(description)}</p>` : ""}
            ${listedTopics(p)}
          </article>
        </li>`;
      }).join("\n")}
    </ul>
  </section>
  ` : ""}
  ${articles.length === 0 && papers.length === 0 ? `
  <section class="ssr-section ssr-author-publications">
    <p>No published articles or papers currently catalogued for this scholar.</p>
  </section>
  ` : `
  <p class="ssr-related-links">${domainSlugs.map((slug) => `<a href="/domains/${escapeHtml(encodeURIComponent(slug))}">${escapeHtml(categoryNames.get(slug) || slug.replace(/-/g, " "))}</a>`).join(" · ")}${domainSlugs.length ? " · " : ""}<a href="/archive">Every essay in the archive</a></p>
  `}
</main>`;
}

export function generateDomainHubSsrHtml(
  category: {
    slug: string;
    name: string;
    description?: string | null;
    icon?: string | null;
  },
  articles: WorkSummary[],
  papers: WorkSummary[],
  otherDomains: CategorySummary[] = [],
): string {
  const totalWorks = articles.length + papers.length;
  const names = new Map([[category.slug, category.name], ...otherDomains.map((c) => [c.slug, c.name] as [string, string])]);
  const newest = [...articles, ...papers]
    .map((w) => w.publishedAt)
    .filter((d): d is string => Boolean(d))
    .sort()
    .pop();

  const breadcrumbsHtml = renderBreadcrumbs([
    { name: "Home", url: "/" },
    { name: "Domains", url: "/domains" },
    { name: category.name },
  ]);

  const others = otherDomains.filter((c) => c.slug !== category.slug && c.articleCount + c.paperCount > 0);
  const listOptions = { domain: false, topics: true };

  return `<main class="ssr-content ssr-domain-hub">
  ${breadcrumbsHtml}

  <header class="ssr-domain-header">
    <span class="ssr-domain-label">Domain</span>
    <h1 class="ssr-title">${escapeHtml(category.name)}</h1>
    ${category.description ? `<p class="ssr-description">${escapeHtml(category.description)}</p>` : ""}
    <div class="ssr-domain-stats">
      <span><strong>${articles.length}</strong> ${articles.length === 1 ? "essay" : "essays"}</span>${papers.length > 0 ? ` · <span><strong>${papers.length}</strong> ${papers.length === 1 ? "paper" : "papers"}</span>` : ""}${newest ? ` · <span>Most recent <time datetime="${formatIsoDate(newest)}">${escapeHtml(formatDate(newest))}</time></span>` : ""}
    </div>
  </header>

  <section class="ssr-section ssr-domain-publications">
    <h2>Published work in ${escapeHtml(category.name)}</h2>

    ${totalWorks === 0 ? `
      <div class="ssr-empty-box">
        <p>Nothing has been published in ${escapeHtml(category.name)} yet.</p>
        <p><a href="/submit" class="ssr-btn-submit">Submit work in ${escapeHtml(category.name)}</a> · <a href="/domains">Other domains</a></p>
      </div>
    ` : `
      ${articles.length > 0 ? renderListedWorks(articles, names, listOptions) : ""}
      ${papers.length > 0 ? `<h2>Research papers</h2>
      ${renderListedWorks(papers, names, listOptions)}` : ""}
    `}
  </section>

  ${others.length > 0 ? `<section class="ssr-section ssr-other-domains">
    <h2>Other domains</h2>
    <ul>
      ${others.map((c) => `<li><a href="/domains/${escapeHtml(encodeURIComponent(c.slug))}">${escapeHtml(c.name)}</a> (${c.articleCount + c.paperCount} ${c.articleCount + c.paperCount === 1 ? "work" : "works"})</li>`).join("\n      ")}
    </ul>
  </section>` : ""}

  <p class="ssr-related-links"><a href="/domains">All domains</a> · <a href="/archive">The full archive</a></p>
</main>`;
}


// HTTP 301 Permanent Redirects for legacy routes. Locations are built from the
// path only (plus any genuine query parameters), never from parameters a
// rewrite injected.
app.get(["/essays/:slug", "/categories/:slug"], (req, res) => {
  const slug = String(req.params.slug || "").trim();
  const section = req.path.startsWith("/essays/") ? "articles" : "domains";
  if (!slug) return res.redirect(301, section === "articles" ? "/archive" : "/domains");
  return res.redirect(301, `/${section}/${encodeURIComponent(slug)}${forwardedQuery(req)}`);
});
// There is no /articles index: the archive lists every essay. /authors has no
// index either; the SPA sends it to /browse.
app.get(["/essays", "/articles"], (req, res) => res.redirect(301, `/archive${forwardedQuery(req)}`));
app.get("/categories", (req, res) => res.redirect(301, `/domains${forwardedQuery(req)}`));
app.get("/authors", (req, res) => res.redirect(301, `/browse${forwardedQuery(req)}`));

export function generateAboutAnvikshikiSsrHtml(furtherReading: WorkSummary[] = [], categoryNames: Map<string, string> = new Map()): string {
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

  ${furtherReading.length > 0 ? `<section class="ssr-section ssr-related" aria-labelledby="further-reading-heading">
    <h2 id="further-reading-heading">Further reading on Ānvīkṣikī</h2>
    <p>The journal's own account of why it was started, and essays it has published in philosophy and Sanskrit studies.</p>
    ${renderListedWorks(furtherReading, categoryNames)}
  </section>` : ""}

  <footer class="ssr-article-footer">
    <div class="ssr-citation-note">
      <p><strong>Related Destinations</strong>: <a href="/domains/philosophy">Indian Philosophy Hub</a> · <a href="/domains/sanskrit-studies">Sanskrit Studies Hub</a> · <a href="/domains/history">History &amp; Civilizational Memory</a> · <a href="/archive">The archive</a> · <a href="/about">About the journal</a> · <a href="/submit">Submit Your Research</a></p>
    </div>
  </footer>
</article>`;
}

/** Describes what /browse actually lists; no "peer-level" or "monograph" claims. */
export const BROWSE_DESCRIPTION = "Every article and paper published on Ānvīkṣikī, grouped by discipline: Indic philosophy, Sanskrit traditions, history and civilizational thought.";

export function generateBrowseSsrHtml(
  articles: WorkSummary[],
  papers: WorkSummary[],
  categories: Array<{ slug: string; name: string }>
): string {
  const breadcrumbsHtml = renderBreadcrumbs([
    { name: "Home", url: "/" },
    { name: "Browse" },
  ]);

  const names = new Map(categories.map((c) => [c.slug, c.name]));

  return `<main class="ssr-content ssr-browse-hub" itemscope itemtype="https://schema.org/CollectionPage">
  ${breadcrumbsHtml}

  <header class="ssr-domain-header">
    <span class="ssr-domain-label">Publication Index</span>
    <h1 class="ssr-title" itemprop="name">Browse Published Articles &amp; Papers</h1>
    <p class="ssr-description" itemprop="description">${escapeHtml(BROWSE_DESCRIPTION)}</p>
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
    <h2>Published Essays &amp; Articles (${articles.length})</h2>
    ${renderListedWorks(articles, names)}
    ${papers.length > 0 ? `
    <h2>Research Papers (${papers.length})</h2>
    ${renderListedWorks(papers, names)}
    ` : ""}
  </section>
</main>`;
}

function staticPageHead(
  key: "about" | "aboutAnvikshiki",
  canonicalUrl: string,
  ogType: "website" | "article",
  jsonLdNode: Record<string, unknown>,
): string {
  const { title, description } = PAGE_META[key];
  return `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:locale" content="en_IN" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="${ogType}" />
    <meta property="og:url" content="${canonicalUrl}" />
    ${socialImageMetaTags(DEFAULT_SOCIAL_IMAGE, "Ānvīkṣikī")}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${canonicalUrl}" />
    ${jsonLdGraphScript([jsonLdNode])}
  `;
}

function sendPublicHtml(res: import("express").Response, html: string) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", PUBLIC_HTML_CACHE_CONTROL);
  return res.status(200).send(html);
}

/**
 * Published works and visible domains (with counts) for the pages whose static
 * text is extended by listings (/about, /about/anvikshiki). Null when the
 * database could not be read: those pages then render their text alone,
 * uncached, rather than fail.
 */
async function loadOptionalListing(req: import("express").Request): Promise<{ works: WorkSummary[]; categories: CategorySummary[]; papers: number } | null> {
  try {
    const [works, visible] = await Promise.all([listPublishedWorks(), listVisibleCategories()]);
    return {
      works: [...works.articles, ...works.papers].sort((a, b) => (Date.parse(b.publishedAt || "") || 0) - (Date.parse(a.publishedAt || "") || 0)),
      categories: withWorkCounts(visible, works),
      papers: works.papers.length,
    };
  } catch (err) {
    req.log?.warn({ err }, "Listing data unavailable; rendering the page text alone");
    return null;
  }
}

function sendListingPage(res: import("express").Response, html: string, complete: boolean) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // A page missing its listings is never cached; the next request retries.
  res.setHeader("Cache-Control", complete ? PUBLIC_HTML_CACHE_CONTROL : "no-store");
  return res.status(200).send(html);
}

// SSR for /about/anvikshiki (Meaning of Ānvīkṣikī Canonical Hub)
app.get("/about/anvikshiki", async (req, res) => {
  const canonicalUrl = `${CANONICAL_DOMAIN}/about/anvikshiki`;
  const { title, description } = PAGE_META.aboutAnvikshiki;
  const listing = await loadOptionalListing(req);
  const furtherReading = listing ? meaningPageReading(listing.works) : [];
  const names = new Map((listing?.categories || []).map((c) => [c.slug, c.name]));
  const aboutPageNode = {
    "@type": "AboutPage",
    "@id": `${canonicalUrl}#webpage`,
    "url": canonicalUrl,
    "name": title,
    "description": description,
    "inLanguage": "en",
    "isPartOf": { "@type": "WebSite", "@id": `${CANONICAL_DOMAIN}/#website` },
    "publisher": publisherNode(),
    "mainEntity": {
      "@type": "DefinedTerm",
      "@id": `${canonicalUrl}#term`,
      "name": "Ānvīkṣikī",
      "alternateName": ["Anvikshiki", "आन्वीक्षिकी", "Aanvikshiki", "Anvikshiki Vidya"],
      "description": "The classical Sanskrit science of critical inquiry, logical examination, and rational philosophy as articulated in Kautilya's Arthaśāstra and Vātsyāyana's Nyāyabhāṣya.",
      "inDefinedTermSet": `${CANONICAL_DOMAIN}/domains/philosophy`,
    },
    // The further-reading list, as shown on the page.
    "relatedLink": furtherReading.length ? furtherReading.map((w) => `${CANONICAL_DOMAIN}${workPath(w)}`) : undefined,
  };
  const metaTags = staticPageHead("aboutAnvikshiki", canonicalUrl, "article", aboutPageNode);
  return sendListingPage(res, renderSsrDocument(metaTags, generateAboutAnvikshikiSsrHtml(furtherReading, names), {
    route: "about-anvikshiki",
    path: "/about/anvikshiki",
    data: listing ? { furtherReading, domains: listing.categories } : null,
  }, { showPapers: listing ? listing.papers > 0 : await hasPublishedPapers() }), listing !== null);
});

/**
 * /about: what the journal is and publishes, its name, its published work,
 * how submissions work and how to reach the editor. Every statement comes from
 * copy already published on the site (the mission text, the submission
 * guidelines, the contact page) or from the published records themselves.
 */
export function generateAboutSsrHtml(
  listing: { works: WorkSummary[]; categories: CategorySummary[] } | null,
): string {
  const works = listing?.works || [];
  const essays = works.filter((w) => w.kind === "article").length;
  const papers = works.length - essays;
  const names = new Map((listing?.categories || []).map((c) => [c.slug, c.name]));
  const hubs = (listing?.categories || [])
    .filter((c) => c.articleCount + c.paperCount > 0)
    .sort((a, b) => b.articleCount + b.paperCount - (a.articleCount + a.paperCount));
  const newest = works[0]?.publishedAt;
  const mission = works.find((w) => w.kind === "article" && w.slug === MISSION_ESSAY_SLUG);
  const latest = works.slice(0, ABOUT_LATEST_COUNT);
  const count = (n: number, word: string) => `${n} ${n === 1 ? word : `${word}s`}`;

  return `<main class="ssr-content ssr-about">
    <h1 class="ssr-title">About Ānvīkṣikī</h1>
    <p class="ssr-description">An open journal and research platform for rigorous inquiry, civilizational memory, and beautiful long-form scholarship.</p>
    <p>Anvikshiki is a journal dedicated to the rigorous and beautiful study of ideas. Our aim is to bridge timeless wisdom with contemporary inquiry while preserving the calm, serious reading experience that scholarship deserves.</p>

    <section class="ssr-section" aria-labelledby="about-publishes">
      <h2 id="about-publishes">What the journal publishes</h2>
      <p>We accept essays, research papers, translations and commentary across philosophy, history, psychology, sociology, science, geopolitics, civilizational thought and the Sanskrit tradition. The work published so far is essays, mostly on history, philosophy and politics.</p>
      ${works.length > 0 ? `<p>${count(essays, "essay")}${papers > 0 ? ` and ${count(papers, "research paper")}` : ""} published so far${newest ? `, the most recent on <time datetime="${formatIsoDate(newest)}">${escapeHtml(formatDate(newest))}</time>` : ""}. Every essay is free to read.</p>` : ""}
      ${hubs.length > 0 ? `<ul class="ssr-domain-summary">
        ${hubs.map((c) => `<li><a href="/domains/${escapeHtml(encodeURIComponent(c.slug))}">${escapeHtml(c.name)}</a> (${count(c.articleCount + c.paperCount, "work")})${c.description ? `: ${escapeHtml(c.description)}` : ""}</li>`).join("\n        ")}
      </ul>` : ""}
    </section>

    <section class="ssr-section" aria-labelledby="about-name">
      <h2 id="about-name">The name</h2>
      <p>The ancient word Ānvīkṣikī (आन्वीक्षिकी) means the philosophical examination of truth: the disciplined habit of questioning, comparing, and seeing clearly.</p>
      <p><a href="/about/anvikshiki">Read the complete treatise on the Meaning of Ānvīkṣikī</a>: its Sanskrit etymology, Kautilya's account of it in the Arthaśāstra and its place in the Nyāya tradition.</p>
      ${mission ? `<p>The essay <a href="${workPath(mission)}">${escapeHtml(cleanTitle(mission.title))}</a> explains why the journal was started.</p>` : ""}
    </section>

    ${latest.length > 0 ? `<section class="ssr-section" aria-labelledby="about-latest">
      <h2 id="about-latest">${works.length > latest.length ? "Recently published" : "Published essays"}</h2>
      ${renderListedWorks(latest, names)}
      <p class="ssr-related-links"><a href="/archive">${works.length > latest.length ? `All ${works.length} published works in the archive` : "The archive"}</a> · <a href="/domains">Domains</a></p>
    </section>` : ""}

    <section class="ssr-section" aria-labelledby="about-submissions">
      <h2 id="about-submissions">How submissions work</h2>
      <p>Submitting needs an account. Authors write the piece in the browser editor or upload a PDF, Word (.doc or .docx) or plain-text file together with its details.</p>
      <p>Each submission is read by the editor, who may accept it, ask for revisions or decline it. Nothing is published without the editor's decision. Authors keep ownership of their work (see the <a href="/terms">terms</a>).</p>
      <p><a href="/submit">Read the submission guidelines</a></p>
    </section>

    <section class="ssr-section" aria-labelledby="about-contact">
      <h2 id="about-contact">Contact</h2>
      <p>Write to the editor at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>, or use the <a href="/contact">contact page</a>.</p>
    </section>
  </main>`;
}

// SSR for /about
app.get("/about", async (req, res) => {
  const canonicalUrl = `${CANONICAL_DOMAIN}/about`;
  const { title, description } = PAGE_META.about;
  const listing = await loadOptionalListing(req);
  const aboutPageNode = {
    "@type": "AboutPage",
    "@id": `${canonicalUrl}#webpage`,
    "url": canonicalUrl,
    "name": title,
    "description": description,
    "inLanguage": "en",
    "isPartOf": { "@type": "WebSite", "@id": `${CANONICAL_DOMAIN}/#website` },
    "publisher": publisherNode(),
    "mainEntity": { "@id": `${CANONICAL_DOMAIN}/#organization` },
  };
  const metaTags = staticPageHead("about", canonicalUrl, "website", aboutPageNode);
  const latest = listing ? listing.works.slice(0, ABOUT_LATEST_COUNT) : [];
  return sendListingPage(res, renderSsrDocument(metaTags, generateAboutSsrHtml(listing), {
    route: "about",
    path: "/about",
    data: listing ? {
      latest,
      total: listing.works.length,
      essays: listing.works.filter((w) => w.kind === "article").length,
      domains: listing.categories,
      mission: listing.works.find((w) => w.kind === "article" && w.slug === MISSION_ESSAY_SLUG) || null,
    } : null,
  }, { showPapers: listing ? listing.papers > 0 : await hasPublishedPapers() }), listing !== null);
});

// SSR for /browse
app.get("/browse", async (req, res) => {
  const canonicalUrl = `${CANONICAL_DOMAIN}/browse`;
  const { title, description } = PAGE_META.browse;

  let articles: WorkSummary[];
  let papers: WorkSummary[];
  let categories: Array<{ slug: string; name: string; description: string | null }>;
  try {
    const [works, visible] = await Promise.all([listPublishedWorks(), listVisibleCategories()]);
    articles = works.articles;
    papers = works.papers;
    categories = visible;
  } catch (err) {
    // Never cache an empty listing for a database hiccup.
    sendUnavailable(req, res, err);
    return;
  }

  const browseNode = {
    "@type": "CollectionPage",
    "@id": canonicalUrl,
    "url": canonicalUrl,
    "name": title,
    "description": description,
    "inLanguage": "en",
    "isPartOf": { "@type": "WebSite", "@id": `${CANONICAL_DOMAIN}/#website` },
    "publisher": publisherNode(),
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": [
        ...articles.map((a, i) => ({ "@type": "ListItem", "position": i + 1, "url": `${CANONICAL_DOMAIN}/articles/${a.slug}`, "name": a.title })),
        ...papers.map((p, i) => ({ "@type": "ListItem", "position": articles.length + i + 1, "url": `${CANONICAL_DOMAIN}/papers/${p.slug}`, "name": p.title })),
      ],
    },
  };
  const metaTags = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:locale" content="en_IN" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonicalUrl}" />
    ${socialImageMetaTags(DEFAULT_SOCIAL_IMAGE, "Ānvīkṣikī")}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${canonicalUrl}" />
    ${jsonLdGraphScript([browseNode])}
  `;

  const ssrHtml = generateBrowseSsrHtml(articles, papers, categories);
  return sendPublicHtml(res, renderSsrDocument(metaTags, ssrHtml, {
    route: "browse",
    path: "/browse",
    data: { articles, papers, domains: categories },
  }, { showPapers: papers.length > 0 }));
});

// The drafting and upload screens under /submit/ are client-only routes; the
// shell middleware near the top serves them with noindex, nofollow (see
// lib/spa-routes.ts). The public /submit guidelines page is in
// routes/public-pages.ts.

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
    const isPaper = req.path.startsWith("/papers");
    const kind = isPaper ? "paper" : "article";
    const resourceType = isPaper ? "research paper" : "article";
    const section = isPaper ? "papers" : "articles";

    const item: any = await findPublicationBySlug(kind, rawSlug);

    if (!item) {
      // An old or truncated URL (for example the slug before a hash suffix was
      // added) permanently redirects to the one published work it names.
      const target = await findPublishedSlugRedirect(kind, rawSlug);
      if (target) {
        res.redirect(301, `/${section}/${encodeURIComponent(target)}`);
        return;
      }
      send404(res, resourceType, rawSlug);
      return;
    }
    if (item.deletedAt) {
      send410(res, resourceType, rawSlug);
      return;
    }
    const isDraft = item.status !== "PUBLISHED";
    if (isDraft && !(await canPreviewDraft(req, item.sourceSubmissionId))) {
      send404(res, resourceType, rawSlug);
      return;
    }

    // Resolve domain category display name
    let domainDisplayName = item.categorySlug || "Indic Studies";
    try {
      if (item.categorySlug) {
        const cat = await findCategory(item.categorySlug);
        if (cat?.name) {
          domainDisplayName = cat.name;
        }
      }
    } catch {}

    // Title, description, topic terms and references: the value stored on the
    // work, else the editorial layer, else one derived from the text
    // (lib/effective-seo.ts). <title>, og:title and twitter:title use the SEO
    // title without a dangling ":" / "-" / "—"; the description is 120–160
    // characters of whole sentences that never start with the title.
    const seo = workSeo(item, isPaper ? "paper" : "article");
    const title = seo.title;
    const headline = cleanTitle(item.title);
    const description = seo.description || headline;
    const canonicalPath = isPaper ? `/papers/${item.slug}` : `/articles/${item.slug}`;
    const canonicalUrl = buildCanonicalUrl(canonicalPath);

    const heroImage = isPaper ? item.coverImageUrl : item.heroImageUrl;
    const image = socialImage(heroImage);
    // Structured data gets the original, highest-resolution image.
    const structuredImage = typeof heroImage === "string" && heroImage.trim()
      ? (heroImage.trim().startsWith("/") ? `${CANONICAL_DOMAIN}${heroImage.trim()}` : heroImage.trim())
      : DEFAULT_SOCIAL_IMAGE.url;

    const titleHtml = escapeHtml(title);
    const plainDescription = description;
    const cleanExcerpt = escapeHtml(plainDescription);
    const cleanUrl = escapeHtml(canonicalUrl);
    const isoPublished = formatIsoDate(item.publishedAt);
    const isoUpdated = formatIsoDate(item.updatedAt);
    const authorRaw = item.authorName || (isPaper ? "Anonymous Scholar" : "Ānvīkṣikī Editorial Collective");

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

    // The same topic terms and references are shown on the page, so the
    // markup matches what readers see. Nothing generic is added.
    const topicTags = seo.topics;
    const topicTagsStr = topicTags.join(", ");
    const references = seo.references;

    // One canonical author URL per name, the same one the sitemap lists and
    // /authors/:slug serves; names that route does not serve get no URL.
    const bylineSegmentsFor = await loadBylineSegments(kind, item.authorName, item.sourceSubmissionId);
    const bylineSegments = bylineSegmentsFor(authors);
    const authorNodes = authors.map((a: string) => {
      const segment = bylineSegments.get(a);
      if (!segment) return { "@type": "Person", "name": a };
      const url = `${CANONICAL_DOMAIN}/authors/${encodeURIComponent(segment)}`;
      return { "@type": "Person", "@id": `${url}#person`, "name": a, "url": url };
    });
    const singleAuthorSegment = authors.length === 1 ? bylineSegments.get(authors[0]) ?? null : null;

    const workNode: Record<string, unknown> = {
      // Essays are Articles. ScholarlyArticle is reserved for the separate
      // research-paper format at /papers/*.
      "@type": isPaper ? "ScholarlyArticle" : "Article",
      "@id": `${canonicalUrl}#${isPaper ? "scholarlyarticle" : "article"}`,
      "headline": headline,
      "name": headline,
      "description": plainDescription || undefined,
      "url": canonicalUrl,
      "mainEntityOfPage": { "@type": "WebPage", "@id": canonicalUrl },
      "inLanguage": "en",
      "isPartOf": { "@type": "Periodical", "@id": PERIODICAL_ID, "name": PERIODICAL_NAME },
      "publisher": publisherNode(),
      "author": authorNodes.length === 1 ? authorNodes[0] : authorNodes,
      "datePublished": isoPublished || undefined,
      "dateModified": isoUpdated || isoPublished || undefined,
      "image": [structuredImage],
      "articleSection": domainDisplayName || undefined,
      "keywords": topicTagsStr || undefined,
      "about": topicTags.length ? topicTags.map(name => ({ "@type": "Thing", "name": name })) : undefined,
      "citation": references.length ? referencesToCitations(references) : undefined,
    };

    if (isPaper && item.pdfUrl) {
      workNode.encoding = {
        "@type": "MediaObject",
        "contentUrl": safeUrl(item.pdfUrl),
        "encodingFormat": "application/pdf",
      };
    }
    if (isPaper && item.doi) {
      workNode.identifier = { "@type": "PropertyValue", "propertyID": "DOI", "value": item.doi };
    }

    const breadcrumbNode = {
      "@type": "BreadcrumbList",
      "@id": `${canonicalUrl}#breadcrumb`,
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": { "@type": "WebPage", "@id": `${CANONICAL_DOMAIN}/`, "name": "Home" } },
        {
          "@type": "ListItem",
          "position": 2,
          "name": isPaper ? "Papers" : "Journal",
          "item": {
            "@type": "WebPage",
            "@id": isPaper ? `${CANONICAL_DOMAIN}/papers` : `${CANONICAL_DOMAIN}/browse`,
            "name": isPaper ? "Papers" : "Journal",
          },
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": domainDisplayName,
          "item": { "@type": "WebPage", "@id": `${CANONICAL_DOMAIN}/domains/${item.categorySlug || "philosophy"}`, "name": domainDisplayName },
        },
        { "@type": "ListItem", "position": 4, "name": headline, "item": { "@type": "WebPage", "@id": canonicalUrl, "name": headline } },
      ],
    };

    const ogTags = `
    <!-- Dynamic Open Graph & Twitter Card Meta Tags -->
    <title>${titleHtml} — Ānvīkṣikī</title>
    <meta name="description" content="${cleanExcerpt}" />
    ${topicTagsStr ? `<meta name="keywords" content="${escapeHtml(topicTagsStr)}" />` : ""}
    ${topicTags.map(k => `<meta property="article:tag" content="${escapeHtml(k)}" />`).join("\n    ")}
    ${robotsDirective}
    ${scholarAuthorMeta}
    ${isoPublished ? `<meta property="article:published_time" content="${isoPublished}" />` : ""}
    ${isoUpdated ? `<meta property="article:modified_time" content="${isoUpdated}" />` : ""}
    ${domainDisplayName ? `<meta property="article:section" content="${escapeHtml(domainDisplayName)}" />` : ""}
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:locale" content="en_IN" />
    <meta property="og:title" content="${titleHtml}" />
    <meta property="og:description" content="${cleanExcerpt}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${cleanUrl}" />
    ${socialImageMetaTags(image, title)}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${titleHtml}" />
    <meta name="twitter:description" content="${cleanExcerpt}" />
    <link rel="canonical" href="${cleanUrl}" />
    ${jsonLdGraphScript([workNode, breadcrumbNode])}
    <!-- Google Scholar Highwire Metadata -->
    <meta name="citation_title" content="${escapeHtml(headline)}" />
    ${scholarCitationAuthorTags}
    ${formatScholarDate(item.publishedAt)}
    <meta name="citation_journal_title" content="Ānvīkṣikī: An Open Journal of Indic Philosophy &amp; Intellectual Traditions" />
    ${item.pdfUrl ? `<meta name="citation_pdf_url" content="${safeUrl(item.pdfUrl)}" />` : ""}
    <meta name="citation_abstract_html_url" content="${cleanUrl}" />
    ${item.doi ? `<meta name="citation_doi" content="${escapeHtml(item.doi)}" />` : ""}
    ${topicTagsStr ? `<meta name="citation_keywords" content="${escapeHtml(topicTagsStr)}" />` : ""}
    `;

    // The body as GET /api/articles/:slug and /api/papers/:slug return it:
    // legacy inline images restored (articles), then sanitised. The client
    // renders `body` from the initial data as HTML, so it must never carry the
    // raw stored value.
    const repairedBody = isPaper ? item.body : recoverLegacyInlineImages(item.slug, item.body);
    const publicItem = { ...item, body: repairedBody };
    // Related works, the domain hub (once it is indexed) and the archive close
    // the page, so every work links on to others.
    const reading = await loadContinueReading({ kind, id: item.id, categorySlug: item.categorySlug, topics: seo.topics }, req.log);
    const continueReadingHtml = reading
      ? renderContinueReading(reading.continueReading.related, reading.names, reading.continueReading.hub)
      : renderContinueReading([], new Map(), null);
    const ssrHtml = isPaper
      ? generatePaperSsrHtml(publicItem, domainDisplayName, bylineSegmentsFor((item.authorName || "Anonymous Scholar").split(/,\s*/)), seo, continueReadingHtml)
      : generateArticleSsrHtml(publicItem, domainDisplayName, singleAuthorSegment, seo, continueReadingHtml);

    const finalHtml = renderSsrDocument(
      ogTags,
      ssrHtml,
      // authorHandle: the canonical author segment, which the client uses for
      // its own byline links. seo: the effective title, description, topics
      // and references (lib/effective-seo.ts), so the client shows the same
      // head and sections without deriving them again.
      // continueReading: the related works and indexed hub shown under the text.
      { route: isPaper ? "paper" : "article", path: req.path, data: { ...item, body: sanitizeArticleBody(repairedBody), authorHandle: singleAuthorSegment, seo, continueReading: reading?.continueReading ?? null } },
      { showPapers: isPaper || (await hasPublishedPapers()) },
    );

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    // A draft is only rendered for a signed-in editor; it must never be cached
    // by the CDN and served to the next visitor. A page that is missing its
    // related works is not cached either, so the next request completes it.
    res.setHeader("Cache-Control", isDraft ? "private, no-store" : reading ? PUBLIC_HTML_CACHE_CONTROL : "no-store");
    res.status(200).send(finalHtml);
    return;
  } catch (err) {
    // A failed lookup is an outage, not a missing page: 503, never cached.
    req.log?.error({ err }, "Publication SSR error");
    sendUnavailable(req, res, err);
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
    // Exact handle, id or name slug only (lib/author-identity.ts). Other
    // spellings of a known author permanently redirect to the canonical URL;
    // anything else is a 404.
    const [users, hubWorks] = await Promise.all([loadAuthorUsers(), listAuthorHubWorks()]);
    const resolution = resolveAuthorRequest<AuthorHubArticle | AuthorHubPaper>(
      rawSlug,
      users,
      [...hubWorks.articles, ...hubWorks.papers],
    );
    if (resolution.kind === "redirect") {
      res.redirect(301, `/authors/${encodeURIComponent(resolution.segment)}`);
      return;
    }
    if (resolution.kind === "not-found") {
      send404(res, "author profile", rawSlug.trim());
      return;
    }

    const cleanSlug = resolution.segment;
    const user = resolution.user;
    const [profile, visibleCategories] = await Promise.all([
      user ? findAuthorProfile(user.id) : Promise.resolve(null),
      // Only the domain names; the page still renders without them.
      listVisibleCategories().catch(() => [] as Array<{ slug: string; name: string; description: string | null }>),
    ]);
    const categoryNames = new Map(visibleCategories.map((c) => [c.slug, c.name]));
    const canonicalPath = `/authors/${encodeURIComponent(cleanSlug)}`;
    const ownArticles = resolution.works.filter((w): w is AuthorHubArticle => w.kind === "article");
    const ownPapers = resolution.works.filter((w): w is AuthorHubPaper => w.kind === "paper");
    // Reads the bodies of this author's works only, and only when not cached.
    const [articleSeo, paperSeo] = await Promise.all([
      listingSeoFor("article", ownArticles),
      listingSeoFor("paper", ownPapers),
    ]);
    const authorArticles = ownArticles.map((w, i) => authorHubListing(w, canonicalPath, articleSeo[i]));
    const authorPapers = ownPapers.map((w, i) => authorHubListing(w, canonicalPath, paperSeo[i]));
    const allPapers = hubWorks.papers;

    const displayName = resolution.displayName;
    // The person's own bio, or nothing. No boilerplate "contributing scholar"
    // line and no invented expertise.
    const realBio = typeof profile?.bio === "string" && profile.bio.trim() ? profile.bio.trim() : null;
    const workCount = authorArticles.length + authorPapers.length;
    const hasPublishedWork = workCount > 0;
    // 120–160 characters of fact: how much, in which domains, which works
    // (lib/hub-content.ts); the person's own bio when it is long enough.
    const description = authorDescription(displayName, [...authorArticles, ...authorPapers], categoryNames, realBio);
    const authorData = {
      id: user?.id,
      name: displayName,
      handle: user?.handle || cleanSlug,
      bio: realBio,
      institution: profile?.institution || null,
      avatarUrl: profile?.avatarUrl || null,
      articleCount: authorArticles.length,
      paperCount: authorPapers.length,
      description,
    };

    const cleanName = escapeHtml(authorData.name);
    const cleanBio = escapeHtml(description);
    const canonicalUrl = buildCanonicalUrl(canonicalPath);
    const cleanUrl = escapeHtml(canonicalUrl);
    const image = authorData.avatarUrl ? socialImage(authorData.avatarUrl) : DEFAULT_SOCIAL_IMAGE;

    // Members who have not published anything get a working profile page, but
    // it is kept out of search results (and out of the sitemap).
    const robotsContent = hasPublishedWork ? "index, follow, max-image-preview:large" : "noindex, follow";
    if (!hasPublishedWork) {
      res.setHeader("X-Robots-Tag", "noindex, follow");
    }

    // The structured data describes what the page shows: the person (with
    // their own bio, affiliation and picture when the page shows them) and the
    // list of their published works.
    const personId = `${canonicalUrl}#person`;
    const personNode: Record<string, unknown> = {
      "@type": "Person",
      "@id": personId,
      "name": authorData.name,
      "url": canonicalUrl,
      "description": realBio || undefined,
      "worksFor": authorData.institution ? { "@type": "Organization", "name": authorData.institution } : undefined,
      "image": authorData.avatarUrl || undefined,
    };
    const listedWorks = [...authorArticles, ...authorPapers];
    const worksNode = {
      "@type": "ItemList",
      "@id": `${canonicalUrl}#works`,
      "name": `Published work by ${authorData.name}`,
      "itemListElement": listedWorks.map((work, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "url": `${CANONICAL_DOMAIN}${workPath(work)}`,
        "name": work.title,
      })),
    };
    const profilePageNode = {
      "@type": "ProfilePage",
      "@id": canonicalUrl,
      "url": canonicalUrl,
      "name": `${authorData.name} — Author Profile — Ānvīkṣikī`,
      "description": description,
      "inLanguage": "en",
      "isPartOf": { "@type": "WebSite", "@id": `${CANONICAL_DOMAIN}/#website` },
      "mainEntity": { "@id": personId },
      "breadcrumb": { "@id": `${canonicalUrl}#breadcrumb` },
    };
    const breadcrumbNode = breadcrumbListNode(canonicalUrl, [
      { name: "Home", url: `${CANONICAL_DOMAIN}/` },
      { name: "Authors", url: `${CANONICAL_DOMAIN}/browse` },
      { name: authorData.name, url: canonicalUrl },
    ]);

    const ogTags = `
    <!-- Dynamic Open Graph & Twitter Card Meta Tags for Author Hub -->
    <title>${cleanName} — Author Profile — Ānvīkṣikī</title>
    <meta name="description" content="${cleanBio}" />
    <meta name="robots" content="${robotsContent}" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:locale" content="en_IN" />
    <meta property="og:title" content="${cleanName} — Author Profile" />
    <meta property="og:description" content="${cleanBio}" />
    <meta property="og:type" content="profile" />
    <meta property="og:url" content="${cleanUrl}" />
    ${socialImageMetaTags(image, `${authorData.name} — Ānvīkṣikī`)}
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${cleanName} — Author Profile" />
    <meta name="twitter:description" content="${cleanBio}" />
    <link rel="canonical" href="${cleanUrl}" />
    ${jsonLdGraphScript(listedWorks.length > 0 ? [profilePageNode, personNode, breadcrumbNode, worksNode] : [profilePageNode, personNode, breadcrumbNode])}
    `;

    const ssrHtml = generateAuthorHubSsrHtml(authorData, authorArticles, authorPapers, categoryNames);
    const finalHtml = renderSsrDocument(
      ogTags,
      ssrHtml,
      // The client lists the same works (with their descriptions and topics)
      // before, or instead of, asking the API.
      { route: "author", path: req.path, data: { ...authorData, works: listedWorks, domains: visibleCategories.map((c) => ({ slug: c.slug, name: c.name })) } },
      { showPapers: allPapers.length > 0 },
    );

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", PUBLIC_HTML_CACHE_CONTROL);
    res.status(200).send(finalHtml);
    return;
  } catch (err) {
    // A failed lookup is an outage, not a missing page: 503, never cached.
    req.log?.error({ err }, "Author Hub SSR error");
    sendUnavailable(req, res, err);
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

    const category = await findCategory(cleanSlug);

    if (!category) {
      send404(res, "domain category", cleanSlug);
      return;
    }

    const [works, visible] = await Promise.all([listPublishedWorks(), listVisibleCategories()]);
    const domainArticles = works.articles.filter((a) => a.categorySlug === category.slug);
    const domainPapers = works.papers.filter((p) => p.categorySlug === category.slug);
    const domains = withWorkCounts(visible, works);

    const title = `${category.name} — Domain Archive — Ānvīkṣikī`;
    // 120–160 characters of fact: how much is published here, what the domain
    // covers and which works (lib/hub-content.ts).
    const description = domainHubDescription(category, [...domainArticles, ...domainPapers]);
    const cleanName = escapeHtml(category.name);
    const cleanDesc = escapeHtml(description);
    const canonicalUrl = buildCanonicalUrl(`/domains/${category.slug}`);
    const cleanUrl = escapeHtml(canonicalUrl);
    const image = DEFAULT_SOCIAL_IMAGE;

    // Thin hubs stay reachable but out of search results (and the sitemap)
    // until they hold MIN_WORKS_FOR_INDEXED_HUB published works.
    const indexableHub = domainArticles.length + domainPapers.length >= MIN_WORKS_FOR_INDEXED_HUB;
    const robotsContent = indexableHub ? "index, follow, max-image-preview:large" : "noindex, follow";
    if (!indexableHub) {
      res.setHeader("X-Robots-Tag", "noindex, follow");
    }

    // The list in the structured data is the list on the page, in its order.
    const listed = [...domainArticles, ...domainPapers];
    const domainCollectionNode = {
      "@type": "CollectionPage",
      "@id": canonicalUrl,
      "url": canonicalUrl,
      "name": title,
      "description": description,
      "inLanguage": "en",
      "isPartOf": { "@type": "WebSite", "@id": `${CANONICAL_DOMAIN}/#website` },
      "publisher": publisherNode(),
      "breadcrumb": { "@id": `${canonicalUrl}#breadcrumb` },
      "mainEntity": {
        "@type": "ItemList",
        "numberOfItems": listed.length,
        "itemListElement": listed.map((work, i) => ({
          "@type": "ListItem",
          "position": i + 1,
          "url": `${CANONICAL_DOMAIN}${workPath(work)}`,
          "name": work.title,
        })),
      },
    };
    const breadcrumbNode = breadcrumbListNode(canonicalUrl, [
      { name: "Home", url: `${CANONICAL_DOMAIN}/` },
      { name: "Domains", url: `${CANONICAL_DOMAIN}/domains` },
      { name: category.name, url: canonicalUrl },
    ]);

    const ogTags = `
    <!-- Dynamic Open Graph & Twitter Card Meta Tags for Domain Hub -->
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${cleanDesc}" />
    <meta name="robots" content="${robotsContent}" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:locale" content="en_IN" />
    <meta property="og:title" content="${cleanName} — Domain Archive" />
    <meta property="og:description" content="${cleanDesc}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${cleanUrl}" />
    ${socialImageMetaTags(image, `${category.name} — Ānvīkṣikī`)}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${cleanName} — Domain Archive" />
    <meta name="twitter:description" content="${cleanDesc}" />
    <link rel="canonical" href="${cleanUrl}" />
    ${jsonLdGraphScript([domainCollectionNode, breadcrumbNode])}
    `;

    const ssrHtml = generateDomainHubSsrHtml(category, domainArticles, domainPapers, domains);
    const finalHtml = renderSsrDocument(
      ogTags,
      ssrHtml,
      {
        route: "domain",
        path: req.path,
        data: {
          category: { slug: category.slug, name: category.name, description: category.description ?? null },
          articles: domainArticles,
          papers: domainPapers,
          description,
          domains,
        },
      },
      { showPapers: works.papers.length > 0 },
    );

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", PUBLIC_HTML_CACHE_CONTROL);
    res.status(200).send(finalHtml);
    return;
  } catch (err) {
    // A failed lookup is an outage, not a missing page: 503, never cached.
    req.log?.error({ err }, "Domain Hub SSR error");
    sendUnavailable(req, res, err);
    return;
  }
});

// Direct robots.txt route for search engines & crawlers. On Vercel the
// identical static public/robots.txt is served instead (see lib/robots.ts).
app.get("/robots.txt", (_req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  return res.status(200).send(ROBOTS_TXT);
});

// Legacy /profile/<id or @handle> URLs: 301 to the canonical author page, or
// 404 when there is no such account (never a redirect into a 404).
app.get(["/profile/:userId", "/profile/@:handle"], async (req, res) => {
  try {
    const rawParam = req.params.handle || req.params.userId || "";
    const rawId = (Array.isArray(rawParam) ? rawParam[0] : String(rawParam || "")).trim();
    const cleanHandle = rawId.replace(/^@/, "").toLowerCase();

    const [user] = rawId
      ? await db
        .select({ id: usersTable.id, handle: usersTable.handle })
        .from(usersTable)
        .where(
          and(
            or(eq(usersTable.id, rawId), eq(usersTable.handle, cleanHandle), eq(usersTable.handle, rawId)),
            isNull(usersTable.deletionRequestedAt),
          ),
        )
        .limit(1)
      : [];

    if (!user) {
      send404(res, "author profile", rawId);
      return;
    }
    return res.redirect(301, `/authors/${encodeURIComponent(user.handle || user.id)}`);
  } catch (err) {
    // A failed lookup is an outage, not a missing page: 503, never cached.
    req.log?.error({ err }, "Profile redirect error");
    sendUnavailable(req, res, err);
    return;
  }
});

// Everything no route above answered. Client-only SPA routes were already
// served by the shell middleware near the top, so a page URL that reaches this
// point does not exist: a real 404 (with the app shell, so the client can show
// its own not-found screen) instead of a 200 soft 404. Missing files get a
// plain 404 rather than an HTML page, and unknown API paths a JSON one.
app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  if (req.path === "/api" || req.path.startsWith("/api/")) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(404).json({ error: "Not found" });
  }
  if (looksLikeFile(req.path)) {
    res.setHeader("X-Robots-Tag", "noindex");
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(404).send("Not found");
  }
  return send404(res, "page", req.path);
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

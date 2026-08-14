import express, { type ErrorRequestHandler, type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { rateLimit } from "express-rate-limit";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";
import { syncPublishedSubmissions, ensureDefaultCategories } from "./lib/publication-sync";
import { UPLOADS_DIR } from "./routes/submissions";
import healthRouter from "./routes/health";
import { db, articlesTable, papersTable } from "@workspace/db";
import { eq, and, or, ilike, isNull } from "drizzle-orm";

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
  if (!isUploadOrStatic) {
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

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
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

let categoriesInitialization: Promise<unknown> | null = null;

app.use(async (req, res, next) => {
  categoriesInitialization ||= ensureDefaultCategories();
  try {
    await categoriesInitialization;
    next();
  } catch (err) {
    categoriesInitialization = null;
    req.log.error({ err }, "Failed to initialize default categories");
    res.status(500).json({
      error: "The publication database could not be initialized. Please try again.",
    });
  }
});

// Reconcile only explicitly published submissions; review-stage content never
// becomes public.
if (process.env.DATABASE_URL) {
  setTimeout(() => {
    syncPublishedSubmissions()
      .then(summary => logger.info({ summary }, "Published submissions sync completed"))
      .catch(err => logger.warn({ err }, "Failed to sync published submissions"));
  }, 1000);
}

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

const publicWriteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => SAFE_METHODS.has(req.method),
  message: { error: "Too many requests from this address. Please try again later." },
});

for (const route of [
  "/api/contact",
  "/api/newsletter",
  "/api/submissions",
  "/api/articles",
  "/api/extract-url",
  "/api/media",
  "/api/uploads",
]) {
  app.use(route, publicWriteLimiter);
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

import fs from "fs";

// OpenGraph SSR Meta Tags handler for Social Link Previews (WhatsApp, Instagram, X/Twitter, iMessage, Facebook, LinkedIn, Telegram)
app.get(["/articles/:slug", "/essays/:slug", "/papers/:slug"], async (req, res, next) => {
  try {
    const rawSlug = String(req.params.slug || "");
    const cleanSlug = rawSlug.replace(/-[a-f0-9]{4,8}$/, "");
    const isPaper = req.path.startsWith("/papers");

    let title = "Ānvīkṣikī Journal & Research Platform";
    let excerpt = "Anvikshiki is an open journal & research platform across Indic philosophy, history, science, and civilizational thought.";
    let imageUrl = "";
    let canonicalUrl = `https://anvikshikijournal.in${req.path}`;

    if (isPaper) {
      const [paper] = await db
        .select()
        .from(papersTable)
        .where(and(
          or(eq(papersTable.slug, rawSlug), eq(papersTable.slug, cleanSlug), ilike(papersTable.slug, `${cleanSlug}%`)),
          eq(papersTable.status, "PUBLISHED"),
          isNull(papersTable.deletedAt),
        ))
        .limit(1);

      if (paper) {
        title = paper.title;
        excerpt = paper.abstract || paper.title;
        imageUrl = paper.coverImageUrl || "";
        canonicalUrl = `https://anvikshikijournal.in/papers/${paper.slug}`;
      }
    } else {
      const [article] = await db
        .select()
        .from(articlesTable)
        .where(and(
          or(eq(articlesTable.slug, rawSlug), eq(articlesTable.slug, cleanSlug), ilike(articlesTable.slug, `${cleanSlug}%`)),
          eq(articlesTable.status, "PUBLISHED"),
          isNull(articlesTable.deletedAt),
        ))
        .limit(1);

      if (article) {
        title = article.title;
        excerpt = article.excerpt || article.subtitle || article.title;
        imageUrl = article.heroImageUrl || "";
        canonicalUrl = `https://anvikshikijournal.in/articles/${article.slug}`;
      }
    }

    // Resolve relative image URLs to absolute HTTPS URLs for social crawlers
    if (imageUrl && imageUrl.startsWith("/")) {
      imageUrl = `https://anvikshikijournal.in${imageUrl}`;
    }

    function escapeHtml(str: string) {
      return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    const cleanTitle = escapeHtml(title);
    const cleanExcerpt = escapeHtml(excerpt.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 260));
    const cleanUrl = escapeHtml(canonicalUrl);
    const cleanImage = imageUrl ? escapeHtml(imageUrl) : "https://anvikshikijournal.in/favicon.png";

    const ogTags = `
    <!-- Dynamic Open Graph & Twitter Card Meta Tags -->
    <title>${cleanTitle} — Ānvīkṣikī</title>
    <meta name="description" content="${cleanExcerpt}" />
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
    `;

    // Try reading index.html from dist
    const possiblePaths = [
      path.join(process.cwd(), "artifacts", "anvikshiki", "dist", "public", "index.html"),
      path.join(process.cwd(), "dist", "public", "index.html"),
      path.join(__dirname, "..", "..", "anvikshiki", "dist", "public", "index.html"),
      path.join(process.cwd(), "artifacts", "anvikshiki", "index.html"),
    ];

    let htmlTemplate = "";
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        htmlTemplate = fs.readFileSync(p, "utf-8");
        break;
      }
    }

    if (htmlTemplate) {
      // Inject Open Graph tags into existing index.html
      const injectedHtml = htmlTemplate
        .replace(/<title>.*?<\/title>/i, "")
        .replace(/<meta property="og:.*?".*?>/gi, "")
        .replace(/<meta name="twitter:.*?".*?>/gi, "")
        .replace("</head>", `${ogTags}\n</head>`);

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
      res.status(200).send(injectedHtml);
      return;
    }

    // Fallback HTML if index.html template file is unavailable
    const fallbackHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${ogTags}
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <script src="/theme-init.js"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
    res.status(200).send(fallbackHtml);
    return;
  } catch (err) {
    next();
  }
});

const errorHandler: ErrorRequestHandler = (err: unknown, req, res, _next) => {
  const malformedJson = err instanceof SyntaxError &&
    typeof err === "object" && err !== null && "body" in err;
  if (malformedJson) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  req.log?.error({ err }, "Unhandled request error");
  return res.status(500).json({ error: "Request failed" });
};

app.use(errorHandler);

export default app;

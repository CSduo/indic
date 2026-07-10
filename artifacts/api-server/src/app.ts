import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { rateLimit } from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";
import { syncPublishedSubmissions, ensureDefaultCategories } from "./lib/publication-sync";
import { UPLOADS_DIR } from "./routes/submissions";
import path from "path";

const app: Express = express();

// Trust the Replit reverse proxy so express-rate-limit reads the correct client IP
app.set("trust proxy", 1);

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
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Ensure req.log always exists (fallback to console in serverless environments)
app.use((req, res, next) => {
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

// CORS — allow all origins in development
const allowedOrigin = process.env.FRONTEND_URL || true;
app.use(cors({
  origin: allowedOrigin,
  credentials: true,
}));

// Body parsers with size limits
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());

// Validate database configuration
app.use((req, res, next) => {
  if (!process.env.DATABASE_URL) {
    res.status(503).json({
      error: "DATABASE_URL environment variable is missing on the server. Add DATABASE_URL in Vercel Environment Variables and redeploy."
    });
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

// Run the full backup sync in the background asynchronously so it doesn't block request initialization
if (process.env.DATABASE_URL) {
  setTimeout(() => {
    syncPublishedSubmissions()
      .then((summary) => {
        logger.info({ summary }, "Background published submissions sync completed");
      })
      .catch((err) => {
        logger.warn({ err }, "Failed to run background published submissions sync");
      });
  }, 1000);
}

// Rate limiting on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

app.use("/api/auth", authLimiter);
app.use("/api/admin/login", authLimiter);

// Static file serving for uploads
app.use("/api/uploads", express.static(UPLOADS_DIR, {
  setHeaders(res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".pdf") res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
  },
}));

app.use("/api", router);

export default app;

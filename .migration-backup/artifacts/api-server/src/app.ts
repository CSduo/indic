import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { rateLimit } from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";
import { UPLOADS_DIR } from "./routes/submissions";
import path from "path";

const app: Express = express();

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

// CORS — restrict to FRONTEND_URL in production
const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(cors({
  origin: allowedOrigin,
  credentials: true,
}));

// Body parsers with size limits
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());

// Rate limiting on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
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

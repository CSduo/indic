// Vercel deployment cache buster: 2026-07-04T16:52:00Z
import app from "../artifacts/api-server/src/app";

declare global {
  namespace Express {
    interface Request {
      log?: any;
    }
  }
}

export default app;

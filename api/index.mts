import app from "../artifacts/api-server/src/app";

declare global {
  namespace Express {
    interface Request {
      log?: any;
    }
  }
}

export default app;

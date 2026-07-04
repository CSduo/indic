// Vercel serverless entry point.
// Imports the pre-built ESM bundle produced by `pnpm --filter @workspace/api-server run build:vercel`.
// This avoids Vercel having to resolve raw TypeScript through the monorepo at runtime,
// which was causing the "exports is not defined in ES module scope" crash.
import app from "../artifacts/api-server/dist/vercel-handler.mjs";

export default app;

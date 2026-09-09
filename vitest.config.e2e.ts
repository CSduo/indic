import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  root: path.resolve(__dirname, "."),
  test: {
    include: ["test/e2e-seo/**/*.test.ts"],
    setupFiles: [path.resolve(__dirname, "test/e2e-seo/helpers/setup.ts")],
    environment: "node",
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      "supertest": path.resolve(__dirname, "artifacts/api-server/node_modules/supertest"),
      "@workspace/db": path.resolve(__dirname, "lib/db/src/index.ts"),
    },
  },
});

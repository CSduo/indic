import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT || "5173";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split pdfjs into its own chunk (it's inherently large)
          if (id.includes("pdfjs-dist")) return "pdf";
          // Split mammoth (docx parser) into its own chunk
          if (id.includes("mammoth")) return "mammoth";
          // Group recharts with its d3 dependencies
          if (id.includes("recharts") || id.includes("d3-") || id.includes("victory-vendor")) return "charts";
          // Group all Radix UI primitives together
          if (id.includes("@radix-ui")) return "radix";
          // Group framer-motion
          if (id.includes("framer-motion")) return "animation";
          // Core React runtime
          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("scheduler")) return "react-core";
          // Everything else from node_modules is general vendor
          if (id.includes("node_modules")) return "vendor";
        },
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET || "http://localhost:5000",
        changeOrigin: true
      }
    },
    fs: {
      strict: false,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});

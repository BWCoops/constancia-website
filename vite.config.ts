import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Note: We deliberately do NOT load @replit/vite-plugin-runtime-error-modal.
// That plugin renders a modal overlay for EVERY uncaught error including
// transient third-party script failures (Clerk's CDN, etc). Real errors
// still log to the browser console; this just stops the modal from
// hijacking the dev preview when a non-fatal failure happens.

export default defineConfig({
  plugins: [
    react(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
    // Force every "react" / "react-dom" import — including the ones
    // dragged in by transitive deps like @clerk/clerk-react — to
    // resolve to the SAME copy at the project root. Without this,
    // Vite's pre-bundle (node_modules/.vite/deps) can end up with a
    // second React instance bundled inside Clerk; the app instance
    // and the Clerk instance then disagree on the dispatcher and
    // every hook call throws "Cannot read properties of null". The
    // symptom is hooks blowing up only after Clerk loads, and it
    // "fixes itself" if you nuke node_modules/.vite — that cache is
    // the actual culprit. Dedupe + optimizeDeps.include keep the
    // resolution stable across cache rebuilds.
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "@clerk/clerk-react",
    ],
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    cssCodeSplit: false,
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("framer-motion")) return "motion";
            if (id.includes("lucide-react")) return "icons";
            if (id.includes("@radix-ui")) return "radix";
            if (id.includes("@tanstack")) return "query";
            if (id.includes("recharts") || id.includes("d3-")) return "charts";
            if (id.includes("@anthropic-ai") || id.includes("openai")) return "ai-sdk";
          }
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    // Disable Vite's built-in HMR error overlay too. Some plugins surface
    // errors via console.error which Vite's overlay catches even when the
    // page is otherwise fine — kills the "Failed to load Clerk" modal that
    // kept reappearing. Real errors still print to the browser console.
    hmr: {
      overlay: false,
    },
  },
});

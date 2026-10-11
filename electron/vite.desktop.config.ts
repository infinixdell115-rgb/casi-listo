import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

/** Standalone SPA build used inside the Electron desktop app. */
export default defineConfig({
  root: path.resolve(import.meta.dirname, "renderer"),
  base: "./",
  envDir: path.resolve(import.meta.dirname, ".."),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "..", "src") },
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "..", "desktop-dist"),
    emptyOutDir: true,
    target: "chrome100",
  },
});

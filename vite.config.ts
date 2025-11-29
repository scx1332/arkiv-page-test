import { defineConfig } from "vite";

export default defineConfig({
  base: "/arkiv-page-test/static/",
  optimizeDeps: {
    exclude: ["brotli-wasm", "brotli-wasm/pkg.bundler/brotli_wasm_bg.wasm"],
  },
});

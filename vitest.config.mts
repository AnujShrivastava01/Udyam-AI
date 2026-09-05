import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Vitest needs the same `@/*` → `src/*` alias that tsconfig gives the app, otherwise tests can
 * only use relative imports and quietly diverge from how the app actually resolves modules.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});

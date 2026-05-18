import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@lensui/core": resolve(root, "packages/core/src/index.ts")
    }
  },
  test: {
    include: ["packages/**/*.test.ts"],
    exclude: ["packages/*/dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "coverage",
      include: ["packages/*/src/**/*.ts"],
      exclude: [
        "packages/*/src/**/*.test.ts",
        "packages/*/src/**/*.d.ts",
        "packages/*/dist/**"
      ],
      thresholds: {
        statements: 45,
        branches: 40,
        functions: 50,
        lines: 46
      }
    }
  }
});

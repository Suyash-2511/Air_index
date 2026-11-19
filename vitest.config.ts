import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 75,
      },
      exclude: [
        "node_modules/**",
        ".next/**",
        "tests/**",
        "**/*.module.css",
        "**/*.d.ts",
        "next.config.ts",
        "src/components/scene/earth/**",
      ],
    },
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});

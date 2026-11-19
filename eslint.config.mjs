import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: [".next/**", "node_modules/**", "coverage/**", "next-env.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/ban-ts-comment": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "max-lines": ["error", { max: 180, skipBlankLines: true, skipComments: true }],
      eqeqeq: ["error", "always"],
      "no-console": ["error", { allow: ["warn", "error"] }],
      // Size limits: a function that fits on one screen and branches rarely is one a reader can hold in their head.
      complexity: ["error", 10],
      "max-lines-per-function": ["error", { max: 60, skipBlankLines: true, skipComments: true }],
      "max-depth": ["error", 3],
      "max-params": ["error", 4],
    },
  },
  {
    // Test files group many cases inside one describe callback, so function length is not a signal there.
    files: ["tests/**"],
    rules: {
      "max-lines-per-function": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
);

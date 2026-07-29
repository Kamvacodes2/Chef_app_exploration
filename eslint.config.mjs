import js from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * Root ESLint configuration.
 *
 * Covers the platform code that Next.js's config cannot: `apps/api`,
 * `apps/worker`, `packages/*`, the root test suites and the root scripts.
 * `apps/web` keeps its own `eslint-config-next` setup and is linted separately
 * by `pnpm --filter @chefmate/web lint`.
 */
export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "apps/web/**",
      ".agents/**",
      ".claude/**",
      ".codex/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: { ecmaVersion: 2023, sourceType: "module" },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      // Secrets must never reach stdout by accident; use the structured logger.
      "no-console": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
    },
  },
  {
    // Root scripts and configs are CLIs/tooling: stdout is their job.
    files: ["scripts/**/*.{ts,mjs}", "**/*.config.{ts,mjs}", "vitest.shared.mjs"],
    rules: { "no-console": "off", "@typescript-eslint/ban-ts-comment": "off" },
  },
  {
    // Plain ESM helpers: `no-undef` duplicates what the module system already
    // guarantees and does not know about web/Node globals here.
    files: ["**/*.mjs"],
    rules: { "no-undef": "off" },
  },
);

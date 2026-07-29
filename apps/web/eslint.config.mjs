import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".agents/**",
      ".claude/**",
      ".codex/**",
      ".next/**",
      "coverage/**",
      "next-env.d.ts",
      "playwright-report/**",
      "test-results/**",
      "tests/e2e/**",
    ],
  },
];

export default eslintConfig;

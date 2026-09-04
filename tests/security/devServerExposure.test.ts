import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Non-exposure of test/dev servers (blueprint section 19.2).
 *
 * The development-only advisory exceptions in
 * `tests/security/dev-dependency-exceptions.json` all rest on one factual
 * claim: this repository never starts a Vitest UI server, never starts a Vite
 * dev server, and never binds a test-driven server to a public interface. That
 * claim is asserted here rather than eyeballed, because if it ever stops being
 * true the exceptions stop being justified and become live exposure.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const MANIFESTS = [
  "package.json",
  "apps/web/package.json",
  "apps/api/package.json",
  "apps/worker/package.json",
  "packages/application/package.json",
  "packages/config/package.json",
  "packages/contracts/package.json",
  "packages/database/package.json",
  "packages/domain/package.json",
  "packages/integrations/package.json",
  "packages/observability/package.json",
  "packages/testkit/package.json",
];

/** Root scripts used by the isolated CI test workflows. */
const CI_TEST_SCRIPTS = [
  "test:unit",
  "test:contract",
  "test:db",
  "test:integration",
  "test:security",
  "test:ci:security",
  "test:ci:dependency-audit",
  "test:coverage",
];

const CI_WORKFLOW_FILES = [
  ".github/workflows/quality.yml",
  ".github/workflows/security.yml",
  ".github/workflows/dependency-audit.yml",
  ".github/workflows/coverage.yml",
  ".github/workflows/build.yml",
  ".github/workflows/playwright.yml",
  ".github/workflows/a11y.yml",
] as const;

interface Manifest {
  readonly scripts?: Record<string, string>;
}

const readText = (file: string): string => readFileSync(path.join(repoRoot, file), "utf8");

const readManifest = (file: string): Manifest => JSON.parse(readText(file)) as Manifest;

const scriptsOf = (file: string): readonly [string, string][] =>
  Object.entries(readManifest(file).scripts ?? {});

/** Every script body across the workspace that invokes vitest. */
const vitestInvocations = (): readonly { file: string; name: string; body: string }[] =>
  MANIFESTS.flatMap((file) =>
    scriptsOf(file)
      .filter(([, body]) => /(^|[\s&|])vitest(\s|$)/.test(body))
      .map(([name, body]) => ({ file, name, body })),
  );

describe("no Vitest UI or API server is ever started", () => {
  it("finds vitest invocations to check (a check over nothing is not a pass)", () => {
    expect(vitestInvocations().length).toBeGreaterThan(0);
  });

  it("no workspace script passes --ui or --api to vitest", () => {
    const offenders = vitestInvocations()
      .filter(({ body }) => /--ui\b|--api\b|--browser\b/.test(body))
      .map(({ file, name }) => `${file}#${name}`);
    expect(offenders).toEqual([]);
  });

  it("every vitest script the CI pipeline runs is single-shot `vitest run`", () => {
    const offenders = CI_TEST_SCRIPTS.flatMap((name) => {
      const body = readManifest("package.json").scripts?.[name];
      if (body === undefined) {
        return [`package.json#${name} is missing`];
      }
      const invocations = body.match(/vitest[^&|]*/g) ?? [];
      return invocations
        .filter((invocation) => !invocation.startsWith("vitest run"))
        .map((invocation) => `package.json#${name}: ${invocation.trim()}`);
    });
    expect(offenders).toEqual([]);
  });

  it("the web package's vitest scripts are `vitest run` except the local watch script", () => {
    const scripts = readManifest("apps/web/package.json").scripts ?? {};
    const offenders = Object.entries(scripts)
      .filter(([name, body]) => /(^|[\s&|])vitest(\s|$)/.test(body) && name !== "test:watch")
      .filter(([, body]) => !body.startsWith("vitest run"))
      .map(([name]) => name);
    expect(offenders).toEqual([]);
    // Watch mode is a developer convenience and must stay out of the CI
    // pipeline; it is also plain watch mode, with no UI or API server.
    expect(scripts["test:watch"]).toBe("vitest");
    expect(CI_TEST_SCRIPTS.some((name) => name === "test:watch")).toBe(false);
  });

  it("no vitest config opens an API/UI server or binds a host", () => {
    const configs = [
      "vitest.shared.mjs",
      "vitest.unit.config.ts",
      "vitest.contract.config.ts",
      "vitest.db.config.ts",
      "vitest.integration.config.ts",
      "vitest.security.config.ts",
      "vitest.coverage.config.ts",
      "apps/web/vitest.config.ts",
    ];
    const offenders = configs.filter((file) =>
      /\b(api|ui)\s*:|server\s*:\s*\{[^}]*host|host\s*:/.test(readText(file)),
    );
    expect(offenders).toEqual([]);
  });

  it("CI runs each targeted gate and never a bare vitest command", () => {
    const workflows = CI_WORKFLOW_FILES.map(readText).join("\n");
    expect(workflows).toContain("pnpm test:ci:quality");
    expect(workflows).toContain("pnpm test:ci:security");
    expect(workflows).toContain("pnpm test:ci:dependency-audit");
    expect(workflows).toContain("pnpm test:ci:coverage");
    expect(workflows).toContain("pnpm test:ci:build");
    expect(workflows).toContain("pnpm test:ci:playwright");
    expect(workflows).toContain("pnpm test:ci:a11y");
    expect(workflows).not.toMatch(/run:\s*pnpm test:ci\s*$/m);
    expect(/run:\s*.*vitest/.test(workflows)).toBe(false);
    expect(workflows).not.toContain("--ui");
  });
});

describe("the Playwright web server is loopback-only", () => {
  const config = (): string => readText("apps/web/playwright.config.ts");

  it("binds the server to 127.0.0.1 and addresses it over loopback", () => {
    const text = config();
    expect(text).toContain("-H 127.0.0.1");
    expect(text).toContain('url: "http://localhost:3100"');
    expect(text).toContain('baseURL: "http://localhost:3100"');
  });

  it("never binds a wildcard interface", () => {
    const text = config();
    for (const wildcard of ["0.0.0.0", "::", "--host 0", "-H 0.0.0.0"]) {
      expect(text.includes(wildcard)).toBe(false);
    }
  });

  it("serves the production Next build, not a Vite or Next dev server", () => {
    const text = config();
    expect(text).toContain("pnpm build && pnpm start");
    expect(text).not.toContain("next dev");
    expect(text).not.toContain("vite");
  });
});

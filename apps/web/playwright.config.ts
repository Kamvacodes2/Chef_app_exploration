import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for the web application.
 *
 * Three projects share one server:
 * - `chromium` and `mobile-safari` run the journey specs in `tests/e2e`
 *   (`pnpm test:e2e`);
 * - `a11y` runs the axe-core sweep in `tests/a11y` (`pnpm test:a11y`).
 *
 * One config means one build and one server start for both commands, and it
 * keeps the E2E project list identical to the pre-monorepo baseline so the 14
 * executions stay exactly 14.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: process.env.CI === undefined ? "list" : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
    // Failure artifacts for CI upload (blueprint section 19.2).
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    // `-H 127.0.0.1` keeps the server loopback-only: `next start` otherwise
    // binds every interface, which would expose a test server on CI runners and
    // developer networks (asserted by tests/security/devServerExposure.test.ts).
    command: "pnpm build && pnpm start -H 127.0.0.1 -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 13"] } },
    {
      name: "a11y",
      testDir: "./tests/a11y",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

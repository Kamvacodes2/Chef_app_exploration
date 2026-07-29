import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Automated accessibility sweep (blueprint acceptance `A23`, WCAG 2.2 AA).
 *
 * S02 is a mechanical relocation of the web application: it is not permitted to
 * change the UI, so it cannot fix the accessibility defects this sweep found.
 * Instead the suite **characterises** them, exactly as S01 characterised the
 * legacy HTTP contracts.
 *
 * The gate is a ratchet, not a mute button:
 *
 * - any violation that is not in {@link KNOWN_VIOLATIONS} fails the run;
 * - a known violation that no longer reproduces **also** fails the run, with an
 *   instruction to delete the entry.
 *
 * So the baseline can only shrink, and it can never quietly rot into a blanket
 * exemption. Each entry names the step that owns the fix.
 */

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

interface KnownViolation {
  readonly page: string;
  readonly ruleId: string;
  /** Why it is not fixed here, and who owns it. */
  readonly reason: string;
}

const KNOWN_VIOLATIONS: readonly KnownViolation[] = [
  {
    page: "/",
    ruleId: "target-size",
    reason:
      "Pre-existing: the hero carousel dot indicators are 12px wide, below the WCAG 2.2 24px " +
      "touch-target minimum. Fixing it changes the landing UI, which S02 (a mechanical move) " +
      "must not do. Owned by the step that next revises the landing hero.",
  },
  {
    page: "/login",
    ruleId: "color-contrast",
    reason:
      "Pre-existing: an uppercase label on the sign-in form does not meet the 4.5:1 contrast " +
      "ratio. Fixing it is a visual change to the auth UI, which S03 owns.",
  },
];

function knownFor(page: string): Set<string> {
  return new Set(
    KNOWN_VIOLATIONS.filter((entry) => entry.page === page).map((entry) => entry.ruleId),
  );
}

async function analyse(page: Page, selector?: string) {
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  if (selector !== undefined) {
    builder = builder.include(selector);
  }
  return builder.analyze();
}

type Violations = Awaited<ReturnType<typeof analyse>>["violations"];

function describe(violations: Violations): string {
  return violations
    .map(
      (violation) =>
        `${violation.id} (${violation.impact ?? "unknown"}): ${violation.help}\n    ${violation.nodes
          .map((node) => node.target.join(" "))
          .join("\n    ")}`,
    )
    .join("\n");
}

/**
 * Asserts the ratchet for one route: no unknown violations, and no stale
 * baseline entries.
 */
function assertAgainstBaseline(route: string, violations: Violations): void {
  const known = knownFor(route);

  const unexpected = violations.filter((violation) => !known.has(violation.id));
  expect(describe(unexpected), `unexpected accessibility violations on ${route}`).toBe("");

  const seen = new Set(violations.map((violation) => violation.id));
  const stale = [...known].filter((ruleId) => !seen.has(ruleId));
  expect(
    stale,
    `${route}: these baselined violations no longer reproduce. Delete them from KNOWN_VIOLATIONS.`,
  ).toEqual([]);
}

test.describe("landing page", () => {
  test("has no accessibility violation outside the recorded baseline", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    assertAgainstBaseline("/", (await analyse(page)).violations);
  });

  test("exposes exactly one top-level heading and a main landmark", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test("declares a document language", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", /\w/);
  });

  test("gives every image an alt attribute", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    expect(await page.locator("img:not([alt])").count()).toBe(0);
  });
});

test.describe("order flow", () => {
  test("the interactive order section has no violations once opened", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // The order flow renders inside the landing page rather than on its own
    // route, so it is asserted as a scoped region.
    const order = page.locator("#order-flow").first();
    await expect(order).toHaveCount(1);

    await order.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    assertAgainstBaseline("#order-flow", (await analyse(page, "#order-flow")).violations);
  });
});

test.describe("login page", () => {
  test("has no accessibility violation outside the recorded baseline", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    assertAgainstBaseline("/login", (await analyse(page)).violations);
  });

  test("labels every form control", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withRules(["label", "form-field-multiple-labels", "select-name"])
      .analyze();
    expect(describe(results.violations)).toBe("");
  });

  test("keeps focus visible when tabbing through the form", async ({ page }) => {
    await page.goto("/login");
    await page.keyboard.press("Tab");

    const focused = await page.evaluate(() => document.activeElement?.tagName ?? "NONE");
    expect(focused).not.toBe("BODY");
    expect(focused).not.toBe("NONE");
  });
});

test.describe("the baseline itself", () => {
  test("documents an owner for every exemption", () => {
    for (const entry of KNOWN_VIOLATIONS) {
      expect(entry.reason.length, `${entry.page} ${entry.ruleId}`).toBeGreaterThan(40);
      expect(entry.reason).toMatch(/S\d{2}|owned by/i);
    }
  });
});

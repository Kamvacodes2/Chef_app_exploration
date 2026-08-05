import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MealSection } from "@/features/meal-browser/MealSection";
import type { BrowserMeal } from "@/features/meal-browser/api/mealCatalogClient";

function meal(slug: string, name: string): BrowserMeal {
  return {
    slug,
    menuId: null,
    categorySlug: "everyday-classics",
    categoryName: "Everyday Classics",
    name,
    description: "A South African home supper.",
    serves: "4-6",
    servesMin: 4,
    servesMax: 6,
    sessionFit: null,
    ingredients: null,
    recipeGuidelines: null,
    recommendedSides: null,
    optionalSides: null,
    chefNote: null,
    measurementNote: null,
    image: { src: `/images/meals/catalog/${slug}.webp`, alt: name, width: 736, height: 1030 },
    paletteId: "persimmon",
    goalTags: [],
    isHot: true,
    hasCutlery: false,
    isSignature: false,
    sortOrder: 1,
    isActive: true,
    isFeatured: false,
    featuredOrder: null,
    nutritionProfiles: [],
  } as BrowserMeal;
}

/**
 * IMPORTANT -- what this test can and cannot prove.
 *
 * Tailwind emits no CSS in jsdom and jsdom does not evaluate media queries, so
 * these assertions can only check WHICH utility classes are present. They
 * CANNOT verify the real CSS cascade. An earlier version of this file asserted
 * the presence of an arbitrary-variant class string for the 1440px tier and
 * passed green while the app was visibly broken: at >=1440px both
 * `md:grid-cols-3` and the 1440px rule matched, they had identical
 * specificity, and Tailwind emitted the 1440px rule BEFORE `md:grid-cols-3`,
 * so `md` won the cascade and pinned every wide desktop to 3 columns.
 *
 * The real proof is a computed-style check in a browser:
 *   getComputedStyle(grid).gridTemplateColumns
 * read at 1024 / 1280 / 1440 / 1920px. This repo has no visual-regression or
 * computed-style harness wired into vitest, so that verification lives in a
 * real browser (Playwright) rather than here. This class of correctness
 * genuinely cannot be verified in jsdom -- that is a limitation, not an
 * oversight.
 *
 * What these tests therefore guard is the two things they can, both of which
 * were individually enough to cause the bug:
 *   1. The wide tier uses a NAMED breakpoint (`wide:`), not an arbitrary
 *      `min-[...]:` variant. Tailwind groups arbitrary variants into a block
 *      emitted before the named-breakpoint blocks.
 *   2. `--breakpoint-wide` is declared in `rem`, matching the units of
 *      Tailwind's own defaults (md is 48rem). Tailwind orders breakpoint
 *      variants by comparing values and cannot compare px against rem, so
 *      declaring it as `1440px` also emitted `wide` before `md`.
 *
 * Column tiers, inside the order flow's `max-w-6xl` (1152px) shell with
 * `md:gap-4` (16px) gutters and the section's `sm:px-6` (24px) padding:
 *   1024px viewport -> 3 cols, (1024 - 48 - 32) / 3   = ~314.7px per card
 *   1280px viewport -> 3 cols, (1152 - 32) / 3        = ~373.3px per card
 *   1440px viewport -> 4 cols, (1152 - 48) / 4        = 276px per card
 *   1920px viewport -> 4 cols, (1152 - 48) / 4        = 276px per card
 */
describe("MealSection desktop column tiers", () => {
  function renderSection() {
    render(
      <MealSection
        title="Everyday Classics"
        slug="everyday-classics"
        meals={[meal("wors-pap-chakalaka", "Wors, Pap and Chakalaka")]}
        selectedSlug={null}
        onOpenDetail={vi.fn()}
        onSelect={vi.fn()}
      />,
    );
    return screen.getByTestId("meal-grid-everyday-classics");
  }

  it("promotes to three columns from the md tier (768px)", () => {
    expect(renderSection()).toHaveClass("md:grid-cols-3");
  });

  it("promotes to four columns only at the 1440px wide tier", () => {
    expect(renderSection()).toHaveClass("wide:grid-cols-4");
  });

  it("never uses the lg (1024px) or xl (1280px) tier for four columns", () => {
    const grid = renderSection();
    expect(grid.className).not.toContain("lg:grid-cols-4");
    expect(grid.className).not.toContain("xl:grid-cols-4");
    expect(grid.className).not.toContain("2xl:grid-cols-4");
  });

  /**
   * Regression guard for the cascade bug described in the file header. An
   * arbitrary variant carries no ordering guarantee against `md:`, so the wide
   * tier must never be expressed that way -- only as the named `wide:`
   * breakpoint.
   */
  it("expresses the wide tier as a named breakpoint, not an arbitrary variant", () => {
    expect(renderSection().className).not.toMatch(/min-\[\d+px\]:grid-cols-/);
  });

  /**
   * The `wide` breakpoint must actually exist in the Tailwind theme, otherwise
   * `wide:grid-cols-4` compiles to nothing at all and the grid silently stays
   * at 3 columns forever -- a failure mode the class-name assertions above
   * cannot see.
   *
   * It must also be declared in `rem` (90rem === 1440px). A `px` value is not
   * order-comparable against Tailwind's rem-based defaults and puts the `wide`
   * rules before `md`, which is exactly how this bug was reintroduced once.
   */
  it("declares the wide breakpoint as 90rem (1440px) in the Tailwind theme", async () => {
    // vitest's root is `apps/web` (see vitest.config.ts).
    const css = await readFile(resolve(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toMatch(/--breakpoint-wide:\s*90rem\s*;/);
    expect(css).not.toMatch(/--breakpoint-wide:\s*\d+px/);
  });
});

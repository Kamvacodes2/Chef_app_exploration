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
 * Tailwind emits no CSS in jsdom, so the breakpoint tiers are asserted on the
 * emitted utility classes. The effective widths those classes produce inside
 * the order flow's `max-w-6xl` (1152px) shell, with `md:gap-4` (16px) gutters
 * and the section's `sm:px-6` (24px) padding, are:
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

  it("promotes to four columns only at 1440px and above", () => {
    expect(renderSection()).toHaveClass("min-[1440px]:grid-cols-4");
  });

  it("never uses the lg (1024px) tier for four columns", () => {
    const grid = renderSection();
    expect(grid.className).not.toContain("lg:grid-cols-4");
    expect(grid.className).not.toContain("xl:grid-cols-4");
  });
});

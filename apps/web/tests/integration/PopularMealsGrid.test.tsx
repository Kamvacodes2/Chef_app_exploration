import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PopularMealsGrid } from "@/features/landing/PopularMealsGrid";

const api = vi.hoisted(() => ({
  FEATURED_MEAL_COUNT: 6,
  fetchCatalogMeals: vi.fn(),
  fetchFeaturedMeals: vi.fn(),
  updateFeaturedMeals: vi.fn(),
  FeaturedMealsError: class extends Error {},
}));

vi.mock("@/features/featured-meals/api/featuredMealsClient", () => api);

function featured(slug: string, order: number) {
  return {
    slug,
    categorySlug: "beef-premium",
    name: `Live ${slug}`,
    description: "Freshly curated by an admin.",
    priceCents: 15900,
    priceDisplay: "R159",
    image: { src: `/images/${slug}.webp`, alt: slug, width: 675, height: 1200 },
    isFeatured: true,
    featuredOrder: order,
  };
}

const liveSix = ["a", "b", "c", "d", "e", "f"].map((slug, index) => featured(slug, index));

describe("PopularMealsGrid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the live-fetched featured meals in the marquee", async () => {
    api.fetchCatalogMeals.mockResolvedValue(liveSix);

    render(<PopularMealsGrid />);

    await waitFor(() => expect(screen.getAllByTestId("popular-meal-card")).toHaveLength(6));
    expect(api.fetchCatalogMeals).toHaveBeenCalledWith(
      expect.objectContaining({ featured: true }),
    );
    expect(screen.getAllByTestId("popular-meal-card")[0]).toHaveAttribute(
      "data-order-meal-id",
      "a",
    );
    expect(screen.getAllByText("Live a").length).toBeGreaterThan(0);
  });

  it("falls back to the static in-demand list when the fetch fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    api.fetchCatalogMeals.mockRejectedValue(new Error("network down"));

    render(<PopularMealsGrid />);

    await waitFor(() => expect(warn).toHaveBeenCalled());
    expect(screen.getAllByTestId("popular-meal-card")[0]).toHaveAttribute(
      "data-order-meal-id",
      "winter-oxtail-stew",
    );
  });
});

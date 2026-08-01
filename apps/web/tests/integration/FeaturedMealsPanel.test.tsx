import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FeaturedMealsPanel } from "@/features/platform/FeaturedMealsPanel";

const api = vi.hoisted(() => ({
  FEATURED_MEAL_COUNT: 6,
  fetchCatalogMeals: vi.fn(),
  fetchFeaturedMeals: vi.fn(),
  updateFeaturedMeals: vi.fn(),
  FeaturedMealsError: class extends Error {},
}));

vi.mock("@/features/featured-meals/api/featuredMealsClient", () => api);

function meal(slug: string, featuredOrder: number | null) {
  return {
    slug,
    categorySlug: "beef-premium",
    name: `Meal ${slug}`,
    description: "Tasty.",
    priceCents: 15900,
    priceDisplay: "R159",
    image: { src: `/images/${slug}.webp`, alt: slug, width: 675, height: 1200 },
    isFeatured: featuredOrder !== null,
    featuredOrder,
  };
}

const catalog = [
  meal("meal-a", 0),
  meal("meal-b", 1),
  meal("meal-c", 2),
  meal("meal-d", 3),
  meal("meal-e", 4),
  meal("meal-f", 5),
  meal("meal-g", null),
  meal("meal-h", null),
];

function checkbox(slug: string): HTMLInputElement {
  return screen.getByTestId(`featured-meal-${slug}`) as HTMLInputElement;
}

describe("FeaturedMealsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.fetchCatalogMeals.mockResolvedValue(catalog);
  });

  it("pre-checks the six currently featured meals and reports the running count", async () => {
    render(<FeaturedMealsPanel />);

    await waitFor(() => expect(checkbox("meal-a").checked).toBe(true));
    expect(checkbox("meal-f").checked).toBe(true);
    expect(checkbox("meal-g").checked).toBe(false);
    expect(screen.getByTestId("featured-count")).toHaveTextContent("6 / 6 selected");
  });

  it("prevents selecting a seventh meal and only enables save at exactly six", async () => {
    render(<FeaturedMealsPanel />);
    await waitFor(() => expect(checkbox("meal-a").checked).toBe(true));

    expect(checkbox("meal-g")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save featured meals" })).toBeEnabled();

    fireEvent.click(checkbox("meal-a"));
    expect(screen.getByTestId("featured-count")).toHaveTextContent("5 / 6 selected");
    expect(screen.getByRole("button", { name: "Save featured meals" })).toBeDisabled();
    expect(checkbox("meal-g")).toBeEnabled();
  });

  it("saves the selected slugs in selection order and confirms success", async () => {
    const saved = [
      meal("meal-b", 0),
      meal("meal-c", 1),
      meal("meal-d", 2),
      meal("meal-e", 3),
      meal("meal-f", 4),
      meal("meal-g", 5),
    ];
    api.updateFeaturedMeals.mockResolvedValue(saved);

    render(<FeaturedMealsPanel />);
    await waitFor(() => expect(checkbox("meal-a").checked).toBe(true));

    fireEvent.click(checkbox("meal-a"));
    fireEvent.click(checkbox("meal-g"));
    fireEvent.click(screen.getByRole("button", { name: "Save featured meals" }));

    await waitFor(() =>
      expect(api.updateFeaturedMeals).toHaveBeenCalledWith([
        "meal-b",
        "meal-c",
        "meal-d",
        "meal-e",
        "meal-f",
        "meal-g",
      ]),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Featured meals updated");
  });

  it("surfaces the backend's unknown_meal_slugs message verbatim", async () => {
    api.updateFeaturedMeals.mockRejectedValue(
      new api.FeaturedMealsError("Unknown meal slugs: meal-zzz"),
    );

    render(<FeaturedMealsPanel />);
    await waitFor(() => expect(checkbox("meal-a").checked).toBe(true));

    fireEvent.click(screen.getByRole("button", { name: "Save featured meals" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Unknown meal slugs: meal-zzz");
  });

  it("reports a catalog load failure instead of rendering an empty picker", async () => {
    api.fetchCatalogMeals.mockRejectedValue(new Error("Chefmate catalog request failed (503)"));

    render(<FeaturedMealsPanel />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Chefmate catalog request failed (503)",
    );
  });
});

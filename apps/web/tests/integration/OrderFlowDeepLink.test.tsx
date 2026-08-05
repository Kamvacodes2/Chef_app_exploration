import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BrowserMeal } from "@/features/meal-browser/api/mealCatalogClient";

const catalogApi = vi.hoisted(() => ({
  fetchMeals: vi.fn(),
  fetchCategories: vi.fn(),
}));

vi.mock("@/features/meal-browser/api/mealCatalogClient", () => catalogApi);

vi.mock("@/features/auth/api/authClient", () => ({
  getCurrentUser: vi.fn(async () => null),
}));

vi.mock("@/features/order-flow/api/pricingQuoteClient", () => ({
  buildPricingQuotePayload: () => null,
  fetchPricingQuote: vi.fn(async () => null),
}));

vi.mock("@/features/hero/hooks/useMediaQuery", () => ({
  usePrefersReducedMotion: () => true,
}));

import { OrderFlow } from "@/features/order-flow/OrderFlow";

function meal(overrides: Partial<BrowserMeal> & Pick<BrowserMeal, "slug" | "name">): BrowserMeal {
  return {
    menuId: null,
    categorySlug: "healthy-bowls",
    categoryName: "Healthy Bowls",
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
    image: {
      src: `/images/meals/catalog/${overrides.slug}.webp`,
      alt: overrides.name,
      width: 736,
      height: 1030,
    },
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
    ...overrides,
  } as BrowserMeal;
}

const gyroBowl = meal({ slug: "chicken-gyro-bowl", name: "Chicken Gyro Bowl" });
const worsPap = meal({
  slug: "wors-pap-chakalaka",
  name: "Wors, Pap and Chakalaka",
  categorySlug: "everyday-classics",
  categoryName: "Everyday Classics",
});

const categories = [
  { slug: "healthy-bowls", name: "Healthy Bowls", sortOrder: 1, mealCount: 1 },
  { slug: "everyday-classics", name: "Everyday Classics", sortOrder: 2, mealCount: 1 },
];

function setHash(hash: string): void {
  window.history.replaceState(null, "", hash);
}

describe("OrderFlow landing deep link into meal discovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    catalogApi.fetchMeals.mockResolvedValue([gyroBowl, worsPap]);
    catalogApi.fetchCategories.mockResolvedValue(categories);
    window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    }) as typeof window.requestAnimationFrame;
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    setHash("#");
  });

  it("resolves a real catalog slug and highlights that meal on the meal step", async () => {
    setHash("#order-flow?meal=chicken-gyro-bowl");

    render(<OrderFlow />);

    expect(await screen.findByText("Selected: Chicken Gyro Bowl")).toBeInTheDocument();
    // The customer stays on the meal step, with the deep-linked card selected.
    expect(screen.getByTestId("order-flow")).toHaveAttribute("data-step", "meal");
    await waitFor(() =>
      expect(screen.getByTestId("meal-card-chicken-gyro-bowl").className).toContain(
        "ring-[var(--color-terracotta)]",
      ),
    );
    expect(screen.getByTestId("meal-card-wors-pap-chakalaka").className).not.toContain(
      "ring-[var(--color-terracotta)]",
    );
  });

  it("opens meal discovery with nothing selected when the slug is not in the catalog", async () => {
    setHash("#order-flow?meal=winter-oxtail-stew");

    render(<OrderFlow />);

    await screen.findByTestId("meal-card-chicken-gyro-bowl");
    expect(screen.getByTestId("order-flow")).toHaveAttribute("data-step", "meal");
    expect(screen.queryByText(/^Selected: /)).not.toBeInTheDocument();
  });

  it("does not look the catalog up for a plain booking link", async () => {
    setHash("#order-flow");

    render(<OrderFlow />);

    await waitFor(() =>
      expect(screen.getByTestId("order-flow")).toHaveAttribute("data-step", "goal"),
    );
    expect(catalogApi.fetchMeals).not.toHaveBeenCalled();
  });
});

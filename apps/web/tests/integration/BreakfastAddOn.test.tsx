import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

async function walkSubscriptionToSides(): Promise<void> {
  // plan-days
  fireEvent.click(await screen.findByRole("button", { name: "Decide later" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  // plan-favorite
  fireEvent.click(await screen.findByRole("button", { name: "I'll choose later" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  // meal discovery -> pick the main -> optional second meal -> sides
  fireEvent.click(await screen.findByRole("button", { name: "Choose Chicken Gyro Bowl" }));
  await screen.findByRole("heading", { name: "Add another meal?" });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByRole("heading", { name: "Add some sides?" });
}

describe("free breakfast add-on (overnight oats) in the order flow", () => {
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

  it("offers the overnight oats popup to a rhythm (subscription) customer at the sides step", async () => {
    setHash("#order-flow?plan=rhythm");

    render(<OrderFlow />);

    await walkSubscriptionToSides();

    expect(screen.getByTestId("order-flow")).toHaveAttribute("data-step", "sides");
    const dialog = screen.getByRole("dialog", {
      name: "Add overnight oats for your breakfast",
    });
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Yeah, breakfast sounds great" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No thanks" })).toBeInTheDocument();
  });

  it("adds the oats when the customer accepts, and never asks again in that session", async () => {
    setHash("#order-flow?plan=rhythm");

    render(<OrderFlow />);

    await walkSubscriptionToSides();
    fireEvent.click(screen.getByRole("button", { name: "Yeah, breakfast sounds great" }));

    expect(
      screen.queryByRole("dialog", { name: "Add overnight oats for your breakfast" }),
    ).not.toBeInTheDocument();

    // Going back to the second-meal step and forward again must not re-ask.
    fireEvent.click(screen.getByRole("button", { name: /Back/i }));
    await screen.findByRole("heading", { name: "Add another meal?" });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { name: "Add some sides?" });
    expect(
      screen.queryByRole("dialog", { name: "Add overnight oats for your breakfast" }),
    ).not.toBeInTheDocument();
  });

  it("dismisses the popup without adding oats when the customer declines", async () => {
    setHash("#order-flow?plan=rhythm");

    render(<OrderFlow />);

    await walkSubscriptionToSides();
    fireEvent.click(screen.getByRole("button", { name: "No thanks" }));

    expect(
      screen.queryByRole("dialog", { name: "Add overnight oats for your breakfast" }),
    ).not.toBeInTheDocument();
  });

  it("never offers the popup to a once-off (tonight) customer", async () => {
    setHash("#order-flow?plan=tonight");

    render(<OrderFlow />);

    fireEvent.click(await screen.findByRole("button", { name: "Choose Chicken Gyro Bowl" }));
    await screen.findByRole("heading", { name: "Add another meal?" });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { name: "Add some sides?" });

    expect(screen.getByTestId("order-flow")).toHaveAttribute("data-step", "sides");
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Add overnight oats for your breakfast" }),
      ).not.toBeInTheDocument(),
    );
  });
});

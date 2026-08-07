import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LandingPage } from "@/features/landing/LandingPage";

/**
 * Both the marquee and the order flow read the real catalog, so these tests
 * drive a small live catalog rather than the retired static placeholder menu.
 */
const CATALOG_MEALS = vi.hoisted(() => [
  {
    slug: "wors-pap-chakalaka",
    menuId: null,
    categorySlug: "everyday-classics",
    categoryName: "Everyday Classics",
    name: "Wors, Pap and Chakalaka",
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
      src: "/images/meals/catalog/wors-pap-chakalaka.webp",
      alt: "Wors, Pap and Chakalaka",
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
    isFeatured: true,
    featuredOrder: 0,
    nutritionProfiles: [],
  },
]);

vi.mock("@/features/meal-browser/api/mealCatalogClient", () => ({
  fetchMeals: vi.fn().mockResolvedValue(CATALOG_MEALS),
  fetchCategories: vi
    .fn()
    .mockResolvedValue([
      { slug: "everyday-classics", name: "Everyday Classics", sortOrder: 1, mealCount: 1 },
    ]),
}));

vi.mock("@/features/featured-meals/api/featuredMealsClient", () => ({
  FEATURED_MEAL_COUNT: 6,
  fetchCatalogMeals: vi.fn().mockResolvedValue([
    {
      slug: "wors-pap-chakalaka",
      categorySlug: "everyday-classics",
      name: "Wors, Pap and Chakalaka",
      description: "A South African home supper.",
      image: {
        src: "/images/meals/catalog/wors-pap-chakalaka.webp",
        alt: "Wors, Pap and Chakalaka",
        width: 736,
        height: 1030,
      },
      isFeatured: true,
      featuredOrder: 0,
    },
  ]),
  fetchFeaturedMeals: vi.fn(),
  updateFeaturedMeals: vi.fn(),
  FeaturedMealsError: class extends Error {},
}));

describe("LandingPage", () => {
  beforeEach(() => {
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    window.history.replaceState(null, "", "/");
  });

  it("keeps the kitchen trust chef image in a stable landscape frame before large layouts", () => {
    render(<LandingPage />);

    expect(screen.getByText("Real ingredients. Cooked in your kitchen.")).toBeInTheDocument();
    expect(screen.getByTestId("kitchen-trust-chef-image")).toHaveClass(
      "aspect-[4/3]",
      "lg:aspect-auto",
      "lg:min-h-[360px]",
    );
    expect(screen.getByRole("link", { name: "Get Started" })).toHaveAttribute(
      "href",
      "#order-flow",
    );
  });

  it("places the final callout image before its copy on mobile only", () => {
    render(<LandingPage />);

    const copyPanel = screen.getByRole("heading", {
      name: "Give yourself the evening back.",
    }).parentElement;
    const imagePanel = screen.getByAltText(
      "A family eating dinner at home while the Chefmate chef finishes in the kitchen",
    ).parentElement;

    expect(copyPanel).toHaveClass("max-sm:order-2");
    expect(imagePanel).toHaveClass("max-sm:order-1");
  });

  it("guides a recurring package through days and a favourite meal before the booking flow", async () => {
    render(<LandingPage />);

    const plansSection = screen.getByTestId("pricing-plans");
    const finalCallout = screen
      .getByRole("heading", { name: "Give yourself the evening back." })
      .closest("section");

    if (!finalCallout) {
      throw new Error("Expected final callout section");
    }

    const pricingHeading = screen.getByRole("heading", { name: "Choose your chefmate" });
    expect(pricingHeading).toBeInTheDocument();
    expect(pricingHeading).toHaveClass("items-baseline", "text-[#611a1e]");
    const pricingHeadingWordmark = screen.getByTestId("pricing-heading-wordmark");
    expect(pricingHeadingWordmark).toHaveAttribute(
      "src",
      expect.stringContaining("logo-wordmark.webp"),
    );
    expect(pricingHeadingWordmark).toHaveAttribute("width", "720");
    expect(pricingHeadingWordmark).toHaveAttribute("height", "142");
    expect(pricingHeadingWordmark).toHaveClass("h-[1em]");
    expect(pricingHeadingWordmark).toHaveAttribute("aria-hidden", "true");
    const cards = screen.getAllByTestId("pricing-plan-card");
    expect(cards).toHaveLength(4);
    expect(cards.map((card) => card.getAttribute("href"))).toEqual([
      "#order-flow?plan=tonight",
      "#order-flow?plan=rhythm",
      "#order-flow?plan=family",
      "#order-flow?plan=premium",
    ]);
    expect(
      screen.getByAltText("Two people enjoying a freshly cooked meal together at home"),
    ).toHaveAttribute("src", expect.stringContaining("chefmate_tonight.jpg"));
    expect(screen.getByAltText("A customer enjoying a quiet meal at home")).toHaveAttribute(
      "src",
      expect.stringContaining("chefmate_rhythm.jpg"),
    );
    expect(
      screen.getByAltText("A family sharing a relaxed dinner together at home"),
    ).toHaveAttribute("src", expect.stringContaining("chefmate_family.jpg"));
    expect(
      screen.getByAltText("A family enjoying a generous home-cooked meal together"),
    ).toHaveAttribute("src", expect.stringContaining("chefmate_full_house.jpg"));
    expect(plansSection.compareDocumentPosition(finalCallout)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    fireEvent.click(screen.getByRole("link", { name: /chefmate family/i }));

    expect(
      await screen.findByRole("heading", { name: "Which days suit your household?" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("order-flow")).toHaveAttribute("data-step", "plan-days");

    fireEvent.click(screen.getByRole("button", { name: /Monday/i }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      await screen.findByRole("heading", { name: "What would you like most often?" }),
    ).toBeInTheDocument();
    fireEvent.click(await screen.findByTestId("plan-favourite-wors-pap-chakalaka"));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("heading", { name: "Add some sides?" })).toBeInTheDocument();
    expect(screen.getByTestId("order-flow")).toHaveAttribute("data-step", "sides");
  });

  it("keeps legacy full-house package links working as premium", async () => {
    render(<LandingPage />);

    const legacyLink = document.createElement("a");
    legacyLink.href = "#order-flow?plan=full-house";
    document.body.appendChild(legacyLink);
    fireEvent.click(legacyLink);
    document.body.removeChild(legacyLink);

    expect(
      await screen.findByRole("heading", { name: "Which days suit your household?" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("order-flow")).toHaveAttribute("data-step", "plan-days");
  });
  it("takes the once-off package straight to meal discovery", async () => {
    render(<LandingPage />);

    fireEvent.click(screen.getByRole("link", { name: /chefmate tonight/i }));

    expect(
      await screen.findByRole("heading", { name: "Find what you want to eat." }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("order-flow")).toHaveAttribute("data-step", "meal");
    // Clicking the "+" button on a meal card dispatches SELECT_MAIN which
    // auto-advances to sides, so no Continue click is needed here.
    fireEvent.click(await screen.findByRole("button", { name: "Choose Wors, Pap and Chakalaka" }));

    expect(await screen.findByRole("heading", { name: "Add some sides?" })).toBeInTheDocument();
  });

  it("lets recurring package customers decide days and meals later", async () => {
    render(<LandingPage />);

    fireEvent.click(screen.getByRole("link", { name: /chefmate rhythm/i }));

    expect(
      await screen.findByRole("heading", { name: "Which days suit your household?" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Decide later" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      await screen.findByRole("heading", { name: "What would you like most often?" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "I'll choose later" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      await screen.findByRole("heading", { name: "Find what you want to eat." }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("order-flow")).toHaveAttribute("data-step", "meal");
  });

  it("returns to the neutral flow when browser history leaves a package link", async () => {
    render(<LandingPage />);

    fireEvent.click(screen.getByRole("link", { name: /chefmate family/i }));
    expect(
      await screen.findByRole("heading", { name: "Which days suit your household?" }),
    ).toBeInTheDocument();

    window.history.replaceState(null, "", "#plans");
    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(
      await screen.findByRole("heading", { name: "How can chefmate help?" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("order-flow")).toHaveAttribute("data-step", "goal");
  });
  it("duplicates matching meal segments so the popular-meals rail can loop seamlessly", () => {
    render(<LandingPage />);

    const rail = screen.getByTestId("popular-meal-loop").firstElementChild;
    expect(rail).toBeTruthy();
    expect(rail?.className).toMatch(/popular-meals-marquee/);
    expect(rail?.children).toHaveLength(5);
    expect(rail?.children[1]).toHaveAttribute("aria-hidden", "true");
    expect(rail?.children[4]).toHaveAttribute("aria-hidden", "true");
  });

  it("carries a live featured slug into meal discovery and highlights it there", async () => {
    render(<LandingPage />);

    // The live featured fetch replaces the static fallback tiles.
    await waitFor(() =>
      expect(screen.getAllByTestId("popular-meal-card")[0]).toHaveAttribute(
        "data-order-meal-id",
        "wors-pap-chakalaka",
      ),
    );
    const firstPopularMeal = screen.getAllByTestId("popular-meal-card")[0]!;
    expect(firstPopularMeal).toHaveAttribute("href", "#order-flow?meal=wors-pap-chakalaka");

    fireEvent.click(firstPopularMeal);

    // The customer lands on the meal step with that exact catalog meal selected.
    expect(
      await screen.findByRole("heading", { name: "Find what you want to eat." }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("order-flow")).toHaveAttribute("data-step", "meal");
    expect(await screen.findByText("Selected: Wors, Pap and Chakalaka")).toBeInTheDocument();
  });

  it("lands CTA clicks directly on meal discovery with all meals", async () => {
    render(<LandingPage />);

    fireEvent.click(screen.getByRole("link", { name: "Explore meals" }));

    // "Book a chef", "Get Started", "Explore meals", and "Book a chefmate"
    // all skip the goal step and land on meal discovery with "All" selected.
    expect(
      await screen.findByRole("heading", { name: "Find what you want to eat." }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "How can chefmate help?" }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("order-flow")).toHaveAttribute("data-step", "meal");
  });
});

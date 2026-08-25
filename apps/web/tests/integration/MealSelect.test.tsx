import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MealSelect } from "@/features/order-flow/components/MealSelect";
import { OrderContext } from "@/features/order-flow/state/OrderContext";
import { INITIAL_ORDER_STATE } from "@/features/order-flow/state/orderReducer";
import type { OrderController } from "@/features/order-flow/state/useOrderController";
import type { BrowserMeal } from "@/features/meal-browser/api/mealCatalogClient";

const catalogApi = vi.hoisted(() => ({
  fetchMeals: vi.fn(),
  fetchCategories: vi.fn(),
}));

vi.mock("@/features/meal-browser/api/mealCatalogClient", () => catalogApi);

function meal(overrides: Partial<BrowserMeal> & Pick<BrowserMeal, "slug" | "name">): BrowserMeal {
  return {
    menuId: null,
    categorySlug: "everyday-classics",
    categoryName: "Everyday Classics",
    description: "A South African home supper.",
    serves: "4-6",
    servesMin: 4,
    servesMax: 6,
    sessionFit: "Weeknight session",
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
    nutritionProfiles: [
      {
        plateType: "STANDARD",
        caloriesKcal: 900,
        proteinG: 40,
        carbsG: 95,
        fatG: 30,
        starchType: "Pap",
        starchCookedG: 250,
      },
    ],
    ...overrides,
  } as BrowserMeal;
}

const worsPap = meal({
  slug: "wors-pap-chakalaka",
  name: "Wors, Pap and Chakalaka",
  ingredients: "Boerewors; Maize meal; Chakalaka relish",
  recipeGuidelines: "1) Braai the wors. 2) Cook the pap. 3) Warm the chakalaka.",
  chefNote: "Ask the chef for extra chakalaka.",
});

const gyroBowl = meal({
  slug: "chicken-gyro-bowl",
  name: "Chicken Gyro Bowl",
  categorySlug: "healthy-bowls",
  categoryName: "Healthy Bowls",
  ingredients: "Chicken thigh; Tzatziki sauce; Cucumber",
  nutritionProfiles: [
    {
      plateType: "STANDARD",
      caloriesKcal: 540,
      proteinG: 45,
      carbsG: 30,
      fatG: 20,
      starchType: null,
      starchCookedG: null,
    },
    {
      plateType: "LOW_CARB",
      caloriesKcal: 430,
      proteinG: 46,
      carbsG: 12,
      fatG: 21,
      starchType: null,
      starchCookedG: null,
    },
  ],
});

/** The one real meal with no nutrition profiles, no ingredients and no recipe. */
const charcuterie = meal({
  slug: "charcuterie-board",
  name: "Charcuterie Board",
  categorySlug: "platters",
  categoryName: "Platters",
  serves: null,
  nutritionProfiles: [],
});

const categories = [
  { slug: "everyday-classics", name: "Everyday Classics", sortOrder: 1, mealCount: 1 },
  { slug: "healthy-bowls", name: "Healthy Bowls", sortOrder: 2, mealCount: 1 },
  { slug: "platters", name: "Platters", sortOrder: 3, mealCount: 1 },
];

function createController(overrides: Partial<OrderController> = {}): OrderController {
  return {
    state: { ...INITIAL_ORDER_STATE, step: "meal" },
    subtotal: 0,
    discount: 0,
    total: 0,
    canContinue: false,
    stepIndex: 0,
    isSubmittingRequest: false,
    submissionError: null,
    bookingConfirmation: null,
    selectGoal: vi.fn(),
    startMealDiscovery: vi.fn(),
    startPlanSetup: vi.fn(),
    togglePreferredDay: vi.fn(),
    decidePlanDays: vi.fn(),
    selectPlanFavorite: vi.fn(),
    selectPlanSecondFavorite: vi.fn(),
    decidePlanFavorite: vi.fn(),
    selectMain: vi.fn(),
    preselectMain: vi.fn(),
    toggleSide: vi.fn(),
    selectDessert: vi.fn(),
    skipDessert: vi.fn(),
    setCustomRequest: vi.fn(),
    clearCustomRequest: vi.fn(),
    setDate: vi.fn(),
    setTime: vi.fn(),
    setAddressField: vi.fn(),
    setContactField: vi.fn(),
    setGiftInput: vi.fn(),
    applyGift: vi.fn(),
    applyPromoCode: vi.fn(),
    removeGift: vi.fn(),
    next: vi.fn(),
    back: vi.fn(),
    goTo: vi.fn(),
    confirm: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  };
}

function renderMealSelect(overrides: Partial<OrderController> = {}): OrderController {
  const controller = createController(overrides);
  render(
    <OrderContext.Provider value={controller}>
      <MealSelect />
    </OrderContext.Provider>,
  );
  return controller;
}

function search(value: string): void {
  fireEvent.change(screen.getByLabelText("Search meals or ingredients"), { target: { value } });
}

describe("MealSelect meal browser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    catalogApi.fetchMeals.mockResolvedValue([worsPap, gyroBowl, charcuterie]);
    catalogApi.fetchCategories.mockResolvedValue(categories);
  });

  it("renders live catalog sections ordered by the categories endpoint", async () => {
    renderMealSelect();

    await screen.findByTestId("meal-card-wors-pap-chakalaka");
    const sections = screen.getAllByTestId(/^meal-section-/).map((el) => el.dataset.testid);
    expect(sections).toEqual([
      "meal-section-everyday-classics",
      "meal-section-healthy-bowls",
      "meal-section-platters",
    ]);
    expect(screen.getByTestId("meal-result-count")).toHaveTextContent("3 meals found");
  });

  it("searches on the meal name", async () => {
    renderMealSelect();
    await screen.findByTestId("meal-card-wors-pap-chakalaka");

    search("gyro");

    await waitFor(() =>
      expect(screen.getByTestId("meal-result-count")).toHaveTextContent("1 meal"),
    );
    expect(screen.getByTestId("meal-card-chicken-gyro-bowl")).toBeInTheDocument();
    expect(screen.queryByTestId("meal-card-wors-pap-chakalaka")).not.toBeInTheDocument();
  });

  it("searches non-name fields such as ingredients", async () => {
    renderMealSelect();
    await screen.findByTestId("meal-card-wors-pap-chakalaka");

    search("tzatziki");
    await waitFor(() => {
      expect(screen.getByTestId("meal-card-chicken-gyro-bowl")).toBeInTheDocument();
      expect(screen.queryByTestId("meal-card-wors-pap-chakalaka")).not.toBeInTheDocument();
    });

    search("chakalaka");
    await waitFor(() => {
      expect(screen.getByTestId("meal-card-wors-pap-chakalaka")).toBeInTheDocument();
      expect(screen.queryByTestId("meal-card-chicken-gyro-bowl")).not.toBeInTheDocument();
    });
  });

  it("narrows to a single section when a category chip is selected", async () => {
    renderMealSelect();
    await screen.findByTestId("meal-card-wors-pap-chakalaka");

    fireEvent.click(screen.getByRole("button", { name: "Healthy Bowls" }));

    expect(screen.getByRole("button", { name: "Healthy Bowls" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getAllByTestId(/^meal-section-/)).toHaveLength(1);
    expect(screen.getByTestId("meal-section-healthy-bowls")).toBeInTheDocument();
  });

  it("filters by nutrition-profile calories, not the measurement note", async () => {
    renderMealSelect();
    await screen.findByTestId("meal-card-wors-pap-chakalaka");

    fireEvent.click(screen.getByRole("button", { name: "Under 600" }));
    expect(screen.getByTestId("meal-card-chicken-gyro-bowl")).toBeInTheDocument();
    expect(screen.queryByTestId("meal-card-wors-pap-chakalaka")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "800-1000 kcal" }));
    expect(screen.getByTestId("meal-card-wors-pap-chakalaka")).toBeInTheDocument();
    expect(screen.queryByTestId("meal-card-chicken-gyro-bowl")).not.toBeInTheDocument();
  });

  it("renders a meal with no nutrition profiles cleanly and only under All Calories", async () => {
    renderMealSelect();
    const card = await screen.findByTestId("meal-card-charcuterie-board");

    expect(card).not.toHaveTextContent(/kcal/);
    expect(screen.queryByLabelText("Macros for Charcuterie Board")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Plate options for Charcuterie Board")).not.toBeInTheDocument();
    // Missing `serves` still reads as a real serving size.
    expect(card).toHaveTextContent("Serves 4-6");

    for (const label of ["Under 600", "600-800 kcal", "800-1000 kcal", "Over 1000 kcal"]) {
      fireEvent.click(screen.getByRole("button", { name: label }));
      expect(screen.queryByTestId("meal-card-charcuterie-board")).not.toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole("button", { name: "All Calories" }));
    expect(screen.getByTestId("meal-card-charcuterie-board")).toBeInTheDocument();
  });

  it("opens the drawer from the card body and hides sections the catalog has no data for", async () => {
    renderMealSelect();
    await screen.findByTestId("meal-card-charcuterie-board");

    fireEvent.click(screen.getByRole("button", { name: "View Charcuterie Board details" }));

    const drawer = await screen.findByTestId("meal-detail-drawer");
    expect(drawer).toHaveTextContent("Charcuterie Board");
    expect(drawer).toHaveTextContent("Ingredients will be confirmed before your session.");
    expect(screen.queryByRole("button", { name: /How the chef cooks it/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Chef note")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Nutrition")).not.toBeInTheDocument();
  });

  it("shows ingredients, collapsible recipe steps and the chef note when present", async () => {
    renderMealSelect();
    await screen.findByTestId("meal-card-wors-pap-chakalaka");

    fireEvent.click(screen.getByRole("button", { name: "View Wors, Pap and Chakalaka details" }));
    const drawer = await screen.findByTestId("meal-detail-drawer");

    expect(drawer).toHaveTextContent("Boerewors");
    expect(drawer).toHaveTextContent("Chakalaka relish");
    expect(screen.getByLabelText("Chef note")).toHaveTextContent(
      "Ask the chef for extra chakalaka",
    );

    const recipeToggle = screen.getByRole("button", { name: /How the chef cooks it/ });
    expect(recipeToggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(recipeToggle);
    expect(recipeToggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Braai the wors.")).toBeInTheDocument();
    expect(screen.getByText("Cook the pap.")).toBeInTheDocument();
  });

  it("closes the drawer with the Escape key", async () => {
    renderMealSelect();
    await screen.findByTestId("meal-card-chicken-gyro-bowl");

    fireEvent.click(screen.getByRole("button", { name: "View Chicken Gyro Bowl details" }));
    await screen.findByTestId("meal-detail-drawer");

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByTestId("meal-detail-drawer")).not.toBeInTheDocument());
  });

  it("selects the catalog slug from the plus button without opening the drawer", async () => {
    const controller = renderMealSelect();
    await screen.findByTestId("meal-card-chicken-gyro-bowl");

    fireEvent.click(screen.getByRole("button", { name: "Choose Chicken Gyro Bowl" }));

    expect(controller.selectMain).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "chicken-gyro-bowl",
        course: "main",
        name: "Chicken Gyro Bowl",
      }),
    );
    expect(screen.queryByTestId("meal-detail-drawer")).not.toBeInTheDocument();
  });

  it("selects from the drawer CTA and closes the drawer", async () => {
    const controller = renderMealSelect();
    await screen.findByTestId("meal-card-chicken-gyro-bowl");

    fireEvent.click(screen.getByRole("button", { name: "View Chicken Gyro Bowl details" }));
    fireEvent.click(await screen.findByRole("button", { name: "Continue to session" }));

    expect(controller.selectMain).toHaveBeenCalledWith(
      expect.objectContaining({ id: "chicken-gyro-bowl" }),
    );
    await waitFor(() => expect(screen.queryByTestId("meal-detail-drawer")).not.toBeInTheDocument());
  });

  it("highlights the meal already stored in order state", async () => {
    renderMealSelect({
      state: {
        ...INITIAL_ORDER_STATE,
        step: "meal",
        main: {
          id: "chicken-gyro-bowl",
          name: "Chicken Gyro Bowl",
          description: "",
          priceDisplay: "Included in package",
          price: 0,
          course: "main",
          imageSrc: "/images/meals/catalog/chicken-gyro-bowl.webp",
          imageAlt: "Chicken Gyro Bowl",
          paletteId: "persimmon",
          goalTags: [],
        },
      },
    });

    expect(await screen.findByText("Selected: Chicken Gyro Bowl")).toBeInTheDocument();
  });

  it("offers the custom request from the empty state when nothing matches", async () => {
    renderMealSelect();
    await screen.findByTestId("meal-card-wors-pap-chakalaka");

    search("not-on-the-menu-yet");
    await waitFor(() => expect(screen.getByText("No exact match yet.")).toBeInTheDocument());
    expect(screen.getByTestId("meal-result-count")).toHaveTextContent("0 meals found");

    fireEvent.click(screen.getByRole("button", { name: "Describe what you want" }));
    expect(screen.getByLabelText("Tell the kitchen what you're craving")).toBeInTheDocument();
  });

  it("keeps the custom request usable when the catalog fetch fails", async () => {
    catalogApi.fetchMeals.mockRejectedValue(
      new Error("Chefmate catalog meals request failed (503)"),
    );

    const controller = renderMealSelect();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Chefmate catalog meals request failed (503)",
    );
    fireEvent.click(screen.getByRole("button", { name: "Describe what you want instead" }));
    fireEvent.change(screen.getByLabelText("Tell the kitchen what you're craving"), {
      target: { value: "Ouma's chicken curry" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Request this" }));

    expect(controller.setCustomRequest).toHaveBeenCalledWith("Ouma's chicken curry");
  });

  it("retries the catalog load after a failure", async () => {
    catalogApi.fetchMeals.mockRejectedValueOnce(
      new Error("Chefmate catalog meals request failed (503)"),
    );

    renderMealSelect();
    await screen.findByRole("alert");

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByTestId("meal-card-wors-pap-chakalaka")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("submits and clears custom meal requests", async () => {
    const controller = renderMealSelect();
    await screen.findByTestId("meal-card-wors-pap-chakalaka");

    fireEvent.click(screen.getByRole("button", { name: "Can't find what you want?" }));
    expect(screen.getByRole("button", { name: "Request this" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Tell the kitchen what you're craving"), {
      target: { value: "Ouma's chicken curry" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Request this" }));
    expect(controller.setCustomRequest).toHaveBeenCalledWith("Ouma's chicken curry");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(controller.clearCustomRequest).toHaveBeenCalledTimes(1);
  });
});

describe("MealSelect goal pre-selection", () => {
  const carbCleverMeal = meal({
    slug: "carb-clever-bowl",
    name: "Carb Clever Bowl",
    categorySlug: "carb-clever",
    categoryName: "Carb Clever",
    goalTags: ["high-protein", "low-carb"],
  });

  const familySupperMeal = meal({
    slug: "family-supper",
    name: "Family Supper",
    categorySlug: "popular-family-suppers",
    categoryName: "Popular Family Suppers",
    goalTags: ["balanced", "family-friendly"],
  });

  const goalCategories = [
    { slug: "carb-clever", name: "Carb Clever", sortOrder: 1, mealCount: 1 },
    { slug: "popular-family-suppers", name: "Popular Family Suppers", sortOrder: 2, mealCount: 1 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    catalogApi.fetchMeals.mockResolvedValue([carbCleverMeal, familySupperMeal]);
    catalogApi.fetchCategories.mockResolvedValue(goalCategories);
  });

  it("pre-selects the Carb Clever chip for the lose-weight goal", async () => {
    renderMealSelect({
      state: { ...INITIAL_ORDER_STATE, step: "meal", goalId: "lose-weight" },
    });

    await screen.findByTestId("meal-card-carb-clever-bowl");

    expect(screen.getByRole("button", { name: "Carb Clever" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.queryByTestId("meal-card-family-supper")).not.toBeInTheDocument();
  });

  it("lets the customer override the lose-weight default by tapping All", async () => {
    renderMealSelect({
      state: { ...INITIAL_ORDER_STATE, step: "meal", goalId: "lose-weight" },
    });

    await screen.findByTestId("meal-card-carb-clever-bowl");
    fireEvent.click(screen.getByRole("button", { name: "All" }));

    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("meal-card-carb-clever-bowl")).toBeInTheDocument();
    expect(screen.getByTestId("meal-card-family-supper")).toBeInTheDocument();
  });

  it("starts on All for a goal with no clean category mapping (just-good-food)", async () => {
    renderMealSelect({
      state: { ...INITIAL_ORDER_STATE, step: "meal", goalId: "just-good-food" },
    });

    await screen.findByTestId("meal-card-carb-clever-bowl");

    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("meal-card-family-supper")).toBeInTheDocument();
  });

  it("starts on All for goals without a real-data category match (post-partum)", async () => {
    renderMealSelect({
      state: { ...INITIAL_ORDER_STATE, step: "meal", goalId: "post-partum" },
    });

    await screen.findByTestId("meal-card-carb-clever-bowl");

    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("meal-card-family-supper")).toBeInTheDocument();
  });

  it("never permanently hides a meal: every category chip remains reachable regardless of goal", async () => {
    renderMealSelect({
      state: { ...INITIAL_ORDER_STATE, step: "meal", goalId: "lose-weight" },
    });

    await screen.findByTestId("meal-card-carb-clever-bowl");
    fireEvent.click(screen.getByRole("button", { name: "Popular Family Suppers" }));

    expect(screen.getByTestId("meal-card-family-supper")).toBeInTheDocument();
    expect(screen.queryByTestId("meal-card-carb-clever-bowl")).not.toBeInTheDocument();
  });
});

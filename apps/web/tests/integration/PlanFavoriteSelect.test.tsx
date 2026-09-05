import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlanFavoriteSelect } from "@/features/order-flow/components/PlanFavoriteSelect";
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

const worsPap = meal({ slug: "wors-pap-chakalaka", name: "Wors, Pap and Chakalaka" });
const gyroBowl = meal({
  slug: "chicken-gyro-bowl",
  name: "Chicken Gyro Bowl",
  categorySlug: "healthy-bowls",
  categoryName: "Healthy Bowls",
  sortOrder: 2,
});
const retiredMeal = meal({ slug: "retired-dish", name: "Retired Dish", isActive: false });

function createController(overrides: Partial<OrderController> = {}): OrderController {
  return {
    state: { ...INITIAL_ORDER_STATE, step: "plan-favorite", planId: "family" },
    subtotal: 0,
    discount: 0,
    total: 0,
    canContinue: false,
    stepIndex: 2,
    isSubmittingRequest: false,
    submissionError: null,
    bookingConfirmation: null,
    selectGoal: vi.fn(),
    startMealDiscovery: vi.fn(),
    startPlanSetup: vi.fn(),
    togglePreferredDay: vi.fn(),
    decidePlanDays: vi.fn(),
    selectPlanFavorite: vi.fn(),
    setPlanFavoriteLink: () => {},
    setPlanSecondFavoriteLink: () => {},
    clearPlanFavoriteLink: () => {},
    clearPlanSecondFavoriteLink: () => {},
    selectPlanSecondFavorite: vi.fn(),
    decidePlanFavorite: vi.fn(),
    selectMain: vi.fn(),
    preselectMain: vi.fn(),
    toggleSide: vi.fn(),
    selectDessert: vi.fn(),
    skipDessert: vi.fn(),
    setCustomRequest: vi.fn(),
    clearCustomRequest: vi.fn(),
    setBreakfastAddOn: vi.fn(),
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
    confirm: vi.fn(async () => {}),
    reset: vi.fn(),
    ...overrides,
  };
}

function renderStep(overrides: Partial<OrderController> = {}): OrderController {
  const controller = createController(overrides);
  render(
    <OrderContext.Provider value={controller}>
      <PlanFavoriteSelect />
    </OrderContext.Provider>,
  );
  return controller;
}

describe("PlanFavoriteSelect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    catalogApi.fetchMeals.mockResolvedValue([worsPap, gyroBowl, retiredMeal]);
  });

  it("offers the live catalog instead of the static placeholder shortlist", async () => {
    renderStep();

    expect(await screen.findByTestId("plan-favourite-wors-pap-chakalaka")).toBeInTheDocument();
    expect(catalogApi.fetchMeals).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("plan-favourite-chicken-gyro-bowl")).toHaveTextContent(
      "Chicken Gyro Bowl",
    );
    // The deleted placeholder meals are gone.
    expect(screen.queryByText("Oxtail Stew")).not.toBeInTheDocument();
  });

  it("hides meals the catalog has deactivated", async () => {
    renderStep();

    await screen.findByTestId("plan-favourite-wors-pap-chakalaka");
    expect(screen.queryByTestId("plan-favourite-retired-dish")).not.toBeInTheDocument();
  });

  it("stores the real catalog slug as the favourite", async () => {
    const controller = renderStep();
    await screen.findByTestId("plan-favourite-chicken-gyro-bowl");

    fireEvent.click(screen.getByTestId("plan-favourite-chicken-gyro-bowl"));

    expect(controller.selectPlanFavorite).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "chicken-gyro-bowl",
        name: "Chicken Gyro Bowl",
        course: "main",
      }),
    );
  });

  it("fills the second meal slot for meal-prep packs", async () => {
    const controller = renderStep({
      state: {
        ...INITIAL_ORDER_STATE,
        step: "plan-favorite",
        planId: "family",
        favoriteMealId: "wors-pap-chakalaka",
      },
    });
    await screen.findByTestId("plan-favourite-chicken-gyro-bowl");

    fireEvent.click(screen.getByTestId("plan-favourite-chicken-gyro-bowl"));

    expect(controller.selectPlanSecondFavorite).toHaveBeenCalledWith(
      expect.objectContaining({ id: "chicken-gyro-bowl" }),
    );
  });

  it("marks the stored favourite as pressed", async () => {
    renderStep({
      state: {
        ...INITIAL_ORDER_STATE,
        step: "plan-favorite",
        planId: "family",
        favoriteMealId: "chicken-gyro-bowl",
      },
    });

    await waitFor(() =>
      expect(screen.getByTestId("plan-favourite-chicken-gyro-bowl")).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    expect(screen.getByTestId("plan-favourite-wors-pap-chakalaka")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("searches the catalog by meal name and category", async () => {
    renderStep();
    await screen.findByTestId("plan-favourite-wors-pap-chakalaka");

    fireEvent.change(screen.getByLabelText("Search meals"), { target: { value: "healthy" } });

    await waitFor(() =>
      expect(screen.queryByTestId("plan-favourite-wors-pap-chakalaka")).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId("plan-favourite-chicken-gyro-bowl")).toBeInTheDocument();
  });

  it("keeps the choose-later escape hatch when the catalog fetch fails", async () => {
    catalogApi.fetchMeals.mockRejectedValue(
      new Error("Chefmate catalog meals request failed (503)"),
    );

    const controller = renderStep();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Chefmate catalog meals request failed (503)",
    );
    fireEvent.click(screen.getByRole("button", { name: "I'll choose later" }));
    expect(controller.decidePlanFavorite).toHaveBeenCalledTimes(1);
  });
});

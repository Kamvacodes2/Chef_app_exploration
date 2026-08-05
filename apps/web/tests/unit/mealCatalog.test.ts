import { describe, expect, it, vi } from "vitest";
import {
  fetchCategories,
  fetchMeals,
  type BrowserMeal,
} from "@/features/meal-browser/api/mealCatalogClient";
import { CALORIE_FILTERS, matchesCalorieFilter } from "@/features/meal-browser/calorieFilters";
import {
  mealCalories,
  mealImage,
  parseIngredients,
  parseRecipeSteps,
  primaryProfile,
  servesLabel,
  toPaletteId,
} from "@/features/meal-browser/mealPresentation";
import { toOrderMenuItem } from "@/features/meal-browser/toOrderMenuItem";

const BASE_URL = "http://catalog.test";

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const apiMeal = {
  slug: "wors-pap-chakalaka",
  menuId: "EC-005",
  categorySlug: "everyday-classics",
  categoryName: "Everyday Classics",
  name: "Wors, Pap and Chakalaka",
  description: "A braai-day classic.",
  serves: "4-6",
  ingredients: "Boerewors; Maize meal\nChakalaka relish",
  recipeGuidelines: "1) Braai the wors. 2) Cook the pap.",
  chefNote: "Extra chakalaka on request.",
  image: { src: "/images/meals/catalog/ec-005.webp", alt: "Wors and pap", width: 736, height: 981 },
  paletteId: "espresso",
  goalTags: ["comfort"],
  isSignature: true,
  sortOrder: 5,
  nutritionProfiles: [
    { plateType: "STANDARD", caloriesKcal: 910, proteinG: 42, carbsG: 96, fatG: 33 },
    { plateType: "LOW_CARB", caloriesKcal: 620, proteinG: 44, carbsG: 30, fatG: 34 },
  ],
  // An unknown field the backend may add at any time.
  spiceLevel: "medium",
};

describe("meal catalog client", () => {
  it("parses meals, tolerates unknown fields and fills optional gaps", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: [apiMeal] }));

    const [meal] = await fetchMeals({}, { baseUrl: BASE_URL, fetchImpl });

    expect(fetchImpl).toHaveBeenCalledWith(`${BASE_URL}/api/v1/catalog/meals`, {
      signal: undefined,
    });
    expect(meal?.slug).toBe("wors-pap-chakalaka");
    expect(meal?.measurementNote).toBeNull();
    expect(meal?.isActive).toBe(true);
    expect(meal?.nutritionProfiles[0]?.starchType).toBeNull();
  });

  it("sends the optional query parameters it is given", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));

    await fetchMeals(
      { category: "platters", q: "board", featured: true },
      { baseUrl: BASE_URL, fetchImpl },
    );

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      `${BASE_URL}/api/v1/catalog/meals?category=platters&q=board&featured=true`,
    );
  });

  it("fails loudly when a depended-on field is missing", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: [{ ...apiMeal, categorySlug: undefined }] }));

    await expect(fetchMeals({}, { baseUrl: BASE_URL, fetchImpl })).rejects.toThrow();
  });

  it("throws a labelled error for a failed meals response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, 503));

    await expect(fetchMeals({}, { baseUrl: BASE_URL, fetchImpl })).rejects.toThrow(
      "Chefmate catalog meals request failed (503)",
    );
  });

  it("normalises the category meal-count aliases", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        data: [
          { slug: "a", name: "A", sortOrder: 1, mealCount: 4 },
          { slug: "b", name: "B", sortOrder: 2, mealsCount: 5 },
          { slug: "c", name: "C", sortOrder: 3, count: 6 },
          { slug: "d", name: "D", sortOrder: 4 },
        ],
      }),
    );

    const categories = await fetchCategories({ baseUrl: BASE_URL, fetchImpl });

    expect(categories.map((category) => category.mealCount)).toEqual([4, 5, 6, 0]);
  });

  it("throws a labelled error for a failed categories response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, 500));

    await expect(fetchCategories({ baseUrl: BASE_URL, fetchImpl })).rejects.toThrow(
      "Chefmate catalog categories request failed (500)",
    );
  });

  it("rejects a blank base URL", async () => {
    await expect(fetchMeals({}, { baseUrl: "  ", fetchImpl: vi.fn() })).rejects.toThrow(
      "Chefmate API URL is not configured.",
    );
  });
});

describe("meal presentation helpers", () => {
  async function loadMeal(overrides: Record<string, unknown> = {}): Promise<BrowserMeal> {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: [{ ...apiMeal, ...overrides }] }));
    const [meal] = await fetchMeals({}, { baseUrl: BASE_URL, fetchImpl });
    return meal!;
  }

  it("prefers the STANDARD nutrition profile for the card summary", async () => {
    const meal = await loadMeal();
    expect(primaryProfile(meal)?.plateType).toBe("STANDARD");
    expect(mealCalories(meal)).toBe(910);
  });

  it("falls back to the first profile and reports no calories when there are none", async () => {
    expect(
      primaryProfile(
        await loadMeal({
          nutritionProfiles: [
            { plateType: "LOW_CARB", caloriesKcal: 400, proteinG: 1, carbsG: 2, fatG: 3 },
          ],
        }),
      )?.plateType,
    ).toBe("LOW_CARB");
    expect(mealCalories(await loadMeal({ nutritionProfiles: [] }))).toBeNull();
  });

  it("uses the Serves 4-6 fallback and prefixes a bare serving count", async () => {
    expect(servesLabel(await loadMeal({ serves: null }))).toBe("Serves 4-6");
    expect(servesLabel(await loadMeal({ serves: "6-8" }))).toBe("Serves 6-8");
    expect(servesLabel(await loadMeal({ serves: "Serves 2" }))).toBe("Serves 2");
  });

  it("falls back to a placeholder photo when the catalog has no image", async () => {
    const image = mealImage(await loadMeal({ image: null }));
    expect(image.src).toBe("/images/loop/meal-3.webp");
    expect(image.alt).toContain("photo coming soon");
  });

  it("splits ingredients on semicolons and newlines", async () => {
    expect(parseIngredients((await loadMeal()).ingredients)).toEqual([
      "Boerewors",
      "Maize meal",
      "Chakalaka relish",
    ]);
    expect(parseIngredients(null)).toEqual([]);
  });

  it("splits recipe guidelines on the numbered steps", async () => {
    expect(parseRecipeSteps((await loadMeal()).recipeGuidelines)).toEqual([
      "Braai the wors.",
      "Cook the pap.",
    ]);
    expect(parseRecipeSteps("Just braai it.")).toEqual(["Just braai it."]);
    expect(parseRecipeSteps(null)).toEqual([]);
  });

  it("narrows unknown palette ids onto the brand palette", () => {
    expect(toPaletteId("espresso")).toBe("espresso");
    expect(toPaletteId("chartreuse")).toBe("persimmon");
    expect(toPaletteId(undefined)).toBe("persimmon");
  });

  it("adapts a catalog meal into order state keyed by its slug, with no price", async () => {
    const item = toOrderMenuItem(await loadMeal());

    expect(item.id).toBe("wors-pap-chakalaka");
    expect(item.course).toBe("main");
    expect(item.price).toBe(0);
    expect(item.priceDisplay).toBe("Included in package");
    expect(item.imageSrc).toBe("/images/meals/catalog/ec-005.webp");
    expect(item.isSignature).toBe(true);
  });
});

describe("calorie filters", () => {
  const [all, under600, mid, high, over1000] = CALORIE_FILTERS;

  it("puts a meal with no calories only under All Calories", () => {
    expect(matchesCalorieFilter(all!, null)).toBe(true);
    expect(matchesCalorieFilter(under600!, null)).toBe(false);
    expect(matchesCalorieFilter(over1000!, null)).toBe(false);
  });

  it("treats the bounds as inclusive-lower and exclusive-upper", () => {
    expect(matchesCalorieFilter(under600!, 599)).toBe(true);
    expect(matchesCalorieFilter(under600!, 600)).toBe(false);
    expect(matchesCalorieFilter(mid!, 600)).toBe(true);
    expect(matchesCalorieFilter(mid!, 800)).toBe(false);
    expect(matchesCalorieFilter(high!, 999)).toBe(true);
    expect(matchesCalorieFilter(over1000!, 1000)).toBe(true);
    expect(matchesCalorieFilter(over1000!, 999)).toBe(false);
  });
});

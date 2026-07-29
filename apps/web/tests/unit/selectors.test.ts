import { describe, expect, it } from "vitest";
import {
  selectActiveLoopItem,
  selectActiveMeal,
  selectActivePaletteId,
  selectFrameNumber,
  selectMealsForActiveCategory,
} from "@/features/hero/state/selectors";
import { MEAL_LOOP_ITEMS } from "@/features/hero/constants/mealLoop";
import { INITIAL_HERO_STATE } from "@/features/hero/state/heroMachine.types";
import type { Category, Meal } from "@/data/types/Meal";

const categories: Category[] = [
  { id: "cat-a", name: "Category A", paletteId: "olive", mood: "fresh", order: 0 },
  { id: "cat-b", name: "Category B", paletteId: "persimmon", mood: "golden", order: 1 },
];

const meals: Meal[] = [
  {
    id: "meal-1",
    categoryId: "cat-a",
    name: "Meal 1",
    description: "desc",
    priceDisplay: "R10",
    image: { src: "/a.webp", width: 10, height: 10, alt: "a" },
    isHot: false,
    hasCutlery: false,
    order: 0,
    nutrition: { protein: 10, carbs: 10, fat: 10, fibre: 2 },
  },
  {
    id: "meal-2",
    categoryId: "cat-b",
    name: "Meal 2",
    description: "desc",
    priceDisplay: "R20",
    image: { src: "/b.webp", width: 10, height: 10, alt: "b" },
    isHot: true,
    hasCutlery: true,
    order: 0,
    nutrition: { protein: 12, carbs: 12, fat: 8, fibre: 3 },
  },
];

describe("selectors", () => {
  it("maps each phase to the correct frame number", () => {
    expect(selectFrameNumber({ ...INITIAL_HERO_STATE, phase: "WAITING" })).toBe(1);
    expect(selectFrameNumber({ ...INITIAL_HERO_STATE, phase: "BROWSING" })).toBe(2);
    expect(selectFrameNumber({ ...INITIAL_HERO_STATE, phase: "DELIGHTED" })).toBe(3);
  });

  it("selects meals scoped to the active category only", () => {
    const result = selectMealsForActiveCategory(INITIAL_HERO_STATE, categories, meals);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("meal-1");
  });

  it("selects the active meal by index within the category", () => {
    const state = { ...INITIAL_HERO_STATE, categoryIndex: 1, mealIndex: 0 };
    const result = selectActiveMeal(state, categories, meals);
    expect(result?.id).toBe("meal-2");
  });

  it("returns undefined when no meal exists at the given index", () => {
    const state = { ...INITIAL_HERO_STATE, categoryIndex: 0, mealIndex: 5 };
    expect(selectActiveMeal(state, categories, meals)).toBeUndefined();
  });

  it("resolves the palette id for the active category once browsing", () => {
    const state = { ...INITIAL_HERO_STATE, phase: "BROWSING" as const, categoryIndex: 1 };
    expect(selectActivePaletteId(state, categories)).toBe("persimmon");
  });

  it("falls back to the default palette when category index is out of range", () => {
    const state = { ...INITIAL_HERO_STATE, phase: "BROWSING" as const, categoryIndex: 99 };
    expect(selectActivePaletteId(state, categories)).toBe("vanilla");
  });

  it("resolves the first loop item's palette (olive) in WAITING at loopIndex 0", () => {
    const state = { ...INITIAL_HERO_STATE, phase: "WAITING" as const, categoryIndex: 0 };
    expect(selectActivePaletteId(state, categories)).toBe("olive");
  });

  it("changes the WAITING palette as loopIndex advances through the loop items", () => {
    const state = { ...INITIAL_HERO_STATE, phase: "WAITING" as const, loopIndex: 1 };
    expect(selectActivePaletteId(state, categories)).toBe(MEAL_LOOP_ITEMS[1]!.paletteId);
    expect(selectActivePaletteId(state, categories)).toBe("persimmon");
  });

  it("cycles through every palette in the loop as loopIndex wraps", () => {
    const palettes = MEAL_LOOP_ITEMS.map((item) => item.paletteId);
    for (let i = 0; i < MEAL_LOOP_ITEMS.length; i++) {
      const state = { ...INITIAL_HERO_STATE, phase: "WAITING" as const, loopIndex: i };
      expect(selectActivePaletteId(state, categories)).toBe(palettes[i]);
    }
  });

  it("selectActiveLoopItem returns the loop item at the current loopIndex", () => {
    const state = { ...INITIAL_HERO_STATE, loopIndex: 3 };
    expect(selectActiveLoopItem(state).id).toBe(MEAL_LOOP_ITEMS[3]!.id);
  });

  it("resolves the active category's palette once BROWSING starts", () => {
    const state = { ...INITIAL_HERO_STATE, phase: "BROWSING" as const, categoryIndex: 0 };
    expect(selectActivePaletteId(state, categories)).toBe("olive");
  });
});

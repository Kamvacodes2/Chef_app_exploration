import type { Category, Meal } from "@/data/types/Meal";
import type { PaletteId } from "@/data/types/Palette";
import { MEAL_LOOP_ITEMS } from "../constants/mealLoop";
import type { MealLoopItem } from "../constants/mealLoop";
import { DEFAULT_PALETTE_ID } from "../constants/palettes";
import type { HeroPhase, HeroState } from "./heroMachine.types";

const PHASE_TO_FRAME: Readonly<Record<HeroPhase, number>> = Object.freeze({
  WAITING: 1,
  BROWSING: 2,
  DELIGHTED: 3,
});

export function selectFrameNumber(state: HeroState): number {
  return PHASE_TO_FRAME[state.phase];
}

export function selectIsBrowsingOrLater(state: HeroState): boolean {
  return state.phase !== "WAITING";
}

export function selectActiveCategory(
  state: HeroState,
  categories: readonly Category[],
): Category | undefined {
  return categories[state.categoryIndex];
}

export function selectMealsForActiveCategory(
  state: HeroState,
  categories: readonly Category[],
  meals: readonly Meal[],
): readonly Meal[] {
  const category = selectActiveCategory(state, categories);
  if (!category) return [];
  return meals.filter((meal) => meal.categoryId === category.id);
}

export function selectActiveMeal(
  state: HeroState,
  categories: readonly Category[],
  meals: readonly Meal[],
): Meal | undefined {
  const categoryMeals = selectMealsForActiveCategory(state, categories, meals);
  return categoryMeals[state.mealIndex];
}
export function selectActiveLoopItem(state: HeroState): MealLoopItem {
  return MEAL_LOOP_ITEMS[state.loopIndex % MEAL_LOOP_ITEMS.length] ?? MEAL_LOOP_ITEMS[0]!;
}

export function selectActivePaletteId(
  state: HeroState,
  categories: readonly Category[],
): PaletteId {
  if (state.phase === "WAITING") return selectActiveLoopItem(state).paletteId;
  const category = selectActiveCategory(state, categories);
  return category?.paletteId ?? DEFAULT_PALETTE_ID;
}

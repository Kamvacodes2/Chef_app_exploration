import type { PaletteId } from "@/data/types/Palette";
import type { BrowserMeal, MealNutritionProfile } from "./api/mealCatalogClient";
import { getChefmateApiUrl } from "@/lib/env";

const PALETTE_IDS: readonly PaletteId[] = [
  "vanilla",
  "olive",
  "persimmon",
  "espresso",
  "strawberry",
  "blood-red",
  "lemon-cream",
  "warm-linen",
  "bean",
];

/** Shown when the catalog has no photography for a meal yet. */
export const FALLBACK_MEAL_IMAGE_SRC = "/images/loop/meal-3.webp";
/** Product rule: a missing `serves` still reads as a real serving size. */
export const FALLBACK_SERVES = "Serves 4-6";

export const PLATE_LABELS: Readonly<Record<MealNutritionProfile["plateType"], string>> = {
  STANDARD: "Standard",
  BALANCED: "Balanced",
  LOW_CARB: "Low carb",
};

/** Narrows the backend's free-form palette id onto our brand palette union. */
export function toPaletteId(raw: string | undefined): PaletteId {
  return PALETTE_IDS.includes(raw as PaletteId) ? (raw as PaletteId) : "persimmon";
}

/**
 * The nutrition profile the card summarises: STANDARD when present, otherwise
 * the first profile the catalog exposes. `null` when the meal has none.
 */
export function primaryProfile(meal: BrowserMeal): MealNutritionProfile | null {
  if (meal.nutritionProfiles.length === 0) return null;
  return (
    meal.nutritionProfiles.find((p) => p.plateType === "STANDARD") ?? meal.nutritionProfiles[0]!
  );
}

/**
 * Calories used for the calorie chips. Read from the nutrition profile — never
 * parsed out of `measurementNote`.
 */
export function mealCalories(meal: BrowserMeal): number | null {
  return primaryProfile(meal)?.caloriesKcal ?? null;
}

export function servesLabel(meal: BrowserMeal): string {
  const serves = meal.serves?.trim();
  if (!serves) return FALLBACK_SERVES;
  return /^serves/i.test(serves) ? serves : `Serves ${serves}`;
}

/**
 * Resolves an image source, prepending the backend API origin for admin-uploaded
 * catalog media paths. Leaves static /images/... paths and absolute URLs unchanged.
 */
export function resolveCatalogImageSource(src: string): string {
  if (src.startsWith("/api/v1/catalog/media/")) {
    return new URL(src, getChefmateApiUrl()).toString();
  }
  return src;
}

export function mealImage(meal: BrowserMeal): { src: string; alt: string } {
  const src = meal.image?.src?.trim();
  if (!src) return { src: FALLBACK_MEAL_IMAGE_SRC, alt: `${meal.name} — photo coming soon` };
  return {
    src: resolveCatalogImageSource(src),
    alt: meal.image?.alt?.trim() ? meal.image.alt : meal.name,
  };
}

/** Ingredients are stored as one string separated by `;` or newlines. */
export function parseIngredients(raw: string | null): readonly string[] {
  if (!raw) return [];
  return raw
    .split(/[;\n]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/** Recipe guidelines are stored as `1) step 2) step 3) step`. */
export function parseRecipeSteps(raw: string | null): readonly string[] {
  if (!raw) return [];
  const steps = raw
    .split(/\s*\d+\)\s*/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return steps.length > 0 ? steps : [raw.trim()];
}

/** Everything the browser needs to search on, lowercased once per meal. */
export function searchHaystack(meal: BrowserMeal): string {
  return [
    meal.name,
    meal.description,
    meal.categoryName,
    meal.ingredients ?? "",
    meal.recommendedSides ?? "",
    meal.optionalSides ?? "",
    meal.chefNote ?? "",
    meal.goalTags.join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

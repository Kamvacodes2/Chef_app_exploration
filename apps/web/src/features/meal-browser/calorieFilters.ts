export interface CalorieFilter {
  readonly id: string;
  readonly label: string;
  /** Inclusive lower bound, in kcal. `null` means "no lower bound". */
  readonly min: number | null;
  /** Exclusive upper bound, in kcal. `null` means "no upper bound". */
  readonly max: number | null;
}

/**
 * Calorie chips. Index 0 is the neutral option and is the only chip a meal with
 * no nutrition profile can appear under.
 */
export const CALORIE_FILTERS: readonly CalorieFilter[] = Object.freeze([
  { id: "all", label: "All Calories", min: null, max: null },
  { id: "under-600", label: "Under 600", min: null, max: 600 },
  { id: "600-800", label: "600-800 kcal", min: 600, max: 800 },
  { id: "800-1000", label: "800-1000 kcal", min: 800, max: 1000 },
  { id: "over-1000", label: "Over 1000 kcal", min: 1000, max: null },
]);

/** True when a meal's nutrition-profile calories satisfy the chosen chip. */
export function matchesCalorieFilter(filter: CalorieFilter, calories: number | null): boolean {
  if (filter.min === null && filter.max === null) return true;
  if (calories === null) return false;
  if (filter.min !== null && calories < filter.min) return false;
  if (filter.max !== null && calories >= filter.max) return false;
  return true;
}

import type { GoalId } from "../types";

/**
 * Soft starting point for the meal browser's category chip, derived from each
 * goal's `matchTags` against the real catalog vocabulary (see
 * `catalog.easychef-data.ts` `goalTags`, parsed from the source `Tags:`
 * segment). This is a PRE-SELECTION, never a hard filter: the customer can
 * always tap "All" (or any other chip) to see the full 45-meal catalog.
 *
 * Evidence for each mapping (goal `matchTags` vs. category `goalTags` mix):
 * - lose-weight (`light`, `high-protein`, `low-carb`): `carb-clever` is the
 *   only category with a real `low-carb` tag, and 4 of its 5 meals are also
 *   `high-protein` — the closest category match to this goal's tags.
 * - build-muscle (`high-protein`): `healthy-meal-prep` is 3-for-3 on
 *   `high-protein`, the strongest concentration of any category.
 * - post-partum, anti-inflammatory, mediterranean: their `matchTags`
 *   (`nourishing`, `iron-rich`, `comfort`, `plant-forward`, `omega`,
 *   `mediterranean`, `light`) barely exist (or don't exist at all) in the
 *   real meal `goalTags` vocabulary (`balanced`, `high-protein`, `low-carb`,
 *   `meal-prep`, `family-friendly`, `traditional`, `premium`, ...). Forcing a
 *   category chip here would misrepresent the data, so these goals start on
 *   "All" per the product-owner guidance to prefer no pre-selection over a
 *   bad category match.
 * - just-good-food: explicitly the no-filter escape hatch; always "All".
 */
export const GOAL_DEFAULT_CATEGORY_SLUG: Readonly<Record<GoalId, string | null>> = Object.freeze({
  "lose-weight": "carb-clever",
  "build-muscle": "healthy-meal-prep",
  "post-partum": null,
  "anti-inflammatory": null,
  mediterranean: null,
  "just-good-food": null,
});

/** Resolves a goal's soft default category slug, `null` meaning "All". */
export function defaultCategorySlugForGoal(goalId: GoalId | null): string | null {
  if (goalId === null) return null;
  return GOAL_DEFAULT_CATEGORY_SLUG[goalId] ?? null;
}

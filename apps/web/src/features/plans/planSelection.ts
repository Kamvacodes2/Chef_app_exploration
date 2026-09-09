import {
  isRecurringChefmatePlan,
  type ChefmatePlanId,
  type ChefmatePlanSelection,
  type PlanDayMealAssignments,
  type PreferredDayId,
} from "./planCatalog";
import type { MealLinkSource, PlanMealLink } from "../order-flow/state/orderReducer";
import type { OrderMenuItem } from "../order-flow/types";

export interface PlanSelectionInput {
  readonly planId: ChefmatePlanId | null;
  readonly preferredDays: readonly PreferredDayId[];
  readonly planScheduleDeferred: boolean;
  readonly favoriteMealId: string | null;
  readonly secondFavoriteMealId: string | null;
  readonly favoriteMealLink: PlanMealLink | null;
  readonly secondFavoriteMealLink: PlanMealLink | null;
  readonly favoriteMealDeferred: boolean;
  readonly extraMeals: readonly OrderMenuItem[];
  readonly extraMealLinks: readonly PlanMealLink[];
  readonly dayMealAssignments: PlanDayMealAssignments;
  readonly dayMealsDeferred: boolean;
}

const SOURCE_LABELS: Readonly<Record<MealLinkSource, string>> = Object.freeze({
  TIKTOK: "TikTok",
  INSTAGRAM: "Instagram",
  PINTEREST: "Pinterest",
  OTHER: "Other",
});

function formatMealLink(link: PlanMealLink | null): string | null {
  if (!link || link.url.trim().length === 0) return null;
  const label = SOURCE_LABELS[link.source] ?? "Other";
  return `[${label}] ${link.url.trim()}`;
}

export function buildPlanSelection(input: PlanSelectionInput): ChefmatePlanSelection | null {
  if (!input.planId) return null;

  const recurring = isRecurringChefmatePlan(input.planId);
  const deferred = input.favoriteMealDeferred;
  // Extras and day assignments only exist when the weekly menu itself was named
  // now (not deferred).
  const extraMealSlugs = deferred ? [] : input.extraMeals.map((meal) => meal.id);
  const extraMealLinks = deferred
    ? []
    : input.extraMealLinks.map((link) => formatMealLink(link)).filter((v) => v !== null);
  const assignments = deferred ? {} : { ...input.dayMealAssignments };
  const hasExtras = extraMealSlugs.length > 0 || extraMealLinks.length > 0;
  const hasAssignments = Object.keys(assignments).length > 0;

  return {
    planId: input.planId,
    preferredDays: recurring && !input.planScheduleDeferred ? [...input.preferredDays] : [],
    schedulePreference: recurring
      ? input.planScheduleDeferred
        ? "DECIDE_LATER"
        : "SELECTED_DAYS"
      : "NOT_APPLICABLE",
    favoriteMealSlug: deferred ? null : input.favoriteMealId,
    favoriteMealLink: deferred ? null : formatMealLink(input.favoriteMealLink),
    // The second meal is NOT gated on the favourite deferral: it may also be
    // picked later, at the meal-flow's "Add another meal" step, in which case
    // the favourite is deferred but the second meal is a real choice.
    secondFavoriteMealSlug: input.secondFavoriteMealId,
    secondFavoriteMealLink: deferred ? null : formatMealLink(input.secondFavoriteMealLink),
    ...(hasExtras ? { extraMealSlugs, extraMealLinks } : {}),
    ...(hasAssignments ? { dayMealAssignments: assignments } : {}),
    ...(input.dayMealsDeferred && recurring ? { dayMealsDeferred: true } : {}),
  };
}

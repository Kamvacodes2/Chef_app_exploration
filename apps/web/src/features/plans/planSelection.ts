import {
  isRecurringChefmatePlan,
  type ChefmatePlanId,
  type ChefmatePlanSelection,
  type PreferredDayId,
} from "./planCatalog";
import type { MealLinkSource, PlanMealLink } from "../order-flow/state/orderReducer";

export interface PlanSelectionInput {
  readonly planId: ChefmatePlanId | null;
  readonly preferredDays: readonly PreferredDayId[];
  readonly planScheduleDeferred: boolean;
  readonly favoriteMealId: string | null;
  readonly secondFavoriteMealId: string | null;
  readonly favoriteMealLink: PlanMealLink | null;
  readonly secondFavoriteMealLink: PlanMealLink | null;
  readonly favoriteMealDeferred: boolean;
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
  };
}

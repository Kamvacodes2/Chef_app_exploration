import {
  isRecurringChefmatePlan,
  type ChefmatePlanId,
  type ChefmatePlanSelection,
  type PreferredDayId,
} from "./planCatalog";

export interface PlanSelectionInput {
  readonly planId: ChefmatePlanId | null;
  readonly preferredDays: readonly PreferredDayId[];
  readonly planScheduleDeferred: boolean;
  readonly favoriteMealId: string | null;
  readonly secondFavoriteMealId: string | null;
  readonly favoriteMealDeferred: boolean;
}

export function buildPlanSelection(input: PlanSelectionInput): ChefmatePlanSelection | null {
  if (!input.planId) return null;

  const recurring = isRecurringChefmatePlan(input.planId);
  return {
    planId: input.planId,
    preferredDays: recurring && !input.planScheduleDeferred ? [...input.preferredDays] : [],
    schedulePreference: recurring
      ? input.planScheduleDeferred
        ? "DECIDE_LATER"
        : "SELECTED_DAYS"
      : "NOT_APPLICABLE",
    favoriteMealSlug: input.favoriteMealDeferred ? null : input.favoriteMealId,
    secondFavoriteMealSlug: input.favoriteMealDeferred ? null : input.secondFavoriteMealId,
  };
}
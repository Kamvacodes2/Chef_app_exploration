import {
  isRecurringChefmatePlan,
  type ChefmatePlanId,
  type ChefmatePlanSelection,
  type PlanDayMealAssignments,
  type PlanDayMealPlan,
  type PlanDayTimeWindows,
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
  readonly dayTimeWindows: PlanDayTimeWindows;
  readonly dayMealPlans: readonly PlanDayMealPlan[];
  readonly week2DayMealPlans: readonly PlanDayMealPlan[] | null;
  readonly week2Deferred: boolean;
  readonly firstSessionDate: string | null;
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

/** True when at least one day plan carries a real choice. */
function hasDayPlanContent(plans: readonly PlanDayMealPlan[]): boolean {
  return plans.some(
    (plan) => plan.mainSlugs.length > 0 || plan.overnightOats || plan.links.length > 0,
  );
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

  // ── Per-day planning (new flow) ─────────────────────────────────────────
  const plansEmitted = recurring && !deferred && hasDayPlanContent(input.dayMealPlans);
  const dayMealPlans = plansEmitted
    ? input.dayMealPlans
        .filter(
          (plan) => plan.mainSlugs.length > 0 || plan.overnightOats || plan.links.length > 0,
        )
        .map(({ day, mainSlugs, overnightOats, links }) => ({
          day,
          mainSlugs: [...mainSlugs],
          overnightOats,
          links: [...links],
        }))
    : null;
  const week2Emitted =
    recurring && !deferred && input.week2DayMealPlans !== null && hasDayPlanContent(input.week2DayMealPlans);
  const week2DayMealPlans = week2Emitted
    ? (input.week2DayMealPlans ?? [])
        .filter(
          (plan) => plan.mainSlugs.length > 0 || plan.overnightOats || plan.links.length > 0,
        )
        .map(({ day, mainSlugs, overnightOats, links }) => ({
          day,
          mainSlugs: [...mainSlugs],
          overnightOats,
          links: [...links],
        }))
    : null;

  const windowsEmitted =
    recurring &&
    Object.values(input.dayTimeWindows).some((value) => value !== null && value !== undefined);
  const dayTimeWindows: PlanDayTimeWindows | null = windowsEmitted ? { ...input.dayTimeWindows } : null;

  const hasDayPlans = plansEmitted || week2Emitted;

  // The new day-based contract is authoritative. Do not also flatten every
  // day's meals into the legacy "extra options" fields: the same meal may
  // intentionally appear on multiple weekdays, and those fields have a
  // different meaning in the old flow.
  const flatExtraMealSlugs = hasDayPlans ? [] : extraMealSlugs;
  const flatExtraMealLinks = hasDayPlans ? [] : extraMealLinks;

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
    secondFavoriteMealSlug: input.secondFavoriteMealId,
    secondFavoriteMealLink: deferred ? null : formatMealLink(input.secondFavoriteMealLink),
    ...(flatExtraMealSlugs.length > 0 || flatExtraMealLinks.length > 0
      ? {
          extraMealSlugs: flatExtraMealSlugs,
          extraMealLinks: flatExtraMealLinks,
        }
      : {}),
    ...(hasAssignments ? { dayMealAssignments: assignments } : {}),
    ...(input.dayMealsDeferred && recurring ? { dayMealsDeferred: true } : {}),
    ...(dayMealPlans ? { dayMealPlans } : {}),
    ...(week2DayMealPlans ? { week2DayMealPlans } : {}),
    ...(input.week2Deferred && recurring ? { week2Deferred: true } : {}),
    ...(dayTimeWindows ? { dayTimeWindows } : {}),
    ...(input.firstSessionDate ? { firstSessionDate: input.firstSessionDate } : {}),
  };
}

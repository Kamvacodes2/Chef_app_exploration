import {
  DAY_MAIN_CAPACITY,
  DAY_TIME_WINDOWS,
  findChefmatePlan,
  firstSessionDate,
  isRecurringChefmatePlan,
  weeklyMainCapacity,
  type ChefmatePlanId,
  type DayTimeWindowId,
  type PlanDayMealPlan,
  type PlanDayTimeWindows,
  type PlanDayMealAssignments,
  type PreferredDayId,
} from "@/features/plans/planCatalog";
import type { Address, ContactDetails, GoalId, OrderMenuItem } from "../types";
import {
  ALL_MENU_ITEMS,
  DESSERT_PRICE_ZAR,
  EXTRA_SIDE_PRICE_ZAR,
  INCLUDED_SIDE_COUNT,
  SECOND_MEAL_PRICE_ZAR,
} from "../constants/menu";
import { normalizeGiftCode, validateGiftCode } from "../constants/giftCodes";

export type MealLinkSource = "TIKTOK" | "INSTAGRAM" | "PINTEREST" | "OTHER";

export interface PlanMealLink {
  readonly source: MealLinkSource;
  readonly url: string;
}

export type OrderStep =
  | "goal"
  | "plan-days"
  | "plan-meals"
  | "plan-week2"
  | "plan-first-session"
  | "plan-favorite"
  | "plan-meal-days"
  | "meal"
  | "second-meal"
  | "sides"
  | "dessert"
  | "schedule"
  | "address"
  | "review"
  | "confirmed";

export interface OrderState {
  readonly step: OrderStep;
  readonly planId: ChefmatePlanId | null;
  readonly preferredDays: readonly PreferredDayId[];
  readonly planScheduleDeferred: boolean;
  readonly favoriteMealId: string | null;
  readonly secondFavoriteMealId: string | null;
  /** Full item for the second meal, so review/summary can show name + photo. */
  readonly secondFavoriteMeal: OrderMenuItem | null;
  /** Pasted-link meal references (TikTok / Instagram / Pinterest / other). */
  readonly favoriteMealLink: PlanMealLink | null;
  readonly secondFavoriteMealLink: PlanMealLink | null;
  readonly favoriteMealDeferred: boolean;
  /** Weekly mains beyond options 1 & 2 (8- and 12-session plans; capacity 6). */
  readonly extraMeals: readonly OrderMenuItem[];
  /** Pasted-link references for extra slots beyond option 2. */
  readonly extraMealLinks: readonly PlanMealLink[];
  /** Day -> meal-slug assignments from the optional match step; empty when deferred or unmatched. */
  readonly dayMealAssignments: PlanDayMealAssignments;
  /** True when the customer chose to match meals to days later on the match step. */
  readonly dayMealsDeferred: boolean;
  /** Preferred time window per weekday ("morning" / "afternoon" / "evening"). */
  readonly dayTimeWindows: PlanDayTimeWindows;
  /** Week-1 per-day meal plans (day -> mains + oats + links), in preferred-day order. */
  readonly dayMealPlans: readonly PlanDayMealPlan[];
  /** Week-2 per-day meal plans, only when the customer opted to plan week 2 now. */
  readonly week2DayMealPlans: readonly PlanDayMealPlan[] | null;
  /** True when the customer chose to plan the second week later. */
  readonly week2Deferred: boolean;
  /** The date the customer confirmed (or edited) for their first session. */
  readonly firstSessionDate: string | null;
  readonly goalId: GoalId | null;
  readonly main: OrderMenuItem | null;
  readonly sides: readonly OrderMenuItem[];
  readonly dessert: OrderMenuItem | null;
  readonly customRequest: string | null;
  /** Free breakfast add-on (overnight oats) offered to subscription plans: null = not asked, true = yes, false = no thanks. */
  readonly breakfastAddOn: boolean | null;
  readonly date: string | null;
  readonly time: string | null;
  readonly address: Address;
  readonly contact: ContactDetails;
  readonly giftCodeInput: string;
  readonly appliedGift: { code: string; discountFraction: number } | null;
  readonly giftMessage: string;
}

export const INITIAL_ORDER_STATE: OrderState = Object.freeze({
  step: "goal",
  planId: null,
  preferredDays: Object.freeze([]),
  planScheduleDeferred: false,
  favoriteMealId: null,
  secondFavoriteMealId: null,
  secondFavoriteMeal: null,
  favoriteMealLink: null,
  secondFavoriteMealLink: null,
  favoriteMealDeferred: false,
  extraMeals: Object.freeze([]),
  extraMealLinks: Object.freeze([]),
  dayMealAssignments: Object.freeze({}),
  dayMealsDeferred: false,
  dayTimeWindows: Object.freeze({}),
  dayMealPlans: Object.freeze([]),
  week2DayMealPlans: null,
  week2Deferred: false,
  firstSessionDate: null,
  goalId: null,
  main: null,
  sides: Object.freeze([]),
  dessert: null,
  customRequest: null,
  breakfastAddOn: null,
  date: null,
  time: null,
  address: Object.freeze({
    estate: "",
    unit: "",
    street: "",
    area: "",
    latitude: null,
    longitude: null,
  }),
  contact: Object.freeze({ name: "", email: "", phone: "" }),
  giftCodeInput: "",
  appliedGift: null,
  giftMessage: "",
});

export type OrderAction =
  | { type: "SELECT_GOAL"; goalId: GoalId }
  | { type: "START_PLAN_SETUP"; planId: ChefmatePlanId }
  | { type: "TOGGLE_PREFERRED_DAY"; day: PreferredDayId }
  | { type: "DECIDE_PLAN_DAYS" }
  | { type: "SET_DAY_TIME_WINDOW"; day: PreferredDayId; window: DayTimeWindowId | null }
  | { type: "TOGGLE_DAY_MEAL"; day: PreferredDayId; item: OrderMenuItem }
  | { type: "TOGGLE_WEEK2_DAY_MEAL"; day: PreferredDayId; item: OrderMenuItem }
  | { type: "TOGGLE_DAY_OATS"; day: PreferredDayId }
  | { type: "TOGGLE_WEEK2_DAY_OATS"; day: PreferredDayId }
  | { type: "SET_DAY_LINK"; day: PreferredDayId; source: MealLinkSource; url: string }
  | { type: "REMOVE_DAY_LINK"; day: PreferredDayId; url: string }
  | { type: "SET_WEEK2_DAY_LINK"; day: PreferredDayId; source: MealLinkSource; url: string }
  | { type: "REMOVE_WEEK2_DAY_LINK"; day: PreferredDayId; url: string }
  | { type: "START_WEEK2" }
  | { type: "DEFER_WEEK2" }
  | { type: "COPY_WEEK1_TO_WEEK2" }
  | { type: "CONFIRM_FIRST_SESSION"; date: string | null }
  | { type: "COMMIT_DAY_MEALS" }
  | { type: "START_MEAL_DISCOVERY" }
  | { type: "SELECT_PLAN_FAVORITE"; item: OrderMenuItem }
  | { type: "SELECT_PLAN_SECOND_FAVORITE"; item: OrderMenuItem }
  | { type: "SET_PLAN_FAVORITE_LINK"; source: MealLinkSource; url: string }
  | { type: "SET_PLAN_SECOND_FAVORITE_LINK"; source: MealLinkSource; url: string }
  | { type: "CLEAR_PLAN_FAVORITE_LINK" }
  | { type: "CLEAR_PLAN_SECOND_FAVORITE_LINK" }
  | { type: "TOGGLE_PLAN_EXTRA_MEAL"; item: OrderMenuItem }
  | { type: "SET_PLAN_EXTRA_MEAL_LINK"; source: MealLinkSource; url: string }
  | { type: "REMOVE_PLAN_EXTRA_MEAL_LINK"; url: string }
  | { type: "ASSIGN_DAY_MEAL"; day: PreferredDayId; mealId: string | null }
  | { type: "DECIDE_DAY_MEALS" }
  | { type: "DECIDE_PLAN_FAVORITE" }
  | { type: "SELECT_MAIN"; item: OrderMenuItem }
  | { type: "PRESELECT_MAIN"; item: OrderMenuItem }
  | { type: "TOGGLE_SIDE"; item: OrderMenuItem }
  | { type: "SELECT_DESSERT"; item: OrderMenuItem }
  | { type: "SKIP_DESSERT" }
  | { type: "SET_CUSTOM_REQUEST"; text: string }
  | { type: "CLEAR_CUSTOM_REQUEST" }
  | { type: "SET_BREAKFAST_ADD_ON"; value: boolean }
  | { type: "SET_DATE"; date: string }
  | { type: "SET_TIME"; time: string | null }
  | { type: "SET_ADDRESS_FIELD"; field: keyof Address; value: string }
  | { type: "SET_CONTACT_FIELD"; field: keyof ContactDetails; value: string }
  | { type: "SET_GIFT_INPUT"; value: string }
  | { type: "APPLY_GIFT" }
  | { type: "APPLY_PROMO_CODE"; code: string }
  | { type: "REMOVE_GIFT" }
  | { type: "NEXT" }
  | { type: "BACK" }
  | { type: "GO_TO"; step: OrderStep }
  | { type: "CONFIRM" }
  | { type: "RESET" };

export const STEP_ORDER: readonly OrderStep[] = Object.freeze([
  "goal",
  "plan-days",
  "plan-meals",
  "plan-week2",
  "plan-first-session",
  "plan-favorite",
  "plan-meal-days",
  "meal",
  "second-meal",
  "sides",
  "dessert",
  "schedule",
  "address",
  "review",
]);

/** True when the optional plan-meal-days match step applies to this state. */ function planMealDaysApplies(
  state: OrderState,
): boolean {
  return Boolean(
    state.planId &&
    isRecurringChefmatePlan(state.planId) &&
    !state.favoriteMealDeferred &&
    (state.extraMeals.length > 0 || state.extraMealLinks.length > 0),
  );
}

/** True while the customer is inside the recurring-plan personalisation steps. */
function isPlanFlowStep(step: OrderStep): boolean {
  return (
    step === "plan-days" ||
    step === "plan-meals" ||
    step === "plan-week2" ||
    step === "plan-first-session" ||
    step === "plan-favorite" ||
    step === "plan-meal-days"
  );
}

function dayTimeWindowCount(windows: PlanDayTimeWindows): number {
  return Object.values(windows).filter((value) => value !== null && value !== undefined).length;
}

/** Mutable-safe plan lookup for a day within a week's plans. */
function findDayPlan(
  plans: readonly PlanDayMealPlan[],
  day: PreferredDayId,
): PlanDayMealPlan | undefined {
  return plans.find((plan) => plan.day === day);
}

function updateDayPlan(
  plans: readonly PlanDayMealPlan[],
  day: PreferredDayId,
  update: (plan: PlanDayMealPlan) => PlanDayMealPlan,
): PlanDayMealPlan[] {
  const existing = findDayPlan(plans, day);
  const next = update(
    existing ?? {
      day,
      mainSlugs: Object.freeze([]),
      overnightOats: false,
      links: Object.freeze([]),
    },
  );
  const isEmpty = next.mainSlugs.length === 0 && !next.overnightOats && next.links.length === 0;
  if (isEmpty && !existing) return [...plans];
  if (isEmpty) return plans.filter((plan) => plan.day !== day);
  return existing
    ? plans.map((plan) => (plan.day === plan.day && plan.day === next.day ? next : plan))
    : [...plans, next];
}

/** A day meal plan has meaningful content when any choice was made on it. */
function dayPlanHasChoices(plan: PlanDayMealPlan | undefined): boolean {
  return Boolean(
    plan && (plan.mainSlugs.length > 0 || plan.overnightOats || plan.links.length > 0),
  );
}

function togglePlanDayMeal(
  plans: readonly PlanDayMealPlan[],
  day: PreferredDayId,
  item: OrderMenuItem,
): PlanDayMealPlan[] {
  const existingPlan = findDayPlan(plans, day);
  const already = existingPlan?.mainSlugs.includes(item.id) ?? false;
  return updateDayPlan(plans, day, (plan) => {
    const index = plan.mainSlugs.indexOf(item.id);
    if (already) {
      return {
        ...plan,
        mainSlugs: plan.mainSlugs.filter((slug) => slug !== item.id),
        mainNames: plan.mainNames?.filter((_, nameIndex) => nameIndex !== index),
      };
    }
    if (plan.mainSlugs.length >= DAY_MAIN_CAPACITY) return plan;
    return {
      ...plan,
      mainSlugs: Object.freeze([...plan.mainSlugs, item.id]),
      mainNames: Object.freeze([...(plan.mainNames ?? []), item.name]),
    };
  });
}

function togglePlanDayOats(
  plans: readonly PlanDayMealPlan[],
  day: PreferredDayId,
): PlanDayMealPlan[] {
  return updateDayPlan(plans, day, (plan) => ({ ...plan, overnightOats: !plan.overnightOats }));
}

function setPlanDayLink(
  plans: readonly PlanDayMealPlan[],
  day: PreferredDayId,
  source: MealLinkSource,
  url: string,
): PlanDayMealPlan[] {
  const formatted = `[${source}] ${url.trim()}`;
  return updateDayPlan(plans, day, (plan) => ({
    ...plan,
    links: plan.links.includes(formatted) ? plan.links : Object.freeze([...plan.links, formatted]),
  }));
}

function removePlanDayLink(
  plans: readonly PlanDayMealPlan[],
  day: PreferredDayId,
  url: string,
): PlanDayMealPlan[] {
  return updateDayPlan(plans, day, (plan) => ({
    ...plan,
    links: plan.links.filter((link) => link !== url),
  }));
}

function commitDayMealsState(state: OrderState): OrderState {
  const suggested = firstSessionDate(state.preferredDays, state.dayTimeWindows, new Date());
  const firstDay = state.preferredDays[0];
  const firstWindow = firstDay ? state.dayTimeWindows[firstDay] : null;
  const firstSlot = firstWindow
    ? (DAY_TIME_WINDOWS.find((window) => window.id === firstWindow)?.slots[0] ?? null)
    : null;
  return {
    ...state,
    firstSessionDate: state.firstSessionDate ?? suggested,
    date: state.date ?? suggested,
    time: state.time ?? firstSlot,
    favoriteMealDeferred: false,
  };
}

const NEUTRAL_DISCOVERY_GOAL_ID: GoalId = "just-good-food";

function findItem(id: string): OrderMenuItem | undefined {
  return ALL_MENU_ITEMS.find((item) => item.id === id);
}

/** Day assignments may only reference meals still named in the weekly menu. */
function pruneDayMealAssignments(state: OrderState): OrderState {
  const namedMeals = new Set(
    [
      state.favoriteMealId,
      state.secondFavoriteMealId,
      ...state.extraMeals.map((meal) => meal.id),
    ].filter((id): id is string => typeof id === "string"),
  );
  const dayMealAssignments = Object.fromEntries(
    Object.entries(state.dayMealAssignments).filter(([, mealId]) => namedMeals.has(mealId)),
  ) as PlanDayMealAssignments;
  return { ...state, dayMealAssignments };
}

/** How many extra weekly-main slots beyond options 1 & 2 the plan allows. */
function extraSlotCapacity(state: OrderState): number {
  return Math.max(0, weeklyMainCapacity(state.planId) - 2);
}

function stepAfter(state: OrderState): OrderStep {
  if (state.step === "plan-days") {
    // Days chosen -> per-day meal planning; deferred days skip straight to
    // the legacy favourite step so the flow still completes.
    return state.planScheduleDeferred || state.preferredDays.length === 0
      ? "plan-favorite"
      : "plan-meals";
  }
  if (state.step === "plan-meals") {
    return "plan-week2";
  }
  if (state.step === "plan-week2") {
    return "plan-first-session";
  }
  if (state.step === "plan-first-session") {
    return state.main ? "sides" : "meal";
  }
  if (state.step === "plan-favorite" || state.step === "plan-meal-days") {
    if (state.step === "plan-favorite" && planMealDaysApplies(state)) {
      return "plan-meal-days";
    }
    return state.main ? "sides" : "meal";
  }

  const idx = STEP_ORDER.indexOf(state.step);
  return STEP_ORDER[Math.min(idx + 1, STEP_ORDER.length - 1)] ?? "review";
}

function stepBefore(state: OrderState): OrderStep {
  if (state.step === "plan-favorite") {
    // Coming back from the legacy favourite step lands on the last planning
    // step the customer actually visited (week 2 when it was planned).
    return state.week2DayMealPlans !== null ? "plan-week2" : "plan-meals";
  }
  if (state.step === "plan-meal-days") {
    return "plan-favorite";
  }
  if (state.step === "plan-first-session") {
    return "plan-week2";
  }
  if (state.step === "plan-week2") {
    return "plan-meals";
  }
  if (state.step === "plan-meals") {
    return "plan-days";
  }

  if (
    state.step === "sides" &&
    state.planId &&
    !state.favoriteMealDeferred &&
    isRecurringChefmatePlan(state.planId)
  ) {
    return planMealDaysApplies(state) ? "plan-meal-days" : "plan-favorite";
  }

  if (state.step === "meal" && !state.planId) {
    return "goal";
  }

  // Back from meal discovery for a one-off plan (tonight) returns to goal
  if (state.step === "meal" && state.planId && !isRecurringChefmatePlan(state.planId)) {
    return "goal";
  }

  const idx = STEP_ORDER.indexOf(state.step);
  return STEP_ORDER[Math.max(idx - 1, 0)] ?? "goal";
}

export function orderReducer(state: OrderState, action: OrderAction): OrderState {
  switch (action.type) {
    case "SELECT_GOAL":
      return { ...INITIAL_ORDER_STATE, goalId: action.goalId, step: "meal" };
    case "START_MEAL_DISCOVERY":
      return {
        ...INITIAL_ORDER_STATE,
        goalId: NEUTRAL_DISCOVERY_GOAL_ID,
        step: "meal",
        // Preserve an auto-applied promo code so it survives hash-based entry
        giftCodeInput: state.giftCodeInput,
        appliedGift: state.appliedGift,
        giftMessage: state.giftMessage,
      };
    case "START_PLAN_SETUP":
      return {
        ...INITIAL_ORDER_STATE,
        planId: action.planId,
        // Recurring plans (rhythm, family, premium) start with day/personalisation
        // setup. One-off plans (tonight) skip straight to meal discovery since
        // they're a normal order, not an ongoing subscription.
        goalId: isRecurringChefmatePlan(action.planId) ? null : NEUTRAL_DISCOVERY_GOAL_ID,
        step: isRecurringChefmatePlan(action.planId) ? "plan-days" : "meal",
        // Preserve an auto-applied promo code so it survives hash-based entry
        giftCodeInput: state.giftCodeInput,
        appliedGift: state.appliedGift,
        giftMessage: state.giftMessage,
      };
    case "TOGGLE_PREFERRED_DAY": {
      const preferredDays = state.preferredDays.includes(action.day)
        ? state.preferredDays.filter((day) => day !== action.day)
        : [...state.preferredDays, action.day];
      return { ...state, preferredDays, planScheduleDeferred: false };
    }
    case "DECIDE_PLAN_DAYS":
      return { ...state, preferredDays: [], planScheduleDeferred: true };
    case "SET_DAY_TIME_WINDOW": {
      const windows: Record<string, DayTimeWindowId | null> = { ...state.dayTimeWindows };
      windows[action.day] = action.window;
      // Clearing a window for a day that is no longer preferred drops the key.
      if (action.window === null && !state.preferredDays.includes(action.day))
        delete windows[action.day];
      return { ...state, dayTimeWindows: windows };
    }
    case "TOGGLE_DAY_MEAL": {
      const nextPlans = togglePlanDayMeal(state.dayMealPlans, action.day, action.item);
      const selectedOnDay =
        nextPlans.find((plan) => plan.day === action.day)?.mainSlugs.includes(action.item.id) ??
        false;
      return {
        ...state,
        dayMealPlans: nextPlans,
        // Keep the legacy checkout main populated from the first day selection.
        // The full per-day plan is the authoritative preference payload.
        main:
          selectedOnDay || state.main?.id !== action.item.id ? (state.main ?? action.item) : null,
        favoriteMealId:
          selectedOnDay || state.favoriteMealId !== action.item.id ? state.favoriteMealId : null,
        favoriteMealDeferred: false,
        week2Deferred: false,
      };
    }
    case "TOGGLE_WEEK2_DAY_MEAL": {
      if (state.week2DayMealPlans === null) return state;
      return {
        ...state,
        week2DayMealPlans: togglePlanDayMeal(state.week2DayMealPlans, action.day, action.item),
      };
    }
    case "TOGGLE_DAY_OATS": {
      return {
        ...state,
        dayMealPlans: togglePlanDayOats(state.dayMealPlans, action.day),
        favoriteMealDeferred: false,
        week2Deferred: false,
      };
    }
    case "TOGGLE_WEEK2_DAY_OATS": {
      if (state.week2DayMealPlans === null) return state;
      return {
        ...state,
        week2DayMealPlans: togglePlanDayOats(state.week2DayMealPlans, action.day),
      };
    }
    case "SET_DAY_LINK": {
      const url = action.url.trim();
      if (url.length === 0) return state;
      return {
        ...state,
        dayMealPlans: setPlanDayLink(state.dayMealPlans, action.day, action.source, url),
        favoriteMealDeferred: false,
        week2Deferred: false,
      };
    }
    case "REMOVE_DAY_LINK":
      return {
        ...state,
        dayMealPlans: removePlanDayLink(state.dayMealPlans, action.day, action.url),
      };
    case "SET_WEEK2_DAY_LINK": {
      if (state.week2DayMealPlans === null) return state;
      const url = action.url.trim();
      if (url.length === 0) return state;
      return {
        ...state,
        week2DayMealPlans: setPlanDayLink(state.week2DayMealPlans, action.day, action.source, url),
      };
    }
    case "REMOVE_WEEK2_DAY_LINK":
      return state.week2DayMealPlans === null
        ? state
        : {
            ...state,
            week2DayMealPlans: removePlanDayLink(state.week2DayMealPlans, action.day, action.url),
          };
    case "START_WEEK2":
      return {
        ...state,
        week2DayMealPlans: Object.freeze([]),
        week2Deferred: false,
      };
    case "DEFER_WEEK2":
      return { ...state, week2DayMealPlans: null, week2Deferred: true };
    case "COPY_WEEK1_TO_WEEK2":
      return { ...state, week2DayMealPlans: state.dayMealPlans, week2Deferred: false };
    case "CONFIRM_FIRST_SESSION":
      return { ...state, firstSessionDate: action.date };
    case "COMMIT_DAY_MEALS":
      return commitDayMealsState(state);
    case "SELECT_PLAN_FAVORITE": {
      if (action.item.id === state.favoriteMealId) {
        // Toggling the current option 1 off; keep option 2.
        return pruneDayMealAssignments({
          ...state,
          favoriteMealId: null,
          favoriteMealLink: null,
          main: state.main?.id === action.item.id ? null : state.main,
          customRequest: null,
          extraMeals: state.extraMeals.filter((meal) => meal.id !== action.item.id),
        });
      }
      return pruneDayMealAssignments({
        ...state,
        favoriteMealId: action.item.id,
        favoriteMealLink: null,
        favoriteMealDeferred: false,
        // A meal can only fill one slot: if it was option 2, promote it.
        secondFavoriteMealId:
          state.secondFavoriteMealId === action.item.id ? null : state.secondFavoriteMealId,
        main: action.item,
        customRequest: null,
        extraMeals: state.extraMeals.filter((meal) => meal.id !== action.item.id),
      });
    }
    case "SELECT_PLAN_SECOND_FAVORITE": {
      if (action.item.id === state.secondFavoriteMealId) {
        return pruneDayMealAssignments({
          ...state,
          secondFavoriteMealId: null,
          secondFavoriteMeal: null,
        });
      }
      // One meal per slot: it can neither duplicate option 1 (plan-favorite
      // step) nor the main picked at the meal step.
      if (action.item.id === state.favoriteMealId || action.item.id === state.main?.id) {
        return state;
      }
      return pruneDayMealAssignments({
        ...state,
        secondFavoriteMealId: action.item.id,
        secondFavoriteMeal: action.item,
        secondFavoriteMealLink: null,
        favoriteMealDeferred: false,
        extraMeals: state.extraMeals.filter((meal) => meal.id !== action.item.id),
      });
    }
    case "TOGGLE_PLAN_EXTRA_MEAL": {
      if (state.extraMeals.some((meal) => meal.id === action.item.id)) {
        return pruneDayMealAssignments({
          ...state,
          extraMeals: state.extraMeals.filter((meal) => meal.id !== action.item.id),
        });
      }
      // One meal per slot: extras cannot duplicate the named options or the
      // main picked at the meal step.
      if (
        action.item.id === state.favoriteMealId ||
        action.item.id === state.secondFavoriteMealId ||
        action.item.id === state.main?.id
      ) {
        return state;
      }
      if (state.extraMeals.length >= extraSlotCapacity(state)) return state;
      return {
        ...state,
        extraMeals: [...state.extraMeals, action.item],
        favoriteMealDeferred: false,
        dayMealsDeferred: false,
      };
    }
    case "SET_PLAN_EXTRA_MEAL_LINK": {
      if (state.extraMealLinks.length >= extraSlotCapacity(state)) return state;
      return {
        ...state,
        extraMealLinks: [...state.extraMealLinks, { source: action.source, url: action.url }],
        favoriteMealDeferred: false,
        dayMealsDeferred: false,
      };
    }
    case "REMOVE_PLAN_EXTRA_MEAL_LINK":
      return {
        ...state,
        extraMealLinks: state.extraMealLinks.filter((link) => link.url !== action.url),
      };
    case "ASSIGN_DAY_MEAL": {
      const mutable = { ...state.dayMealAssignments } as Record<PreferredDayId, string | undefined>;
      if (action.mealId === null) delete mutable[action.day];
      else mutable[action.day] = action.mealId;
      return { ...state, dayMealAssignments: mutable, dayMealsDeferred: false };
    }
    case "DECIDE_DAY_MEALS":
      return { ...state, dayMealAssignments: Object.freeze({}), dayMealsDeferred: true };
    case "SET_PLAN_FAVORITE_LINK":
      return {
        ...state,
        favoriteMealId: null,
        favoriteMealLink: { source: action.source, url: action.url },
        favoriteMealDeferred: false,
      };
    case "SET_PLAN_SECOND_FAVORITE_LINK":
      return {
        ...state,
        secondFavoriteMealId: null,
        secondFavoriteMeal: null,
        secondFavoriteMealLink: { source: action.source, url: action.url },
        favoriteMealDeferred: false,
      };
    case "CLEAR_PLAN_FAVORITE_LINK":
      return { ...state, favoriteMealLink: null };
    case "CLEAR_PLAN_SECOND_FAVORITE_LINK":
      return { ...state, secondFavoriteMealLink: null };
    case "DECIDE_PLAN_FAVORITE":
      return {
        ...state,
        favoriteMealId: null,
        secondFavoriteMealId: null,
        secondFavoriteMeal: null,
        favoriteMealLink: null,
        secondFavoriteMealLink: null,
        favoriteMealDeferred: true,
        main: null,
        customRequest: null,
        // "I'll choose later" defers the whole weekly menu, including the
        // extra mains and any day assignments made so far.
        extraMeals: [],
        extraMealLinks: [],
        dayMealAssignments: {},
        dayMealsDeferred: false,
      };
    case "SELECT_MAIN":
      return {
        ...state,
        main: action.item,
        customRequest: null,
        // A meal can only fill one slot: picking it as the main clears it from
        // the optional second-meal slot picked at the next step.
        secondFavoriteMealId:
          state.secondFavoriteMealId === action.item.id ? null : state.secondFavoriteMealId,
        secondFavoriteMeal:
          state.secondFavoriteMeal?.id === action.item.id ? null : state.secondFavoriteMeal,
        // Meal discovery continues with the optional meal-prep second meal
        // before sides; custom requests skip it via SET_CUSTOM_REQUEST.
        step: "second-meal",
      };
    // Deep links (a landing-page "Popular this week" tile) resolve their meal
    // asynchronously from the catalog. The customer must stay on the meal step
    // with that meal highlighted, so this never advances the step and never
    // overrides a choice the customer has already made in the browser.
    case "PRESELECT_MAIN":
      if (state.step !== "meal" || state.main !== null || state.customRequest !== null) {
        return state;
      }
      return { ...state, main: action.item };
    case "TOGGLE_SIDE": {
      const exists = state.sides.some((side) => side.id === action.item.id);
      const sides = exists
        ? state.sides.filter((side) => side.id !== action.item.id)
        : [...state.sides, action.item];
      return { ...state, sides };
    }
    case "SELECT_DESSERT":
      return { ...state, dessert: action.item, step: "schedule" };
    case "SKIP_DESSERT":
      return { ...state, dessert: null, step: "schedule" };
    case "SET_CUSTOM_REQUEST": {
      const customMain: OrderMenuItem = {
        id: "custom-request",
        name: "Custom Request",
        description: action.text,
        priceDisplay: "TBC",
        price: 0,
        course: "main",
        imageSrc: "/images/loop/meal-3.webp",
        imageAlt: "Custom dish request",
        paletteId: "persimmon",
        goalTags: Object.freeze([]),
      };
      return { ...state, customRequest: action.text, main: customMain, step: "sides" };
    }
    case "CLEAR_CUSTOM_REQUEST":
      return { ...state, customRequest: null, main: null };
    case "SET_BREAKFAST_ADD_ON":
      return { ...state, breakfastAddOn: action.value };
    case "SET_DATE":
      return { ...state, date: action.date };
    case "SET_TIME":
      return { ...state, time: action.time };
    case "SET_ADDRESS_FIELD":
      return { ...state, address: { ...state.address, [action.field]: action.value } };
    case "SET_CONTACT_FIELD":
      return { ...state, contact: { ...state.contact, [action.field]: action.value } };
    case "SET_GIFT_INPUT":
      return { ...state, giftCodeInput: action.value, giftMessage: "" };
    case "APPLY_PROMO_CODE": {
      const result = validateGiftCode(action.code);
      if (result.valid) {
        return {
          ...state,
          giftCodeInput: normalizeGiftCode(action.code),
          appliedGift: {
            code: normalizeGiftCode(action.code),
            discountFraction: result.discountFraction,
          },
          giftMessage: result.message,
        };
      }
      return state;
    }
    case "APPLY_GIFT": {
      const result = validateGiftCode(state.giftCodeInput);
      if (result.valid) {
        return {
          ...state,
          appliedGift: {
            code: normalizeGiftCode(state.giftCodeInput),
            discountFraction: result.discountFraction,
          },
          giftMessage: result.message,
        };
      }
      return { ...state, appliedGift: null, giftMessage: result.message };
    }
    case "REMOVE_GIFT":
      return { ...state, appliedGift: null, giftCodeInput: "", giftMessage: "" };
    case "NEXT":
      return state.step === "plan-meals"
        ? { ...commitDayMealsState(state), step: stepAfter(state) }
        : { ...state, step: stepAfter(state) };
    case "BACK":
      if (state.step === "plan-days") {
        return INITIAL_ORDER_STATE;
      }
      if (
        state.step === "plan-favorite" &&
        (!state.planId || !isRecurringChefmatePlan(state.planId))
      ) {
        return INITIAL_ORDER_STATE;
      }
      return { ...state, step: stepBefore(state) };
    case "GO_TO":
      return { ...state, step: action.step };
    case "CONFIRM":
      return { ...state, step: "confirmed" };
    case "RESET":
      return INITIAL_ORDER_STATE;
    default:
      return state;
  }
}

export function selectSubtotal(state: OrderState): number {
  if (!state.main) return 0;

  const packageBase = findChefmatePlan(state.planId ?? "tonight")?.priceCents ?? 0;
  const extraSides = Math.max(0, state.sides.length - INCLUDED_SIDE_COUNT) * EXTRA_SIDE_PRICE_ZAR;
  const dessert = state.dessert ? DESSERT_PRICE_ZAR : 0;
  // Meal-prep second meal: included for subscription plans, flat fee for
  // once-off (tonight / no-plan) sessions.
  const isRecurringPlan = state.planId ? isRecurringChefmatePlan(state.planId) : false;
  const secondMeal = state.secondFavoriteMealId && !isRecurringPlan ? SECOND_MEAL_PRICE_ZAR : 0;
  return packageBase / 100 + extraSides + dessert + secondMeal;
}

export function selectDiscount(state: OrderState): number {
  if (!state.appliedGift) return 0;
  return Math.round(selectSubtotal(state) * state.appliedGift.discountFraction);
}

export function selectTotal(state: OrderState): number {
  return selectSubtotal(state) - selectDiscount(state);
}

export function selectCanContinue(state: OrderState, usesAccountContact = false): boolean {
  switch (state.step) {
    case "goal":
      return state.goalId !== null;
    case "plan-days":
      return state.planScheduleDeferred || state.preferredDays.length > 0;
    // Day planning never blocks: any day can be left to the chef, and the
    // whole week can be deferred at the favourite step.
    case "plan-meals":
      return true;
    case "plan-week2":
      return state.week2DayMealPlans !== null || state.week2Deferred;
    case "plan-first-session":
      return true;
    case "plan-favorite":
      return (
        state.favoriteMealDeferred ||
        state.favoriteMealId !== null ||
        state.favoriteMealLink !== null
      );
    // The optional match step never blocks: matching meals to days can always
    // be settled later with the chef.
    case "plan-meal-days":
      return true;
    case "meal":
      return state.main !== null;
    // The meal-prep second meal is optional — continue with or without it.
    case "second-meal":
    case "sides":
    case "dessert":
      return true;
    case "schedule":
      return state.date !== null && state.time !== null;
    case "address":
      if (state.address.street.trim().length <= 2 || state.address.area.trim().length <= 1)
        return false;
      return (
        usesAccountContact ||
        (state.contact.name.trim().length > 1 &&
          /^\S+@\S+\.\S+$/.test(state.contact.email) &&
          state.contact.phone.replace(/\s/g, "").length >= 8)
      );
    case "review":
      return true;
    default:
      return false;
  }
}

export { findItem };

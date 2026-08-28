import {
  findChefmatePlan,
  isRecurringChefmatePlan,
  type ChefmatePlanId,
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
  | "plan-favorite"
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
  readonly goalId: GoalId | null;
  readonly main: OrderMenuItem | null;
  readonly sides: readonly OrderMenuItem[];
  readonly dessert: OrderMenuItem | null;
  readonly customRequest: string | null;
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
  goalId: null,
  main: null,
  sides: Object.freeze([]),
  dessert: null,
  customRequest: null,
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
  | { type: "START_MEAL_DISCOVERY" }
  | { type: "SELECT_PLAN_FAVORITE"; item: OrderMenuItem }
  | { type: "SELECT_PLAN_SECOND_FAVORITE"; item: OrderMenuItem }
  | { type: "SET_PLAN_FAVORITE_LINK"; source: MealLinkSource; url: string }
  | { type: "SET_PLAN_SECOND_FAVORITE_LINK"; source: MealLinkSource; url: string }
  | { type: "CLEAR_PLAN_FAVORITE_LINK" }
  | { type: "CLEAR_PLAN_SECOND_FAVORITE_LINK" }
  | { type: "DECIDE_PLAN_FAVORITE" }
  | { type: "SELECT_MAIN"; item: OrderMenuItem }
  | { type: "PRESELECT_MAIN"; item: OrderMenuItem }
  | { type: "TOGGLE_SIDE"; item: OrderMenuItem }
  | { type: "SELECT_DESSERT"; item: OrderMenuItem }
  | { type: "SKIP_DESSERT" }
  | { type: "SET_CUSTOM_REQUEST"; text: string }
  | { type: "CLEAR_CUSTOM_REQUEST" }
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
  "plan-favorite",
  "meal",
  "second-meal",
  "sides",
  "dessert",
  "schedule",
  "address",
  "review",
]);

const NEUTRAL_DISCOVERY_GOAL_ID: GoalId = "just-good-food";

function findItem(id: string): OrderMenuItem | undefined {
  return ALL_MENU_ITEMS.find((item) => item.id === id);
}

function stepAfter(state: OrderState): OrderStep {
  if (state.step === "plan-favorite") {
    return state.main ? "sides" : "meal";
  }

  const idx = STEP_ORDER.indexOf(state.step);
  return STEP_ORDER[Math.min(idx + 1, STEP_ORDER.length - 1)] ?? "review";
}

function stepBefore(state: OrderState): OrderStep {
  if (
    state.step === "sides" &&
    state.planId &&
    !state.favoriteMealDeferred &&
    isRecurringChefmatePlan(state.planId)
  ) {
    return "plan-favorite";
  }

  if (state.step === "meal" && !state.planId) {
    return "goal";
  }

  // Back from meal discovery for a one-off plan (tonight) returns to goal
  if (state.step === "meal" && state.planId && !isRecurringChefmatePlan(state.planId)) {
    return "goal";
  }

  if (state.step === "plan-favorite") {
    return state.planId && isRecurringChefmatePlan(state.planId) ? "plan-days" : "goal";
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
    case "SELECT_PLAN_FAVORITE": {
      if (action.item.id === state.favoriteMealId) {
        // Toggling the current option 1 off; keep option 2.
        return {
          ...state,
          favoriteMealId: null,
          favoriteMealLink: null,
          main: state.main?.id === action.item.id ? null : state.main,
          customRequest: null,
        };
      }
      return {
        ...state,
        favoriteMealId: action.item.id,
        favoriteMealLink: null,
        favoriteMealDeferred: false,
        // A meal can only fill one slot: if it was option 2, promote it.
        secondFavoriteMealId:
          state.secondFavoriteMealId === action.item.id ? null : state.secondFavoriteMealId,
        main: action.item,
        customRequest: null,
      };
    }
    case "SELECT_PLAN_SECOND_FAVORITE": {
      if (action.item.id === state.secondFavoriteMealId) {
        return { ...state, secondFavoriteMealId: null, secondFavoriteMeal: null };
      }
      // One meal per slot: it can neither duplicate option 1 (plan-favorite
      // step) nor the main picked at the meal step.
      if (action.item.id === state.favoriteMealId || action.item.id === state.main?.id) {
        return state;
      }
      return {
        ...state,
        secondFavoriteMealId: action.item.id,
        secondFavoriteMeal: action.item,
        secondFavoriteMealLink: null,
        favoriteMealDeferred: false,
      };
    }
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
      return { ...state, step: stepAfter(state) };
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
    case "plan-favorite":
      return (
        state.favoriteMealDeferred ||
        state.favoriteMealId !== null ||
        state.favoriteMealLink !== null
      );
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

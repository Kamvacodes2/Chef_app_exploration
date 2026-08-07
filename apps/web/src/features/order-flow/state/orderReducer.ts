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
} from "../constants/menu";
import { normalizeGiftCode, validateGiftCode } from "../constants/giftCodes";

export type OrderStep =
  | "goal"
  | "plan-days"
  | "plan-favorite"
  | "meal"
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
  | { type: "START_MEAL_DISCOVERY" }
  | { type: "START_PLAN_SETUP"; planId: ChefmatePlanId }
  | { type: "TOGGLE_PREFERRED_DAY"; day: PreferredDayId }
  | { type: "DECIDE_PLAN_DAYS" }
  | { type: "SELECT_PLAN_FAVORITE"; item: OrderMenuItem }
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
      return { ...INITIAL_ORDER_STATE, goalId: NEUTRAL_DISCOVERY_GOAL_ID, step: "meal" };
    case "START_PLAN_SETUP":
      return {
        ...INITIAL_ORDER_STATE,
        planId: action.planId,
        // Recurring plans (rhythm, family, premium) start with day/personalisation
        // setup. One-off plans (tonight) skip straight to meal discovery since
        // they're a normal order, not an ongoing subscription.
        goalId: isRecurringChefmatePlan(action.planId) ? null : NEUTRAL_DISCOVERY_GOAL_ID,
        step: isRecurringChefmatePlan(action.planId) ? "plan-days" : "meal",
      };
    case "TOGGLE_PREFERRED_DAY": {
      const preferredDays = state.preferredDays.includes(action.day)
        ? state.preferredDays.filter((day) => day !== action.day)
        : [...state.preferredDays, action.day];
      return { ...state, preferredDays, planScheduleDeferred: false };
    }
    case "DECIDE_PLAN_DAYS":
      return { ...state, preferredDays: [], planScheduleDeferred: true };
    case "SELECT_PLAN_FAVORITE":
      return {
        ...state,
        favoriteMealId: action.item.id,
        favoriteMealDeferred: false,
        main: action.item,
        customRequest: null,
      };
    case "DECIDE_PLAN_FAVORITE":
      return {
        ...state,
        favoriteMealId: null,
        favoriteMealDeferred: true,
        main: null,
        customRequest: null,
      };
    case "SELECT_MAIN":
      return { ...state, main: action.item, customRequest: null, step: "sides" };
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
  return packageBase / 100 + extraSides + dessert;
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
      return state.favoriteMealDeferred || state.favoriteMealId !== null;
    case "meal":
      return state.main !== null;
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

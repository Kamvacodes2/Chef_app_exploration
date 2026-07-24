import type { Address, GoalId, OrderMenuItem } from "../types";
import { ALL_MENU_ITEMS } from "../constants/menu";
import { normalizeGiftCode, validateGiftCode } from "../constants/giftCodes";

export type OrderStep =
  | "goal"
  | "meal"
  | "sides"
  | "dessert"
  | "schedule"
  | "address"
  | "review"
  | "confirmed";

export interface OrderState {
  readonly step: OrderStep;
  readonly goalId: GoalId | null;
  readonly main: OrderMenuItem | null;
  readonly sides: readonly OrderMenuItem[];
  readonly dessert: OrderMenuItem | null;
  /** True when the guest picked "can't find what you want" and described a dish. */
  readonly customRequest: string | null;
  readonly date: string | null; // ISO yyyy-mm-dd
  readonly time: string | null; // "18:30"
  readonly address: Address;
  readonly giftCodeInput: string;
  readonly appliedGift: { code: string; discountFraction: number } | null;
  readonly giftMessage: string;
}

export const INITIAL_ORDER_STATE: OrderState = Object.freeze({
  step: "goal",
  goalId: null,
  main: null,
  sides: Object.freeze([]),
  dessert: null,
  customRequest: null,
  date: null,
  time: null,
  address: Object.freeze({ estate: "", unit: "", street: "" }),
  giftCodeInput: "",
  appliedGift: null,
  giftMessage: "",
});

export type OrderAction =
  | { type: "SELECT_GOAL"; goalId: GoalId }
  | { type: "SELECT_MAIN"; item: OrderMenuItem }
  | { type: "TOGGLE_SIDE"; item: OrderMenuItem }
  | { type: "SELECT_DESSERT"; item: OrderMenuItem }
  | { type: "SKIP_DESSERT" }
  | { type: "SET_CUSTOM_REQUEST"; text: string }
  | { type: "CLEAR_CUSTOM_REQUEST" }
  | { type: "SET_DATE"; date: string }
  | { type: "SET_TIME"; time: string }
  | { type: "SET_ADDRESS_FIELD"; field: keyof Address; value: string }
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
  "meal",
  "sides",
  "dessert",
  "schedule",
  "address",
  "review",
]);

function findItem(id: string): OrderMenuItem | undefined {
  return ALL_MENU_ITEMS.find((item) => item.id === id);
}

function stepAfter(current: OrderStep): OrderStep {
  const idx = STEP_ORDER.indexOf(current);
  return STEP_ORDER[Math.min(idx + 1, STEP_ORDER.length - 1)] ?? "review";
}

function stepBefore(current: OrderStep): OrderStep {
  const idx = STEP_ORDER.indexOf(current);
  return STEP_ORDER[Math.max(idx - 1, 0)] ?? "goal";
}

export function orderReducer(state: OrderState, action: OrderAction): OrderState {
  switch (action.type) {
    case "SELECT_GOAL":
      return { ...state, goalId: action.goalId, step: "meal" };

    case "SELECT_MAIN":
      return { ...state, main: action.item, customRequest: null, step: "sides" };

    case "TOGGLE_SIDE": {
      const exists = state.sides.some((s) => s.id === action.item.id);
      const sides = exists
        ? state.sides.filter((s) => s.id !== action.item.id)
        : [...state.sides, action.item];
      return { ...state, sides };
    }

    case "SELECT_DESSERT":
      return { ...state, dessert: action.item, step: "schedule" };

    case "SKIP_DESSERT":
      return { ...state, dessert: null, step: "schedule" };

    case "SET_CUSTOM_REQUEST": {
      // A custom request replaces a chosen main; the kitchen confirms it.
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
      return {
        ...state,
        customRequest: action.text,
        main: customMain,
        step: "sides",
      };
    }

    case "CLEAR_CUSTOM_REQUEST":
      return { ...state, customRequest: null, main: null };

    case "SET_DATE":
      return { ...state, date: action.date };

    case "SET_TIME":
      return { ...state, time: action.time };

    case "SET_ADDRESS_FIELD":
      return { ...state, address: { ...state.address, [action.field]: action.value } };

    case "SET_GIFT_INPUT":
      return { ...state, giftCodeInput: action.value, giftMessage: "" };

    case "APPLY_GIFT": {
      const result = validateGiftCode(state.giftCodeInput);
      if (result.valid) {
        return {
          ...state,
          appliedGift: { code: normalizeGiftCode(state.giftCodeInput), discountFraction: result.discountFraction },
          giftMessage: result.message,
        };
      }
      return { ...state, appliedGift: null, giftMessage: result.message };
    }

    case "REMOVE_GIFT":
      return { ...state, appliedGift: null, giftCodeInput: "", giftMessage: "" };

    case "NEXT":
      return { ...state, step: stepAfter(state.step) };

    case "BACK":
      return { ...state, step: stepBefore(state.step) };

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

// --- Selectors / derived helpers ---

export function selectSubtotal(state: OrderState): number {
  const mains = state.main ? state.main.price : 0;
  const sides = state.sides.reduce((sum, s) => sum + s.price, 0);
  const dessert = state.dessert ? state.dessert.price : 0;
  return mains + sides + dessert;
}

export function selectDiscount(state: OrderState): number {
  if (!state.appliedGift) return 0;
  return Math.round(selectSubtotal(state) * state.appliedGift.discountFraction);
}

export function selectTotal(state: OrderState): number {
  return selectSubtotal(state) - selectDiscount(state);
}

export function selectCanContinue(state: OrderState): boolean {
  switch (state.step) {
    case "goal":
      return state.goalId !== null;
    case "meal":
      return state.main !== null;
    case "sides":
      return true; // optional
    case "dessert":
      return true; // optional
    case "schedule":
      return state.date !== null && state.time !== null;
    case "address":
      return state.address.street.trim().length > 2; // street is the minimum viable field
    case "review":
      return true;
    default:
      return false;
  }
}

export { findItem };

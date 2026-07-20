"use client";

import { useCallback, useMemo, useReducer } from "react";
import {
  INITIAL_ORDER_STATE,
  orderReducer,
  selectCanContinue,
  selectDiscount,
  selectSubtotal,
  selectTotal,
  type OrderState,
  type OrderStep,
} from "./orderReducer";
import type { Address, GoalId, OrderMenuItem } from "../types";

export interface OrderController {
  readonly state: OrderState;
  readonly subtotal: number;
  readonly discount: number;
  readonly total: number;
  readonly canContinue: boolean;
  readonly stepIndex: number;
  readonly selectGoal: (goalId: GoalId) => void;
  readonly selectMain: (item: OrderMenuItem) => void;
  readonly toggleSide: (item: OrderMenuItem) => void;
  readonly selectDessert: (item: OrderMenuItem) => void;
  readonly skipDessert: () => void;
  readonly setCustomRequest: (text: string) => void;
  readonly clearCustomRequest: () => void;
  readonly setDate: (date: string) => void;
  readonly setTime: (time: string) => void;
  readonly setAddressField: (field: keyof Address, value: string) => void;
  readonly setGiftInput: (value: string) => void;
  readonly applyGift: () => void;
  readonly removeGift: () => void;
  readonly next: () => void;
  readonly back: () => void;
  readonly goTo: (step: OrderStep) => void;
  readonly confirm: () => void;
  readonly reset: () => void;
}

const STEP_SEQUENCE: readonly OrderStep[] = Object.freeze([
  "goal",
  "meal",
  "sides",
  "dessert",
  "schedule",
  "address",
  "review",
]);

export function useOrderController(): OrderController {
  const [state, dispatch] = useReducer(orderReducer, INITIAL_ORDER_STATE);

  const subtotal = useMemo(() => selectSubtotal(state), [state]);
  const discount = useMemo(() => selectDiscount(state), [state]);
  const total = useMemo(() => selectTotal(state), [state]);
  const canContinue = useMemo(() => selectCanContinue(state), [state]);
  const stepIndex = Math.max(0, STEP_SEQUENCE.indexOf(state.step));

  return {
    state,
    subtotal,
    discount,
    total,
    canContinue,
    stepIndex,
    selectGoal: useCallback((goalId) => dispatch({ type: "SELECT_GOAL", goalId }), []),
    selectMain: useCallback((item) => dispatch({ type: "SELECT_MAIN", item }), []),
    toggleSide: useCallback((item) => dispatch({ type: "TOGGLE_SIDE", item }), []),
    selectDessert: useCallback((item) => dispatch({ type: "SELECT_DESSERT", item }), []),
    skipDessert: useCallback(() => dispatch({ type: "SKIP_DESSERT" }), []),
    setCustomRequest: useCallback((text) => dispatch({ type: "SET_CUSTOM_REQUEST", text }), []),
    clearCustomRequest: useCallback(() => dispatch({ type: "CLEAR_CUSTOM_REQUEST" }), []),
    setDate: useCallback((date) => dispatch({ type: "SET_DATE", date }), []),
    setTime: useCallback((time) => dispatch({ type: "SET_TIME", time }), []),
    setAddressField: useCallback((field, value) => dispatch({ type: "SET_ADDRESS_FIELD", field, value }), []),
    setGiftInput: useCallback((value) => dispatch({ type: "SET_GIFT_INPUT", value }), []),
    applyGift: useCallback(() => dispatch({ type: "APPLY_GIFT" }), []),
    removeGift: useCallback(() => dispatch({ type: "REMOVE_GIFT" }), []),
    next: useCallback(() => dispatch({ type: "NEXT" }), []),
    back: useCallback(() => dispatch({ type: "BACK" }), []),
    goTo: useCallback((step) => dispatch({ type: "GO_TO", step }), []),
    confirm: useCallback(() => dispatch({ type: "CONFIRM" }), []),
    reset: useCallback(() => dispatch({ type: "RESET" }), []),
  };
}

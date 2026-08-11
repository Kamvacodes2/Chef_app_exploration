"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { getCurrentUser, type AuthenticatedUser } from "@/features/auth/api/authClient";
import { ChefmateApiError } from "@/lib/apiError";
import { normalizeGiftCode, validateGiftCode } from "../constants/giftCodes";
import {
  buildPricingQuotePayload,
  fetchPricingQuote,
  type PricingQuote,
} from "../api/pricingQuoteClient";
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
import type { Address, ContactDetails, GoalId, OrderMenuItem } from "../types";
import type { ChefmatePlanId, PreferredDayId } from "@/features/plans/planCatalog";
import {
  bookingRequestFingerprint,
  buildBookingRequestPayload,
  initializePaystackCheckout,
  submitBookingRequestPayload,
  type BookingRequestResult,
} from "../api/bookingRequestClient";

export interface OrderController {
  readonly state: OrderState;
  readonly subtotal: number;
  readonly discount: number;
  readonly total: number;
  /** Latest server-authoritative quote used to unlock checkout. */
  readonly pricingQuote?: PricingQuote | null;
  readonly isPricingLoading?: boolean;
  readonly canContinue: boolean;
  readonly stepIndex: number;
  readonly isSubmittingRequest: boolean;
  readonly submissionError: string | null;
  readonly bookingConfirmation: BookingRequestResult | null;
  /** The account identity used instead of re-entering contact details. */
  readonly authenticatedUser?: AuthenticatedUser | null;
  readonly isSessionLoading?: boolean;
  readonly selectGoal: (goalId: GoalId) => void;
  readonly startMealDiscovery: () => void;
  readonly startPlanSetup: (planId: ChefmatePlanId) => void;
  readonly togglePreferredDay: (day: PreferredDayId) => void;
  readonly decidePlanDays: () => void;
  readonly selectPlanFavorite: (item: OrderMenuItem) => void;
  readonly decidePlanFavorite: () => void;
  readonly selectMain: (item: OrderMenuItem) => void;
  /** Highlights a deep-linked meal on the meal step without advancing it. */
  readonly preselectMain: (item: OrderMenuItem) => void;
  readonly toggleSide: (item: OrderMenuItem) => void;
  readonly selectDessert: (item: OrderMenuItem) => void;
  readonly skipDessert: () => void;
  readonly setCustomRequest: (text: string) => void;
  readonly clearCustomRequest: () => void;
  readonly setDate: (date: string) => void;
  readonly setTime: (time: string | null) => void;
  readonly setAddressField: (field: keyof Address, value: string) => void;
  readonly setContactField: (field: keyof ContactDetails, value: string) => void;
  readonly setGiftInput: (value: string) => void;
  readonly applyGift: () => void;
  readonly applyPromoCode: (code: string) => void;
  readonly removeGift: () => void;
  readonly next: () => void;
  readonly back: () => void;
  readonly goTo: (step: OrderStep) => void;
  readonly confirm: () => Promise<void>;
  readonly reset: () => void;
}

const STEP_SEQUENCE: readonly OrderStep[] = Object.freeze([
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

const GENERIC_SUBMISSION_ERROR = "We couldn't send this request. Please try again.";
const STALE_IDEMPOTENCY_CODES = new Set([
  "idempotency_actor_mismatch",
  "idempotency_payload_mismatch",
]);

function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "chefmate-" + Date.now() + "-" + Math.random().toString(36).slice(2);
}

function submissionMessage(error: unknown): string {
  if (error instanceof Error && error.message.includes("NEXT_PUBLIC_CHEFMATE_API_URL"))
    return error.message;
  if (error instanceof Error && error.message.includes("Chefmate API URL")) return error.message;
  if (error instanceof ChefmateApiError && error.status === 503)
    return "We created your request, but checkout is briefly unavailable. Please try again in a moment.";
  return GENERIC_SUBMISSION_ERROR;
}

function isStaleIdempotencyError(error: unknown): boolean {
  return (
    error instanceof ChefmateApiError &&
    error.status === 409 &&
    error.code !== undefined &&
    STALE_IDEMPOTENCY_CODES.has(error.code)
  );
}

export function useOrderController(): OrderController {
  const [state, dispatch] = useReducer(orderReducer, INITIAL_ORDER_STATE);
  const promoApplied = useRef(false);

  // Auto-apply promo code from URL after client hydration
  useEffect(() => {
    if (promoApplied.current) return;
    try {
      const params = new URLSearchParams(window.location.search);
      let code = params.get("promo_code");
      if (!code) code = sessionStorage.getItem("chefmate_promo_code");
      if (code) {
        promoApplied.current = true;
        sessionStorage.removeItem("chefmate_promo_code");
        dispatch({ type: "APPLY_PROMO_CODE", code });
      }
    } catch {
      /* SSR guard */
    }
  }, []);

  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [bookingConfirmation, setBookingConfirmation] = useState<BookingRequestResult | null>(null);
  const [pricingQuote, setPricingQuote] = useState<PricingQuote | null>(null);
  const [isPricingLoading, setIsPricingLoading] = useState(false);
  const idempotencyKeyRef = useRef<string | null>(null);
  const payloadFingerprintRef = useRef<string | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    void getCurrentUser()
      .then((user) => {
        if (!cancelled) setAuthenticatedUser(user);
      })
      .catch(() => {
        if (!cancelled) setAuthenticatedUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsSessionLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);
  const pricingQuotePayload = useMemo(
    () =>
      buildPricingQuotePayload({
        main: state.main,
        sides: state.sides,
        dessert: state.dessert,
        customRequest: state.customRequest,
        appliedGift: state.appliedGift,
        planId: state.planId,
        preferredDays: state.preferredDays,
        planScheduleDeferred: state.planScheduleDeferred,
        favoriteMealId: state.favoriteMealId,
        favoriteMealDeferred: state.favoriteMealDeferred,
      }),
    [
      state.appliedGift,
      state.customRequest,
      state.dessert,
      state.favoriteMealDeferred,
      state.favoriteMealId,
      state.main,
      state.planId,
      state.planScheduleDeferred,
      state.preferredDays,
      state.sides,
    ],
  );

  useEffect(() => {
    if (!pricingQuotePayload) {
      setPricingQuote(null);
      setIsPricingLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setPricingQuote(null);
    setIsPricingLoading(true);
    void fetchPricingQuote(pricingQuotePayload, { signal: controller.signal })
      .then((quote) => {
        if (!controller.signal.aborted) setPricingQuote(quote);
      })
      .catch(() => {
        if (!controller.signal.aborted) setPricingQuote(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsPricingLoading(false);
      });

    return () => controller.abort();
  }, [pricingQuotePayload]);

  const usesAccountContact = authenticatedUser !== null;
  const subtotal = useMemo(() => selectSubtotal(state), [state]);
  const discount = useMemo(() => selectDiscount(state), [state]);
  const total = useMemo(() => selectTotal(state), [state]);
  const canContinue = useMemo(
    () =>
      state.step === "address" && isSessionLoading
        ? false
        : selectCanContinue(state, usesAccountContact),
    [isSessionLoading, state, usesAccountContact],
  );
  const stepIndex = Math.max(0, STEP_SEQUENCE.indexOf(state.step));

  const reset = useCallback(() => {
    idempotencyKeyRef.current = null;
    payloadFingerprintRef.current = null;
    submittingRef.current = false;
    setIsSubmittingRequest(false);
    setSubmissionError(null);
    setBookingConfirmation(null);
    dispatch({ type: "RESET" });
  }, []);

  const confirm = useCallback(async () => {
    if (submittingRef.current) return;
    if (isPricingLoading || !pricingQuote) {
      setSubmissionError(
        "We need to confirm the latest total before checkout. Please wait a moment and try again.",
      );
      return;
    }

    submittingRef.current = true;
    setIsSubmittingRequest(true);
    setSubmissionError(null);

    try {
      const payload = buildBookingRequestPayload(state, { useAccountContact: usesAccountContact });
      const fingerprint = bookingRequestFingerprint(payload);
      if (payloadFingerprintRef.current !== fingerprint || !idempotencyKeyRef.current) {
        payloadFingerprintRef.current = fingerprint;
        idempotencyKeyRef.current = createIdempotencyKey();
      }

      let confirmation = await submitBookingRequestPayload(payload, {
        idempotencyKey: idempotencyKeyRef.current,
      }).catch(async (error: unknown) => {
        if (!isStaleIdempotencyError(error)) throw error;
        idempotencyKeyRef.current = createIdempotencyKey();
        return submitBookingRequestPayload(payload, {
          idempotencyKey: idempotencyKeyRef.current,
        });
      });

      if (confirmation.payment?.method === "PAYSTACK") {
        const existingAuthorizationUrl = confirmation.payment.paystack?.authorizationUrl;
        if (existingAuthorizationUrl) {
          setBookingConfirmation(confirmation);
          dispatch({ type: "CONFIRM" });
          window.location.assign(existingAuthorizationUrl);
          return;
        }

        const checkout = await initializePaystackCheckout(confirmation.reference);
        confirmation = {
          ...confirmation,
          payment: checkout.payment,
        };
        setBookingConfirmation(confirmation);
        dispatch({ type: "CONFIRM" });
        window.location.assign(checkout.authorizationUrl);
        return;
      }

      setBookingConfirmation(confirmation);
      dispatch({ type: "CONFIRM" });

      // Redirect to the standalone confirmation page for non-Paystack bookings.
      // Paystack bookings redirect to the payment gateway first and come back
      // to /confirmed via the Paystack callback handler.
      if (confirmation.reference) {
        window.location.href = `/confirmed?ref=${confirmation.reference}`;
        return;
      }
    } catch (error) {
      setSubmissionError(submissionMessage(error));
    } finally {
      submittingRef.current = false;
      setIsSubmittingRequest(false);
    }
  }, [isPricingLoading, pricingQuote, state, usesAccountContact]);

  return {
    state,
    subtotal,
    discount,
    total,
    pricingQuote,
    isPricingLoading,
    canContinue,
    stepIndex,
    isSubmittingRequest,
    submissionError,
    bookingConfirmation,
    authenticatedUser,
    isSessionLoading,
    selectGoal: useCallback((goalId) => dispatch({ type: "SELECT_GOAL", goalId }), []),
    startMealDiscovery: useCallback(() => dispatch({ type: "START_MEAL_DISCOVERY" }), []),
    startPlanSetup: useCallback((planId) => dispatch({ type: "START_PLAN_SETUP", planId }), []),
    togglePreferredDay: useCallback((day) => dispatch({ type: "TOGGLE_PREFERRED_DAY", day }), []),
    decidePlanDays: useCallback(() => dispatch({ type: "DECIDE_PLAN_DAYS" }), []),
    selectPlanFavorite: useCallback((item) => dispatch({ type: "SELECT_PLAN_FAVORITE", item }), []),
    decidePlanFavorite: useCallback(() => dispatch({ type: "DECIDE_PLAN_FAVORITE" }), []),
    selectMain: useCallback((item) => dispatch({ type: "SELECT_MAIN", item }), []),
    preselectMain: useCallback((item) => dispatch({ type: "PRESELECT_MAIN", item }), []),
    toggleSide: useCallback((item) => dispatch({ type: "TOGGLE_SIDE", item }), []),
    selectDessert: useCallback((item) => dispatch({ type: "SELECT_DESSERT", item }), []),
    skipDessert: useCallback(() => dispatch({ type: "SKIP_DESSERT" }), []),
    setCustomRequest: useCallback((text) => dispatch({ type: "SET_CUSTOM_REQUEST", text }), []),
    clearCustomRequest: useCallback(() => dispatch({ type: "CLEAR_CUSTOM_REQUEST" }), []),
    setDate: useCallback((date) => dispatch({ type: "SET_DATE", date }), []),
    setTime: useCallback((time) => dispatch({ type: "SET_TIME", time }), []),
    setAddressField: useCallback(
      (field, value) => dispatch({ type: "SET_ADDRESS_FIELD", field, value }),
      [],
    ),
    setContactField: useCallback(
      (field, value) => dispatch({ type: "SET_CONTACT_FIELD", field, value }),
      [],
    ),
    setGiftInput: useCallback((value) => dispatch({ type: "SET_GIFT_INPUT", value }), []),
    applyGift: useCallback(() => dispatch({ type: "APPLY_GIFT" }), []),
    applyPromoCode: useCallback((code: string) => dispatch({ type: "APPLY_PROMO_CODE", code }), []),
    removeGift: useCallback(() => dispatch({ type: "REMOVE_GIFT" }), []),
    next: useCallback(() => dispatch({ type: "NEXT" }), []),
    back: useCallback(() => dispatch({ type: "BACK" }), []),
    goTo: useCallback((step) => dispatch({ type: "GO_TO", step }), []),
    confirm,
    reset,
  };
}

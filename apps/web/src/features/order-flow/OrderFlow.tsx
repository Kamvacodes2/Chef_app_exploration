"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { ReactElement, ReactNode } from "react";
import { usePrefersReducedMotion } from "@/features/hero/hooks/useMediaQuery";
import { fetchMeals } from "@/features/meal-browser/api/mealCatalogClient";
import { toOrderMenuItem } from "@/features/meal-browser/toOrderMenuItem";
import { useOrderController } from "./state/useOrderController";
import { OrderContext } from "./state/OrderContext";
import type { OrderStep } from "./state/orderReducer";
import { GoalSelect } from "./components/GoalSelect";
import { MealSelect } from "./components/MealSelect";
import { SecondMealSelect } from "./components/SecondMealSelect";
import { SidesSelect } from "./components/SidesSelect";
import { BreakfastAddOnModal } from "./components/BreakfastAddOnModal";
import { DessertSelect } from "./components/DessertSelect";
import { ScheduleSelect } from "./components/ScheduleSelect";
import { AddressForm } from "./components/AddressForm";
import { ReviewStep } from "./components/ReviewStep";
import { Confirmation } from "./components/Confirmation";
import { PlanDaysSelect } from "./components/PlanDaysSelect";
import { PlanFavoriteSelect } from "./components/PlanFavoriteSelect";
import { isRecurringChefmatePlan, normalizeChefmatePlanId } from "@/features/plans/planCatalog";

const STEP_COMPONENTS: Record<OrderStep, () => ReactElement> = {
  goal: GoalSelect,
  "plan-days": PlanDaysSelect,
  "plan-favorite": PlanFavoriteSelect,
  meal: MealSelect,
  "second-meal": SecondMealSelect,
  sides: SidesSelect,
  dessert: DessertSelect,
  schedule: ScheduleSelect,
  address: AddressForm,
  review: ReviewStep,
  confirmed: Confirmation,
};

const STEP_LABELS: Record<OrderStep, string> = {
  goal: "Choose your Chefmate goal",
  "plan-days": "Choose suitable Chefmate days",
  "plan-favorite": "Choose your Chefmate favourite",
  meal: "Find your Chefmate meal",
  "second-meal": "Add another Chefmate meal",
  sides: "Choose Chefmate sides",
  dessert: "Choose a Chefmate dessert",
  schedule: "Choose your Chefmate visit time",
  address: "Add your Chefmate visit address",
  review: "Review your Chefmate booking",
  confirmed: "Chefmate booking confirmed",
};

interface OrderFlowLinkTarget {
  readonly planId?: string;
  readonly mealId?: string;
}

function parseOrderFlowHash(hash: string): OrderFlowLinkTarget | null {
  const [fragment, query = ""] = hash.slice(1).split("?", 2);
  if (fragment !== "order-flow") return null;

  const params = new URLSearchParams(query);
  const planId = normalizeChefmatePlanId(params.get("plan"));
  if (planId) return { planId };

  const mealId = params.get("meal");
  return mealId ? { mealId } : {};
}

function StepBody({ children }: { children: ReactNode }): ReactElement {
  return <div className="mx-auto flex w-full max-w-6xl flex-col">{children}</div>;
}

/**
 * The full "Build your plate" order flow. A guided, single-column wizard
 * (goal tiles -> meal discovery -> sides -> dessert -> schedule -> address
 * -> review -> confirmed) rendered inside its own palette-driven section
 * below the Hero.
 * Interactive but deliberately simple: one decision per screen, a clear
 * progress rail, and a persistent Back / Continue.
 */
export function OrderFlow(): ReactElement {
  const sectionRef = useRef<HTMLElement | null>(null);
  const hasMountedRef = useRef(false);
  const controller = useOrderController();
  const {
    state,
    canContinue,
    stepIndex,
    back,
    next,
    confirm,
    startMealDiscovery,
    startPlanSetup,
    reset,
    preselectMain,
    isSubmittingRequest,
    submissionError,
    isPricingLoading,
    pricingQuote,
    setGiftInput,
    applyGift,
    setBreakfastAddOn,
  } = controller;
  const reducedMotion = usePrefersReducedMotion();

  const StepComponent = STEP_COMPONENTS[state.step];

  const isGoal = state.step === "goal";
  const isReview = state.step === "review";
  const isConfirmed = state.step === "confirmed";
  const isCustomRequest = state.main?.id === "custom-request";
  const isPlanRequest = state.planId ? isRecurringChefmatePlan(state.planId) : false;
  const showNav = !isGoal && !isConfirmed;
  // The free overnight oats breakfast add-on is offered once, right after a
  // subscription customer has picked their meal(s) and reached the sides step.
  const showBreakfastAddOn =
    state.step === "sides" && isPlanRequest && state.breakfastAddOn === null;

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return undefined;
    }

    if (state.step === "goal") {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [state.step]);

  useEffect(() => {
    let pendingFrame: number | null = null;
    // Aborted on unmount and superseded by the next deep link, so a slow
    // catalog response can never highlight a meal the customer navigated away
    // from.
    let mealLookup: AbortController | null = null;

    const scrollToOrderFlow = (): void => {
      if (pendingFrame !== null) {
        window.cancelAnimationFrame(pendingFrame);
      }

      pendingFrame = window.requestAnimationFrame(() => {
        sectionRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
        pendingFrame = null;
      });
    };

    const openBooking = (): void => {
      reset();
      scrollToOrderFlow();
    };

    /**
     * `mealSlug` comes from a landing-page tile and is a real catalog slug, so
     * it is resolved against the live catalog (the same source the meal browser
     * renders) instead of the static placeholder menu. The step opens
     * immediately; the highlight lands when the lookup resolves.
     */
    const openMealDiscovery = (mealSlug?: string): void => {
      startMealDiscovery();
      scrollToOrderFlow();

      mealLookup?.abort();
      mealLookup = null;
      if (!mealSlug) return;

      const lookup = new AbortController();
      mealLookup = lookup;
      void fetchMeals({}, { signal: lookup.signal })
        .then((meals) => {
          if (lookup.signal.aborted) return;
          const match = meals.find((meal) => meal.slug === mealSlug);
          if (match) preselectMain(toOrderMenuItem(match));
        })
        .catch(() => {
          // A failed lookup simply leaves the customer on the meal step with
          // nothing pre-selected; the browser itself surfaces catalog errors.
        });
    };

    const openPlanSetup = (planId: string): void => {
      const normalizedPlanId = normalizeChefmatePlanId(planId);
      if (!normalizedPlanId) {
        openBooking();
        return;
      }

      startPlanSetup(normalizedPlanId);
      scrollToOrderFlow();
    };

    const openFromHash = (hash: string): void => {
      const target = parseOrderFlowHash(hash);
      if (!target) {
        reset();
        return;
      }
      if (target.planId) {
        openPlanSetup(target.planId);
        return;
      }
      if (target.mealId) {
        openMealDiscovery(target.mealId);
        return;
      }
      // Bare #order-flow — skip the goal step, start meal discovery with all meals.
      // "Book a chef", "Get Started", "Explore meals", "Book a chefmate" all point here.
      openMealDiscovery();
    };
    const handleHashChange = (): void => {
      openFromHash(window.location.hash);
    };

    const handleDocumentClick = (event: MouseEvent): void => {
      // Always intercept #order-flow links first — the site header uses next/link
      // which calls event.preventDefault(), so the guard below would bail out before
      // we ever see the element. By resolving the link target before any early-return
      // checks, both Next.js <Link> and plain <a> clicks are handled identically.
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>('a[href*="#order-flow"]');
      if (!link || !link.hash) return;

      // Still respect modifier-key overrides (Cmd+click etc.) for these links.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;

      event.preventDefault();
      if (window.location.hash !== link.hash) {
        window.history.pushState(null, "", link.hash);
      }
      openFromHash(link.hash);
    };

    document.addEventListener("click", handleDocumentClick);
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", handleHashChange);
    handleHashChange();

    return () => {
      document.removeEventListener("click", handleDocumentClick);
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handleHashChange);
      mealLookup?.abort();
      if (pendingFrame !== null) {
        window.cancelAnimationFrame(pendingFrame);
      }
    };
  }, [preselectMain, reset, startMealDiscovery, startPlanSetup]);

  return (
    <OrderContext.Provider value={controller}>
      <section
        ref={sectionRef}
        className={`relative w-full overflow-hidden bg-[var(--color-oxblood)] px-4 sm:px-6 ${
          isGoal ? "py-14 sm:py-16" : "flex min-h-dvh items-center py-16 sm:py-20"
        }`}
        aria-label={STEP_LABELS[state.step]}
        data-testid="order-flow"
        aria-busy={isSubmittingRequest}
        id="order-flow"
        data-step={state.step}
      >
        <div className="relative z-10 mx-auto w-full max-w-6xl">
          {/* Animated step body */}
          <AnimatePresence mode="wait">
            <motion.div
              key={state.step}
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
              animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <StepBody>
                <StepComponent />
              </StepBody>
            </motion.div>
          </AnimatePresence>

          {/* Back / Continue */}
          {showNav && (
            <>
              <div className="mt-10 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={back}
                  disabled={stepIndex === 0}
                  className="rounded-xl px-5 py-2.5 text-sm font-semibold text-[var(--color-bone)]/70 transition-colors hover:text-[var(--color-bone)] disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-bone)]"
                >
                  &larr; Back
                </button>

                {isReview ? (
                  <button
                    type="button"
                    onClick={() => {
                      void confirm();
                    }}
                    disabled={isSubmittingRequest || isPricingLoading || !pricingQuote}
                    className="rounded-2xl bg-[var(--color-bone)] px-8 py-3 font-display text-base text-[var(--color-oxblood)] shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-bone)]"
                  >
                    {isCustomRequest
                      ? "Send request"
                      : isPlanRequest
                        ? "Send plan request"
                        : "Checkout"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={next}
                    disabled={!canContinue}
                    className="rounded-2xl bg-[var(--color-bone)] px-8 py-3 font-display text-base text-[var(--color-oxblood)] shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-bone)]"
                  >
                    Continue
                  </button>
                )}
                <p className="sr-only" aria-live="polite">
                  {isSubmittingRequest ? "Sending request" : (submissionError ?? "")}
                </p>
              </div>
              {isReview && submissionError && (
                <p
                  role="alert"
                  className="mt-3 max-w-xl rounded-2xl border border-[var(--color-bone)]/20 bg-white/[0.08] px-4 py-2 text-sm font-semibold text-[var(--color-bone)] shadow-sm"
                >
                  {submissionError}
                </p>
              )}
            </>
          )}
        </div>

        {showBreakfastAddOn && (
          <BreakfastAddOnModal
            onAccept={() => setBreakfastAddOn(true)}
            onDecline={() => setBreakfastAddOn(false)}
          />
        )}
      </section>
    </OrderContext.Provider>
  );
}

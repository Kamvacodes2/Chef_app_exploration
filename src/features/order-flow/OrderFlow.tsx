"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { ReactElement, ReactNode } from "react";
import { usePrefersReducedMotion } from "@/features/hero/hooks/useMediaQuery";
import { useOrderController } from "./state/useOrderController";
import { OrderContext } from "./state/OrderContext";
import type { OrderStep } from "./state/orderReducer";
import { GoalSelect } from "./components/GoalSelect";
import { MealSelect } from "./components/MealSelect";
import { SidesSelect } from "./components/SidesSelect";
import { DessertSelect } from "./components/DessertSelect";
import { ScheduleSelect } from "./components/ScheduleSelect";
import { AddressForm } from "./components/AddressForm";
import { ReviewStep } from "./components/ReviewStep";
import { Confirmation } from "./components/Confirmation";

const STEP_COMPONENTS: Record<OrderStep, () => ReactElement> = {
  goal: GoalSelect,
  meal: MealSelect,
  sides: SidesSelect,
  dessert: DessertSelect,
  schedule: ScheduleSelect,
  address: AddressForm,
  review: ReviewStep,
  confirmed: Confirmation,
};

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
  const { state, canContinue, stepIndex, back, next, confirm } = controller;
  const reducedMotion = usePrefersReducedMotion();

  const StepComponent = STEP_COMPONENTS[state.step];

  const isGoal = state.step === "goal";
  const isReview = state.step === "review";
  const isConfirmed = state.step === "confirmed";
  const showNav = !isGoal && !isConfirmed;

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [state.step]);

  return (
    <OrderContext.Provider value={controller}>
      <section
        ref={sectionRef}
        className={`relative w-full overflow-hidden bg-[var(--color-oxblood)] px-4 sm:px-6 ${
          isGoal ? "py-14 sm:py-16" : "flex min-h-dvh items-center py-16 sm:py-20"
        }`}
        aria-label={isGoal ? "Choose your Chefmate goal" : "Find your Chefmate meal"}
        data-testid="order-flow"
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
                  onClick={confirm}
                  className="rounded-2xl bg-[var(--color-bone)] px-8 py-3 font-display text-base text-[var(--color-oxblood)] shadow-lg transition-transform hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-bone)]"
                >
                  Send request
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
            </div>
          )}
        </div>
      </section>
    </OrderContext.Provider>
  );
}

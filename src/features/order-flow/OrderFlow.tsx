"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { getPalette } from "@/features/hero/constants/palettes";
import { usePrefersReducedMotion } from "@/features/hero/hooks/useMediaQuery";
import { cn } from "@/lib/cn";
import { GOALS } from "./constants/goals";
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

const STEP_META: ReadonlyArray<{ id: OrderStep; label: string }> = Object.freeze([
  Object.freeze({ id: "goal", label: "Goal" }),
  Object.freeze({ id: "meal", label: "Meal" }),
  Object.freeze({ id: "sides", label: "Sides" }),
  Object.freeze({ id: "dessert", label: "Dessert" }),
  Object.freeze({ id: "schedule", label: "Delivery" }),
  Object.freeze({ id: "address", label: "Address" }),
  Object.freeze({ id: "review", label: "Review" }),
]);

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
  return <div className="mx-auto flex w-full max-w-5xl flex-col">{children}</div>;
}

/**
 * The full "Build your plate" order flow. A guided, single-column wizard
 * (goal -> meal -> sides -> dessert -> schedule -> address -> review ->
 * confirmed) rendered inside its own palette-driven section below the Hero.
 * Interactive but deliberately simple: one decision per screen, a clear
 * progress rail, and a persistent Back / Continue.
 */
export function OrderFlow(): ReactElement {
  const controller = useOrderController();
  const { state, canContinue, stepIndex, back, next, confirm } = controller;
  const reducedMotion = usePrefersReducedMotion();

  const StepComponent = STEP_COMPONENTS[state.step];

  // Palette follows the chosen goal (falls back to the warm olive base).
  const palette = useMemo(() => {
    const goal = GOALS.find((g) => g.id === state.goalId);
    return getPalette(goal?.paletteId ?? "olive");
  }, [state.goalId]);

  const isReview = state.step === "review";
  const isConfirmed = state.step === "confirmed";
  const showNav = !isConfirmed;

  return (
    <OrderContext.Provider value={controller}>
      <section
        className="relative w-full overflow-hidden px-6 py-16 sm:py-20"
        aria-label="Build your plate — order flow"
        data-testid="order-flow"
        data-step={state.step}
        style={{
          backgroundImage: `linear-gradient(180deg, ${palette.from}, ${palette.to}, ${palette.from})`,
          transition: "background-image 0.6s ease",
        }}
      >
        {/* Dark overlay to keep the light cream UI legible on light palettes.
            pointer-events-none so it never intercepts taps on the cards. */}
        <div className="pointer-events-none absolute inset-0 bg-[#1A1208]/55" aria-hidden="true" />

        <div className="relative z-10 mx-auto w-full max-w-5xl">
          {/* Progress rail */}
          {!isConfirmed && (
            <ol className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-1" aria-label="Order progress">
              {STEP_META.map((meta, i) => {
                const isCurrent = i === stepIndex;
                const isDone = i < stepIndex;
                return (
                  <li key={meta.id} className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
                        isCurrent && "bg-[#F3E3B2] text-[#1A1208]",
                        isDone && "bg-[#F3E3B2]/40 text-[#1A1208]",
                        !isCurrent && !isDone && "bg-white/10 text-[#F3E3B2]/50",
                      )}
                      aria-current={isCurrent ? "step" : undefined}
                    >
                      {isDone ? "✓" : i + 1}
                    </span>
                    <span
                      className={cn(
                        "hidden text-xs font-semibold sm:inline",
                        isCurrent ? "text-[#F3E3B2]" : "text-[#F3E3B2]/50",
                      )}
                    >
                      {meta.label}
                    </span>
                    {i < STEP_META.length - 1 && <span className="text-[#F3E3B2]/20" aria-hidden="true">·</span>}
                  </li>
                );
              })}
            </ol>
          )}

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
                className="rounded-full px-5 py-2.5 text-sm font-semibold text-[#F3E3B2]/70 transition-colors hover:text-[#F3E3B2] disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F3E3B2]"
              >
                ← Back
              </button>

              {isReview ? (
                <button
                  type="button"
                  onClick={confirm}
                  className="rounded-full bg-[#F3E3B2] px-8 py-3 font-display text-base text-[#1A1208] shadow-lg transition-transform hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F3E3B2]"
                >
                  Place order
                </button>
              ) : (
                <button
                  type="button"
                  onClick={next}
                  disabled={!canContinue}
                  className="rounded-full bg-[#F3E3B2] px-8 py-3 font-display text-base text-[#1A1208] shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F3E3B2]"
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

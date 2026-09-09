"use client";

import type { ReactElement } from "react";
import {
  PREFERRED_DAYS,
  findChefmatePlan,
  type PlanDayMealAssignments,
  type PreferredDayId,
} from "@/features/plans/planCatalog";
import { cn } from "@/lib/cn";
import { useOrder } from "../state/OrderContext";

/**
 * "Match meals to your days?" — optional step for 8- and 12-session plans that
 * named extra weekly mains. For every preferred day chosen at the day step the
 * customer can pin one of their named meals, or leave it to the chef. The
 * whole step is skippable ("We'll work it out together") and never blocks.
 *
 * Pasted-link meals cannot be pinned to a day here — there is no catalog slug
 * to reference — so only named catalog meals appear in the pickers. The chef
 * settles those links during the scheduling conversation. All meal names come
 * from order state (the picker step stored full items), so no catalog fetch is
 * needed on this step.
 */
export function PlanMealDaysSelect(): ReactElement {
  const { state, assignDayMeal, decideDayMeals, reset } = useOrder();
  const plan = findChefmatePlan(state.planId);

  if (!plan) {
    return <div />;
  }

  /** Named weekly meals that can be pinned to a day, in slot order. */
  const namedMeals: readonly { slug: string; name: string }[] = [
    state.main && state.favoriteMealId === state.main.id
      ? { slug: state.favoriteMealId, name: state.main.name }
      : null,
    state.secondFavoriteMealId && state.secondFavoriteMeal
      ? { slug: state.secondFavoriteMealId, name: state.secondFavoriteMeal.name }
      : null,
    ...state.extraMeals.map((meal) => ({ slug: meal.id, name: meal.name })),
  ].filter((entry): entry is { slug: string; name: string } => entry !== null);
  const assignments = state.dayMealAssignments as PlanDayMealAssignments;
  const assignedCount = Object.keys(assignments).length;

  const mealLabel = (slug: string): string =>
    namedMeals.find((meal) => meal.slug === slug)?.name ?? slug;

  return (
    <div className="flex w-full flex-col gap-7">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--color-bone)]/70">
          {plan.name}
        </p>
        <h2 className="font-display text-3xl font-semibold text-[var(--color-bone)] sm:text-4xl">
          Match meals to your days?
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-[var(--color-bone)]/72">
          If you already know what you want on each day, pin it here. Any day you leave open is your
          chef&apos;s choice from your named meals — this is a preference, not a locked-in plan.
        </p>
      </div>

      {state.planScheduleDeferred || state.preferredDays.length === 0 ? (
        <p className="max-w-2xl rounded-2xl bg-white/[0.08] px-4 py-3 text-sm text-[var(--color-bone)] ring-1 ring-white/10">
          You chose to settle your days later, so we&apos;ll match meals to days together then. Your
          named meals are saved to your menu.
        </p>
      ) : namedMeals.length === 0 ? (
        <p className="text-sm text-[var(--color-bone)]/70">
          No named meals to match yet — your chef will help you choose each visit.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {state.preferredDays.map((dayId) => {
            const day = PREFERRED_DAYS.find((candidate) => candidate.id === dayId);
            if (!day) return null;
            const selected = assignments[dayId as PreferredDayId] ?? "";
            return (
              <div
                key={dayId}
                className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/[0.07] px-4 py-3 ring-1 ring-white/15"
              >
                <span className="w-24 text-sm font-bold text-[var(--color-bone)]">{day.label}</span>
                <label className="sr-only" htmlFor={`day-meal-${dayId}`}>
                  Meal for {day.label}
                </label>
                <select
                  id={`day-meal-${dayId}`}
                  value={selected}
                  onChange={(event) =>
                    assignDayMeal(dayId as PreferredDayId, event.target.value || null)
                  }
                  className={cn(
                    "min-h-11 flex-1 rounded-xl border border-white/20 bg-[var(--color-bone)] px-4 text-sm font-semibold text-[var(--color-oxblood)] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--color-bone)]",
                    selected === "" && "text-[var(--color-oxblood)]/60",
                  )}
                >
                  <option value="">Chef&apos;s choice from my meals</option>
                  {namedMeals.map((meal, index) => (
                    <option
                      key={meal.slug}
                      value={meal.slug}
                    >{`Option ${index + 1}: ${meal.name}`}</option>
                  ))}
                </select>
              </div>
            );
          })}
          <p className="text-xs text-[var(--color-bone)]/62" aria-live="polite">
            {assignedCount > 0
              ? `${assignedCount} ${assignedCount === 1 ? "day" : "days"} pinned.`
              : "No days pinned yet — every day stays chef's choice."}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-pressed={state.dayMealsDeferred}
          onClick={decideDayMeals}
          className={cn(
            "min-h-11 rounded-xl px-5 text-sm font-bold ring-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-bone)]",
            state.dayMealsDeferred
              ? "bg-[var(--color-bone)] text-[var(--color-oxblood)] ring-[var(--color-bone)]"
              : "bg-white/[0.07] text-[var(--color-bone)] ring-white/15 hover:bg-white/[0.13]",
          )}
        >
          We&apos;ll work it out together
        </button>
        <p className="text-sm text-[var(--color-bone)]/62">
          {state.dayMealsDeferred
            ? "Your chef will help you plan each week."
            : "You can change these matches whenever you need to."}
        </p>
      </div>

      <a
        href="#plans"
        onClick={reset}
        className="w-fit text-sm font-bold text-[var(--color-bone)] underline decoration-[var(--color-bone)]/40 underline-offset-4 transition hover:decoration-[var(--color-bone)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-bone)]"
      >
        Choose another package
      </a>
    </div>
  );
}

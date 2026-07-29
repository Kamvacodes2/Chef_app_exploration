"use client";

import type { ReactElement } from "react";
import { findChefmatePlan } from "@/features/plans/planCatalog";
import { IN_DEMAND_IDS, MAINS } from "../constants/menu";
import { DishCard } from "./DishCard";
import { useOrder } from "../state/OrderContext";

const FAVOURITE_MEALS = IN_DEMAND_IDS.map((id) => MAINS.find((meal) => meal.id === id)).filter(
  (meal): meal is (typeof MAINS)[number] => Boolean(meal),
);

export function PlanFavoriteSelect(): ReactElement {
  const { state, selectPlanFavorite, decidePlanFavorite, reset } = useOrder();
  const plan = findChefmatePlan(state.planId);

  if (!plan) {
    return <div />;
  }

  return (
    <div className="flex w-full flex-col gap-7">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--color-bone)]/70">
          {plan.name}
        </p>
        <h2 className="font-display text-3xl font-semibold text-[var(--color-bone)] sm:text-4xl">
          What would you like most often?
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-[var(--color-bone)]/72">
          Pick a favourite for your first Chefmate menu. You can change things up with every visit.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FAVOURITE_MEALS.map((meal) => (
          <DishCard
            key={meal.id}
            item={meal}
            selected={state.favoriteMealId === meal.id}
            onSelect={() => selectPlanFavorite(meal)}
            badge={meal.isSignature ? "SA favourite" : "Popular"}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-pressed={state.favoriteMealDeferred}
          onClick={decidePlanFavorite}
          className={
            "min-h-11 rounded-xl px-5 text-sm font-bold ring-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-bone)] " +
            (state.favoriteMealDeferred
              ? "bg-[var(--color-bone)] text-[var(--color-oxblood)] ring-[var(--color-bone)]"
              : "bg-white/[0.07] text-[var(--color-bone)] ring-white/15 hover:bg-white/[0.13]")
          }
        >
          I&apos;ll choose later
        </button>
        <p className="text-sm text-[var(--color-bone)]/62">
          Choosing later takes you to the full menu before your first booking.
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

"use client";

import type { ReactElement } from "react";
import { findChefmatePlan } from "@/features/plans/planCatalog";
import { cn } from "@/lib/cn";
import { useOrder } from "../state/OrderContext";
import { PlanMealsSelect } from "./PlanMealsSelect";

export function PlanWeek2Select(): ReactElement {
  const { state, startWeek2, deferWeek2 } = useOrder();
  const plan = findChefmatePlan(state.planId);

  if (!plan) return <div />;

  if (state.week2DayMealPlans !== null) {
    return <PlanMealsSelect week2 />;
  }

  return (
    <div className="flex w-full flex-col gap-7">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--color-bone)]/70">
          {plan.name} · Week 2
        </p>
        <h2 className="font-display text-3xl font-semibold text-[var(--color-bone)] sm:text-4xl">
          Would you like to plan the following week too?
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-[var(--color-bone)]/72">
          You can make fresh meal choices for your next planned week now, or leave it for later.
          Nothing is locked in — your chef can help you change it.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={startWeek2}
          className={cn(
            "min-h-24 rounded-2xl px-5 py-4 text-left ring-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-bone)]",
            "bg-[var(--color-bone)] text-[var(--color-oxblood)] ring-[var(--color-bone)]",
          )}
        >
          <span className="block font-display text-xl">Plan week 2 now</span>
          <span className="mt-1 block text-sm opacity-70">
            Choose fresh meals for the same preferred days.
          </span>
        </button>
        <button
          type="button"
          onClick={deferWeek2}
          className="min-h-24 rounded-2xl bg-white/[0.07] px-5 py-4 text-left text-[var(--color-bone)] ring-1 ring-white/15 transition-colors hover:bg-white/[0.13] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-bone)]"
        >
          <span className="block font-display text-xl">I&apos;ll do it later</span>
          <span className="mt-1 block text-sm text-[var(--color-bone)]/65">
            We&apos;ll plan the next week together.
          </span>
        </button>
      </div>
    </div>
  );
}

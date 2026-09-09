"use client";

import type { ReactElement } from "react";
import {
  DAY_TIME_WINDOWS,
  PREFERRED_DAYS,
  findChefmatePlan,
  type PreferredDayId,
} from "@/features/plans/planCatalog";
import { cn } from "@/lib/cn";
import { useOrder } from "../state/OrderContext";

export function PlanDaysSelect(): ReactElement {
  const { state, togglePreferredDay, decidePlanDays, setDayTimeWindow, reset } = useOrder();
  const plan = findChefmatePlan(state.planId);

  if (!plan) return <div />;

  return (
    <div className="flex w-full flex-col gap-7">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--color-bone)]/70">
          {plan.name}
        </p>
        <h2 className="font-display text-3xl font-semibold text-[var(--color-bone)] sm:text-4xl">
          Which days and times suit you?
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-[var(--color-bone)]/72">
          Choose the weekdays that usually work and a preferred time window for each one. These are
          flexible preferences — you can change the date or time for your first session before
          checkout.
        </p>
      </div>

      <div
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        role="group"
        aria-label="Preferred days"
      >
        {PREFERRED_DAYS.map((day) => {
          const selected = state.preferredDays.includes(day.id);
          const selectedWindow = state.dayTimeWindows[day.id] ?? null;
          return (
            <div key={day.id} className="flex flex-col gap-2">
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => togglePreferredDay(day.id)}
                className={cn(
                  "min-h-16 rounded-xl px-5 text-left text-sm font-bold ring-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-bone)]",
                  selected
                    ? "bg-[var(--color-bone)] text-[var(--color-oxblood)] ring-[var(--color-bone)]"
                    : "bg-white/[0.07] text-[var(--color-bone)] ring-white/15 hover:bg-white/[0.13]",
                )}
              >
                <span className="block">{day.label}</span>
                <span
                  className={cn(
                    "mt-1 block text-xs font-medium",
                    selected ? "text-[var(--color-oxblood)]/65" : "text-[var(--color-bone)]/55",
                  )}
                >
                  {selected ? "Selected" : "Available"}
                </span>
              </button>
              {selected ? (
                <div
                  className="flex flex-col gap-2"
                  role="group"
                  aria-label={`Preferred time for ${day.label}`}
                >
                  <span className="text-xs font-bold text-[var(--color-bone)]/65">
                    Preferred time
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {DAY_TIME_WINDOWS.map((window) => {
                      const active = selectedWindow === window.id;
                      return (
                        <button
                          key={window.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() =>
                            setDayTimeWindow?.(day.id as PreferredDayId, active ? null : window.id)
                          }
                          className={cn(
                            "min-h-10 rounded-lg px-2 text-xs font-bold ring-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-bone)]",
                            active
                              ? "bg-[var(--color-bone)] text-[var(--color-oxblood)] ring-[var(--color-bone)]"
                              : "bg-white/[0.07] text-[var(--color-bone)] ring-white/15 hover:bg-white/[0.13]",
                          )}
                        >
                          {window.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-pressed={state.planScheduleDeferred}
          onClick={decidePlanDays}
          className={cn(
            "min-h-11 rounded-xl px-5 text-sm font-bold ring-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-bone)]",
            state.planScheduleDeferred
              ? "bg-[var(--color-bone)] text-[var(--color-oxblood)] ring-[var(--color-bone)]"
              : "bg-white/[0.07] text-[var(--color-bone)] ring-white/15 hover:bg-white/[0.13]",
          )}
        >
          Decide later
        </button>
        <p className="text-sm text-[var(--color-bone)]/62">
          {state.planScheduleDeferred
            ? "We will work out the best routine with you later."
            : "You can still change these preferences whenever you need to."}
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

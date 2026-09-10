"use client";

import { useState } from "react";
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
  const { state, togglePreferredDay, decidePlanDays, setDayTimeWindow, setDayTimeSlot, reset } =
    useOrder();
  const plan = findChefmatePlan(state.planId);
  // Which day's slot list is expanded. Selecting a time closes the panel and
  // the chosen time stays visible on the day card itself.
  const [openSlotsDay, setOpenSlotsDay] = useState<PreferredDayId | null>(null);

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
          Choose the weekdays that usually work, then pick a preferred time window and an exact
          start time for each one. These are flexible preferences — you can change the date or time
          for your first session before checkout.
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
          const selectedSlot = state.dayTimeSlots[day.id] ?? null;
          const slotsOpen = selected && openSlotsDay === day.id;
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
                          aria-expanded={active && slotsOpen}
                          onClick={() => {
                            if (active && slotsOpen) {
                              setOpenSlotsDay(null);
                              return;
                            }
                            if (!active) setDayTimeWindow?.(day.id as PreferredDayId, window.id);
                            setOpenSlotsDay(day.id);
                          }}
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
                  {selectedWindow && slotsOpen
                    ? (() => {
                        const windowDef = DAY_TIME_WINDOWS.find(
                          (candidate) => candidate.id === selectedWindow,
                        );
                        if (!windowDef) return null;
                        return (
                          <div
                            className="flex flex-col gap-1.5 rounded-lg bg-white/[0.05] p-2 ring-1 ring-white/10"
                            aria-label={`${windowDef.label} times for ${day.label}`}
                          >
                            <span className="text-[11px] font-semibold text-[var(--color-bone)]/60">
                              {windowDef.range} — pick a start time
                            </span>
                            <div className="grid grid-cols-3 gap-1.5">
                              {windowDef.slots.map((slot) => {
                                const slotActive = selectedSlot === slot;
                                return (
                                  <button
                                    key={slot}
                                    type="button"
                                    aria-pressed={slotActive}
                                    onClick={() => {
                                      setDayTimeSlot?.(day.id as PreferredDayId, slot);
                                      // Store and close: the choice shows on the day card.
                                      setOpenSlotsDay(null);
                                    }}
                                    className={cn(
                                      "min-h-9 rounded-md px-1 text-xs font-bold ring-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-bone)]",
                                      slotActive
                                        ? "bg-[var(--color-bone)] text-[var(--color-oxblood)] ring-[var(--color-bone)]"
                                        : "bg-white/[0.07] text-[var(--color-bone)] ring-white/15 hover:bg-white/[0.13]",
                                    )}
                                  >
                                    {slot}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()
                    : null}
                  {selectedSlot ? (
                    <p className="text-xs font-bold text-[var(--color-bone)]/75">
                      Starts around {selectedSlot}
                    </p>
                  ) : null}
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

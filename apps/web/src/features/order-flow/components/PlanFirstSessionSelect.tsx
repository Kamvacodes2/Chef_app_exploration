"use client";

import { useState } from "react";
import type { ReactElement } from "react";
import { PREFERRED_DAYS, findChefmatePlan, isoWeekday } from "@/features/plans/planCatalog";
import { cn } from "@/lib/cn";
import { useOrder } from "../state/OrderContext";
import { ScheduleSelect } from "./ScheduleSelect";

type FirstSessionChoice = "later" | "now";

function formatDate(iso: string | null): string {
  if (!iso) return "the next available selected weekday";
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "full",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1)));
}

export function PlanFirstSessionSelect(): ReactElement {
  const { state } = useOrder();
  const plan = findChefmatePlan(state.planId);
  const [choice, setChoice] = useState<FirstSessionChoice>("later");
  const selectedDay = state.firstSessionDate
    ? (PREFERRED_DAYS[
        isoWeekday(state.firstSessionDate) === 0 ? 6 : isoWeekday(state.firstSessionDate) - 1
      ]?.label ?? null)
    : null;

  if (!plan) return <div />;

  return (
    <div className="flex w-full flex-col gap-7">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--color-bone)]/70">
          {plan.name} · First session
        </p>
        <h2 className="font-display text-3xl font-semibold text-[var(--color-bone)] sm:text-4xl">
          Order your first session now?
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-[var(--color-bone)]/72">
          We found the nearest available weekday from your preferences using South African time.
          Choose whether you want to use it as-is for now or edit the date and time before you
          continue.
        </p>
      </div>

      <div className="rounded-3xl bg-[var(--color-bone)] p-5 text-[var(--color-oxblood)] shadow-lg sm:p-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] opacity-65">
          Provisional first session
        </p>
        <p className="mt-2 font-display text-2xl font-semibold">
          {formatDate(state.firstSessionDate)}
        </p>
        {selectedDay ? (
          <p className="mt-1 text-sm opacity-70">Nearest preferred day: {selectedDay}</p>
        ) : null}
        {state.time && choice === "later" ? (
          <p className="mt-1 text-sm opacity-70">Preferred time starts around {state.time}</p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="First session choice">
        <button
          type="button"
          aria-pressed={choice === "later"}
          onClick={() => setChoice("later")}
          className={cn(
            "rounded-2xl p-5 text-left ring-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-bone)]",
            choice === "later"
              ? "bg-[var(--color-bone)] text-[var(--color-oxblood)] ring-[var(--color-bone)]"
              : "bg-white/[0.07] text-[var(--color-bone)] ring-white/15 hover:bg-white/[0.13]",
          )}
        >
          <span className="block font-display text-xl">
            Yes, order this first session and I&apos;ll edit it later
          </span>
          <span
            className={cn(
              "mt-2 block text-sm leading-6",
              choice === "later" ? "opacity-70" : "text-[var(--color-bone)]/65",
            )}
          >
            Use the provisional date and edit the exact date or time later in the normal scheduling
            step.
          </span>
        </button>
        <button
          type="button"
          aria-pressed={choice === "now"}
          onClick={() => setChoice("now")}
          className={cn(
            "rounded-2xl p-5 text-left ring-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-bone)]",
            choice === "now"
              ? "bg-[var(--color-bone)] text-[var(--color-oxblood)] ring-[var(--color-bone)]"
              : "bg-white/[0.07] text-[var(--color-bone)] ring-white/15 hover:bg-white/[0.13]",
          )}
        >
          <span className="block font-display text-xl">I&apos;ll edit it now</span>
          <span
            className={cn(
              "mt-2 block text-sm leading-6",
              choice === "now" ? "opacity-70" : "text-[var(--color-bone)]/65",
            )}
          >
            Choose the date and themed time slot for your first session right here.
          </span>
        </button>
      </div>

      {choice === "now" ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4 sm:p-6">
          <ScheduleSelect />
        </div>
      ) : null}
    </div>
  );
}

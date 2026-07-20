"use client";

import { useMemo } from "react";
import type { ReactElement } from "react";
import { useOrder } from "../state/OrderContext";
import { cn } from "@/lib/cn";

const TIME_SLOTS = Object.freeze(["12:00", "13:00", "17:00", "18:00", "18:30", "19:00", "19:30", "20:00"]);

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function friendlyDay(d: Date): string {
  return d.toLocaleDateString("en-ZA", { weekday: "short" });
}

function friendlyDate(d: Date): string {
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

/**
 * Schedule: pick a delivery day (next 7 days) and a time slot. Both are
 * required before continuing.
 */
export function ScheduleSelect(): ReactElement {
  const { state, setDate, setTime } = useOrder();

  const days = useMemo(() => {
    const out: { iso: string; day: string; date: string; label: string }[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      out.push({
        iso: toISODate(d),
        day: i === 0 ? "Today" : i === 1 ? "Tomorrow" : friendlyDay(d),
        date: friendlyDate(d),
        label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : `${friendlyDay(d)} ${friendlyDate(d)}`,
      });
    }
    return out;
  }, []);

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-3xl font-semibold text-[#F3E3B2] sm:text-4xl">When should we deliver?</h2>
        <p className="text-sm text-[#F3E3B2]/70">Pick a day and a time slot.</p>
      </div>

      <section aria-label="Delivery day">
        <h3 className="mb-3 text-xs font-extrabold uppercase tracking-[0.2em] text-[#F3E3B2]/80">Day</h3>
        <div className="flex flex-wrap gap-2">
          {days.map((d) => {
            const selected = state.date === d.iso;
            return (
              <button
                key={d.iso}
                type="button"
                onClick={() => setDate(d.iso)}
                aria-pressed={selected}
                className={cn(
                  "flex min-w-[72px] flex-col items-center gap-0.5 rounded-2xl px-4 py-3 ring-1 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F3E3B2]",
                  selected
                    ? "bg-[#F3E3B2] text-[#1A1208] ring-[#F3E3B2]"
                    : "bg-white/[0.06] text-[#F3E3B2] ring-white/10 hover:bg-white/[0.12]",
                )}
              >
                <span className="text-xs font-bold uppercase tracking-wide">{d.day}</span>
                <span className={cn("text-xs", selected ? "text-[#1A1208]/70" : "text-[#F3E3B2]/60")}>{d.date}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-label="Delivery time">
        <h3 className="mb-3 text-xs font-extrabold uppercase tracking-[0.2em] text-[#F3E3B2]/80">Time slot</h3>
        <div className="flex flex-wrap gap-2">
          {TIME_SLOTS.map((t) => {
            const selected = state.time === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTime(t)}
                aria-pressed={selected}
                className={cn(
                  "rounded-full px-5 py-2.5 text-sm font-semibold ring-1 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F3E3B2]",
                  selected
                    ? "bg-[#F3E3B2] text-[#1A1208] ring-[#F3E3B2]"
                    : "bg-white/[0.06] text-[#F3E3B2] ring-white/10 hover:bg-white/[0.12]",
                )}
              >
                {t}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

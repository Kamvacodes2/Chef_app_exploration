"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { fetchAvailabilityForDate } from "../api/availabilityClient";
import { useOrder } from "../state/OrderContext";
import { cn } from "@/lib/cn";
import {
  businessDateToCalendarDate,
  businessDateToISODate,
  getJohannesburgBusinessDate,
  isBookableJohannesburgTimeSlot,
} from "./scheduleBusinessDate";

const WEEKDAYS = Object.freeze(["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]);

const TIME_PERIODS = Object.freeze([
  { id: "morning", label: "Morning", range: "From 7 am", slots: Object.freeze(["07:00", "08:00", "09:00", "10:00", "11:00"]) },
  { id: "afternoon", label: "Afternoon", range: "From 12 pm", slots: Object.freeze(["12:00", "13:00", "14:00", "15:00", "16:00"]) },
  { id: "evening", label: "Evening", range: "From 5 pm", slots: Object.freeze(["17:00", "18:00", "18:30", "19:00", "19:30", "20:00"]) },
]);

type TimePeriodId = (typeof TIME_PERIODS)[number]["id"];

type AvailabilityByTime = ReadonlyMap<string, boolean>;

interface CalendarDay {
  readonly iso: string;
  readonly label: string;
  readonly disabled: boolean;
}

function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseISODate(iso: string): Date {
  const [yearText, monthText, dayText] = iso.split("-");
  return new Date(Number(yearText ?? "0"), Number(monthText ?? "1") - 1, Number(dayText ?? "1"));
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function friendlyDate(d: Date): string {
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
}

function buildMonthDays(month: Date, todayIso: string): readonly CalendarDay[] {
  const days: CalendarDay[] = [];
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const lastDate = new Date(year, monthIndex + 1, 0).getDate();

  for (let day = 1; day <= lastDate; day += 1) {
    const iso = toISODate(new Date(year, monthIndex, day));
    days.push({ iso, label: String(day), disabled: iso < todayIso });
  }
  return days;
}

function addMonths(d: Date, amount: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + amount, 1);
}

function findPeriodByTime(time: string | null): TimePeriodId | null {
  if (!time) return null;
  return TIME_PERIODS.find((period) => period.slots.includes(time))?.id ?? null;
}

function localAvailability(date: string | null, now: Date): AvailabilityByTime {
  return new Map(
    TIME_PERIODS.flatMap((period) => period.slots.map((time) => [time, date ? isBookableJohannesburgTimeSlot(date, time, now) : true] as const)),
  );
}

/** Pick any valid future date and only a time the Chefmate API will accept. */
export function ScheduleSelect(): ReactElement {
  const { state, setDate, setTime } = useOrder();
  const [now, setNow] = useState(() => new Date());
  const today = useMemo(() => getJohannesburgBusinessDate(now), [now]);
  const todayIso = useMemo(() => businessDateToISODate(today), [today]);
  const todayDate = useMemo(() => businessDateToCalendarDate(today), [today]);
  const currentMonth = useMemo(() => startOfMonth(todayDate), [todayDate]);
  const selectedDate = state.date ? parseISODate(state.date) : null;
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(selectedDate ?? todayDate));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activePeriod, setActivePeriod] = useState<TimePeriodId | null>(() => findPeriodByTime(state.time));
  const [availability, setAvailability] = useState<AvailabilityByTime>(() => localAvailability(state.date, now));

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const fallback = localAvailability(state.date, now);
    setAvailability(fallback);
    if (!state.date) return undefined;

    const controller = new AbortController();
    void fetchAvailabilityForDate(state.date, controller.signal)
      .then((slots) => {
        if (!controller.signal.aborted) setAvailability(new Map(slots.map((slot) => [slot.time, slot.available])));
      })
      .catch(() => {
        // The local rule mirrors the server and keeps selection safe during a transient API failure.
      });

    return () => controller.abort();
  }, [now, state.date]);

  useEffect(() => {
    if (state.time && availability.get(state.time) === false) setTime(null);
  }, [availability, setTime, state.time]);

  const days = useMemo(() => buildMonthDays(visibleMonth, todayIso), [todayIso, visibleMonth]);
  const leadingBlanks = visibleMonth.getDay();
  const canGoToPreviousMonth = visibleMonth > currentMonth;
  const selectedDateLabel = selectedDate ? friendlyDate(selectedDate) : "Choose a day";
  const activePeriodConfig = TIME_PERIODS.find((period) => period.id === activePeriod) ?? null;

  const chooseDate = (iso: string): void => {
    setDate(iso);
    setCalendarOpen(false);
  };

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-3xl font-semibold text-[var(--color-bone)] sm:text-4xl">What day and time works for you?</h2>
        <p className="text-sm text-[var(--color-bone)]/70">Pick when your Chefmate should come by.</p>
      </div>

      <section aria-label="Session day" className="max-w-sm sm:max-w-md">
        <h3 className="mb-3 text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--color-bone)]/80">Day</h3>
        <button type="button" onClick={() => setCalendarOpen((open) => !open)} aria-expanded={calendarOpen} aria-controls="schedule-calendar" className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-left text-[var(--color-bone)] shadow-sm transition hover:bg-white/[0.12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-bone)]">
          <span className="flex flex-col gap-1">
            <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-[var(--color-bone)]/70">Pick a date</span>
            <span className="text-base font-semibold">{selectedDateLabel}</span>
          </span>
          <span className="text-xl leading-none" aria-hidden="true">{calendarOpen ? "-" : "+"}</span>
        </button>

        {calendarOpen && (
          <div id="schedule-calendar" className="mt-3 rounded-2xl border border-white/10 bg-[var(--color-bone)] p-3 text-[var(--color-oxblood)] shadow-xl sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <button type="button" onClick={() => setVisibleMonth((month) => addMonths(month, -1))} disabled={!canGoToPreviousMonth} aria-label="Previous month" className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-oxblood)]/10 font-bold transition hover:bg-[var(--color-oxblood)]/10 disabled:cursor-not-allowed disabled:opacity-35">&lt;</button>
              <p className="text-sm font-extrabold uppercase tracking-[0.12em]">{monthLabel(visibleMonth)}</p>
              <button type="button" onClick={() => setVisibleMonth((month) => addMonths(month, 1))} aria-label="Next month" className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-oxblood)]/10 font-bold transition hover:bg-[var(--color-oxblood)]/10">&gt;</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-[var(--color-oxblood)]/60">
              {WEEKDAYS.map((day) => <span key={day} className="py-0.5">{day}</span>)}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {Array.from({ length: leadingBlanks }, (_, index) => <span key={`blank-${index}`} aria-hidden="true" />)}
              {days.map((day) => {
                const selected = state.date === day.iso;
                return (
                  <button key={day.iso} type="button" onClick={() => chooseDate(day.iso)} disabled={day.disabled} aria-pressed={selected} className={cn("flex h-9 items-center justify-center rounded-xl text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-terracotta)] sm:h-10", selected ? "bg-[var(--color-oxblood)] text-[var(--color-bone)]" : "text-[var(--color-oxblood)] hover:bg-[var(--color-oxblood)]/10", day.disabled && "cursor-not-allowed text-[var(--color-oxblood)]/25 hover:bg-transparent")}>{day.label}</button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section aria-label="Session time" className="max-w-2xl">
        <h3 className="mb-3 text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--color-bone)]/80">Time slot</h3>
        {activePeriodConfig ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-display text-xl text-[var(--color-bone)]">{activePeriodConfig.label}</p>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-bone)]/60">{activePeriodConfig.range}</p>
              </div>
              <button type="button" onClick={() => setActivePeriod(null)} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-[var(--color-bone)]/80 transition hover:bg-white/[0.1] hover:text-[var(--color-bone)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-bone)]">Back</button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {activePeriodConfig.slots.map((time) => {
                const selected = state.time === time;
                const available = availability.get(time) ?? false;
                return (
                  <button key={time} type="button" onClick={() => setTime(time)} disabled={!available} aria-pressed={selected} className={cn("min-h-12 rounded-xl px-4 text-sm font-semibold ring-1 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-bone)]", selected ? "bg-[var(--color-bone)] text-[var(--color-oxblood)] ring-[var(--color-bone)]" : "bg-white/[0.06] text-[var(--color-bone)] ring-white/10 hover:bg-white/[0.12]", !available && "cursor-not-allowed bg-white/[0.03] text-[var(--color-bone)]/35 ring-white/5 hover:bg-white/[0.03]")}>{time}</button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {TIME_PERIODS.map((period) => {
              const selected = period.id === findPeriodByTime(state.time);
              const hasAvailableSlot = period.slots.some((time) => availability.get(time));
              return (
                <button key={period.id} type="button" onClick={() => setActivePeriod(period.id)} disabled={!hasAvailableSlot} aria-pressed={selected} className={cn("flex min-h-20 flex-col items-start justify-center rounded-2xl px-5 text-left ring-1 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-bone)]", selected ? "bg-[var(--color-bone)] text-[var(--color-oxblood)] ring-[var(--color-bone)]" : "bg-white/[0.06] text-[var(--color-bone)] ring-white/10 hover:bg-white/[0.12]", !hasAvailableSlot && "cursor-not-allowed bg-white/[0.03] text-[var(--color-bone)]/35 ring-white/5 hover:bg-white/[0.03]") }>
                  <span className="font-display text-xl">{period.label}</span>
                  <span className={cn("mt-1 text-xs font-semibold uppercase tracking-[0.14em]", selected ? "text-[var(--color-oxblood)]/60" : "text-[var(--color-bone)]/55")}>{period.range}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

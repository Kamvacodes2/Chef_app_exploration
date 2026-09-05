"use client";

import { useState } from "react";
import {
  availabilityDays,
  isWithinAvailability,
  type AvailabilityData,
  type AvailabilityDay,
} from "./api/platformClient";

export interface ConfirmSessionDetails {
  readonly reference: string;
  readonly mainName: string;
  readonly scheduledDate: string;
  readonly timeSlot: string;
  readonly chefPayoutCents: number;
  readonly outsideAvailability: boolean;
}

interface AvailabilityConfirmModalProps {
  readonly session: ConfirmSessionDetails;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly busy?: boolean;
}

/**
 * Explicit availability commitment: before a chef accepts a targeted offer or
 * claims a session, they must confirm they are genuinely free for the slot.
 * When the slot falls outside the days/times they declared, that is called out
 * prominently instead of silently blocking them.
 */
export function AvailabilityConfirmModal({
  session,
  onConfirm,
  onCancel,
  busy = false,
}: AvailabilityConfirmModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <div
      aria-labelledby="availability-confirm-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
        <div className="border-b border-[var(--color-oxblood)]/10 px-6 py-4">
          <h2
            className="text-lg font-black text-[var(--color-oxblood)]"
            id="availability-confirm-title"
          >
            Confirm you&apos;re available
          </h2>
        </div>

        <div className="space-y-4 px-6 py-5 text-sm text-[var(--color-charcoal)]/80">
          <p>
            <span className="font-bold text-[var(--color-oxblood)]">{session.mainName}</span>
            <span className="block text-[var(--color-charcoal)]/70">
              {session.reference} · {session.scheduledDate} at {session.timeSlot}
            </span>
          </p>

          <p className="inline-flex rounded-full bg-emerald-50 px-3 py-1 font-black text-emerald-900">
            You receive {formatZar(session.chefPayoutCents)}
          </p>

          {session.outsideAvailability ? (
            <div
              className="rounded-xl border-l-4 border-amber-600 bg-amber-50 p-4 text-amber-950"
              role="alert"
            >
              <p className="font-semibold">This falls outside your declared availability.</p>
              <p className="mt-1 text-xs leading-5">
                The day or time is not in the availability windows you&apos;ve set. You can still
                take it — just confirm below that you&apos;ll actually be free.
              </p>
            </div>
          ) : null}

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-oxblood)]/15 p-4">
            <input
              checked={acknowledged}
              className="mt-0.5 h-4 w-4 accent-[var(--color-oxblood)]"
              disabled={busy}
              onChange={(event) => setAcknowledged(event.target.checked)}
              type="checkbox"
            />
            <span>
              I confirm I am available to cook this session on {session.scheduledDate} at{" "}
              {session.timeSlot} and will show up for it.
            </span>
          </label>
        </div>

        <div className="flex flex-col gap-2 border-t border-[var(--color-oxblood)]/10 px-6 py-4">
          <button
            className="w-full rounded-xl bg-[var(--color-oxblood)] py-3 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!acknowledged || busy}
            onClick={onConfirm}
            type="button"
          >
            {busy ? "Confirming..." : "Yes, I confirm — take the session"}
          </button>
          <button
            className="w-full rounded-xl py-2 text-sm font-semibold text-[var(--color-charcoal)]/70 underline-offset-4 hover:underline disabled:opacity-50"
            disabled={busy}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function formatZar(cents: number): string {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(cents / 100);
}

const WEEKDAY_FROM_DATE_INDEX: readonly AvailabilityDay[] = [
  "SUN",
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
];

function weekdayOf(isoDate: string): AvailabilityDay {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "MON";
  return WEEKDAY_FROM_DATE_INDEX[date.getDay()] ?? "MON";
}

export function dayLabel(day: AvailabilityDay): string {
  return availabilityDays.find((candidate) => candidate === day) === undefined
    ? day
    : { MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu", FRI: "Fri", SAT: "Sat", SUN: "Sun" }[day];
}

/** True when a session's weekday/time is outside every declared availability window. */
export function sessionFallsOutside(
  scheduledDate: string,
  timeSlot: string,
  availability: AvailabilityData,
): boolean {
  return !isWithinAvailability(weekdayOf(scheduledDate), timeSlot, availability);
}

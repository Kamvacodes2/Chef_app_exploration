"use client";

import {
  availabilityDays,
  type AvailabilityDay,
  type AvailabilityWindow,
} from "./api/platformClient";
import { dayLabel } from "./AvailabilityConfirmModal";

interface AvailabilityEditorProps {
  readonly windows: readonly AvailabilityWindow[];
  readonly onChange: (windows: readonly AvailabilityWindow[]) => void;
}

export function AvailabilityEditor({ windows, onChange }: AvailabilityEditorProps) {
  const updateWindow = (index: number, patch: Partial<AvailabilityWindow>): void => {
    const next = windows.map((window, windowIndex) =>
      windowIndex === index ? { ...window, ...patch } : window,
    );
    onChange(next);
  };

  const toggleDay = (windowIndex: number, day: AvailabilityDay): void => {
    const window = windows[windowIndex];
    if (!window) return;
    const days = new Set(window.days);
    if (days.has(day)) days.delete(day);
    else days.add(day);
    updateWindow(windowIndex, { days: [...days] });
  };

  const addWindow = (): void => {
    onChange([...windows, { days: [], from: "09:00", to: "17:00" }]);
  };

  const removeWindow = (index: number): void => {
    onChange(windows.filter((_, windowIndex) => windowIndex !== index));
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-[var(--color-charcoal)]/55">
        Pick the days and hours you can cook. Sessions outside these windows can still be offered to
        you — you&apos;ll just confirm availability when accepting.
      </p>

      {windows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--color-oxblood)]/25 p-3 text-sm text-[var(--color-charcoal)]/60">
          No availability windows set. Add one below to tell Chefmate when you usually cook.
        </p>
      ) : null}

      <div className="space-y-3">
        {windows.map((window, index) => (
          <fieldset
            className="rounded-2xl border border-[var(--color-oxblood)]/10 bg-[var(--color-warm-cream)] p-3"
            key={index}
          >
            <legend className="sr-only">Availability window {index + 1}</legend>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-[var(--color-oxblood)]">Window {index + 1}</p>
              <button
                aria-label={`Remove window ${index + 1}`}
                className="text-xs font-bold text-[var(--color-oxblood)] underline-offset-2 hover:underline"
                onClick={() => removeWindow(index)}
                type="button"
              >
                Remove
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {availabilityDays.map((day) => {
                const active = window.days.includes(day);
                return (
                  <button
                    aria-pressed={active}
                    className={`min-w-11 rounded-lg border px-2 py-1 text-xs font-bold transition ${
                      active
                        ? "border-[var(--color-oxblood)] bg-[var(--color-oxblood)] text-white"
                        : "border-[var(--color-oxblood)]/20 bg-white text-[var(--color-charcoal)]/70"
                    }`}
                    key={day}
                    onClick={() => toggleDay(index, day)}
                    type="button"
                  >
                    {dayLabel(day)}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-charcoal)]">
                From
                <input
                  aria-label={`Window ${index + 1} start time`}
                  className="min-h-10 rounded-xl border border-[var(--color-oxblood)]/20 bg-white px-2 text-sm outline-none focus:border-[var(--color-oxblood)]"
                  onChange={(event) => updateWindow(index, { from: event.target.value })}
                  type="time"
                  value={window.from}
                />
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-charcoal)]">
                To
                <input
                  aria-label={`Window ${index + 1} end time`}
                  className="min-h-10 rounded-xl border border-[var(--color-oxblood)]/20 bg-white px-2 text-sm outline-none focus:border-[var(--color-oxblood)]"
                  onChange={(event) => updateWindow(index, { to: event.target.value })}
                  type="time"
                  value={window.to}
                />
              </label>
            </div>
          </fieldset>
        ))}
      </div>

      <button
        className="rounded-xl border border-[var(--color-oxblood)]/25 px-4 py-2 text-sm font-bold text-[var(--color-oxblood)] hover:bg-[var(--color-warm-cream)]"
        onClick={addWindow}
        type="button"
      >
        + Add another window
      </button>
    </div>
  );
}

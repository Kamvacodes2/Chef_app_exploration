"use client";

import type { ReactElement } from "react";
import { OVERNIGHT_OATS_NAME } from "../constants/menu";

/**
 * Free breakfast add-on offered once, right after a subscription (rhythm /
 * family / premium) customer picks their meal(s). The oats ride along at no
 * charge; the modal only ever appears when the customer has not answered yet.
 */
export function BreakfastAddOnModal({
  onAccept,
  onDecline,
}: {
  readonly onAccept: () => void;
  readonly onDecline: () => void;
}): ReactElement {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-label="Add overnight oats for your breakfast"
    >
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-[0_20px_60px_rgba(70,33,24,0.25)]">
        <div className="flex items-center gap-3 bg-[var(--color-vanilla)] px-6 pb-4 pt-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-warm-linen)] text-2xl">
            🌾
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-[var(--color-oxblood)]/70">
              On your subscription
            </p>
            <h3 className="text-lg font-black leading-tight text-[var(--color-oxblood)]">
              Fancy {OVERNIGHT_OATS_NAME} for breakfast?
            </h3>
          </div>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm leading-relaxed text-[var(--color-charcoal)]/80">
            While your chef is preparing your dinner, add a jar of overnight oats so breakfast is
            sorted for the next morning too. It is completely free with your subscription plan.
          </p>
          <p className="mt-3 text-xs font-bold text-[var(--color-oxblood)]">
            Included at no extra charge — always.
          </p>

          <div className="mt-5 flex flex-col gap-2">
            <button
              className="min-h-12 rounded-xl bg-[var(--color-oxblood)] px-4 text-sm font-bold text-white transition hover:bg-[var(--color-oxblood)]/90"
              onClick={onAccept}
              type="button"
            >
              Yeah, breakfast sounds great
            </button>
            <button
              className="min-h-12 rounded-xl border border-[var(--color-oxblood)]/20 px-4 text-sm font-bold text-[var(--color-oxblood)] transition hover:bg-[var(--color-oxblood)]/5"
              onClick={onDecline}
              type="button"
            >
              No thanks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

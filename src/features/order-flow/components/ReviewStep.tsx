"use client";

import Image from "next/image";
import type { ReactElement } from "react";
import { useOrder } from "../state/OrderContext";

function friendlyDateTime(iso: string | null, time: string | null): string {
  if (!iso) return "Not selected yet";
  const d = new Date(`${iso}T${time ?? "18:30"}`);
  return d.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" }) + (time ? ` · ${time}` : "");
}

/**
 * Review the meal session before confirming: dishes, schedule, address and
 * notes. No pricing is shown because Chefmate confirms session details
 * outside this meal-selection flow.
 */
export function ReviewStep(): ReactElement {
  const { state } = useOrder();

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-3xl font-semibold text-[var(--color-bone)] sm:text-4xl">Review your session</h2>
        <p className="text-sm text-[var(--color-bone)]/70">Give your meal choices and visit details one last look.</p>
      </div>

      <div className="grid w-full gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          {state.main && (
            <div className="flex items-center gap-3 rounded-3xl bg-white/[0.06] p-3 ring-1 ring-white/10">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[var(--color-oxblood)]">
                <Image src={state.main.imageSrc} alt={state.main.imageAlt} fill sizes="64px" className="object-cover" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--color-bone)]">{state.main.name}</p>
                {state.customRequest && (
                  <p className="line-clamp-2 text-xs italic text-[var(--color-bone)]/70">
                    &ldquo;{state.customRequest}&rdquo; — the kitchen will confirm
                  </p>
                )}
              </div>
            </div>
          )}

          {state.sides.map((side) => (
            <div key={side.id} className="flex items-center gap-3 rounded-3xl bg-white/[0.04] p-3 ring-1 ring-white/10">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[var(--color-oxblood)]">
                <Image src={side.imageSrc} alt={side.imageAlt} fill sizes="48px" className="object-cover" />
              </div>
              <p className="flex-1 text-sm text-[var(--color-bone)]/90">
                {side.name} <span className="text-xs text-[var(--color-bone)]/50">(side)</span>
              </p>
            </div>
          ))}

          {state.dessert && (
            <div className="flex items-center gap-3 rounded-3xl bg-white/[0.04] p-3 ring-1 ring-white/10">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[var(--color-oxblood)]">
                <Image src={state.dessert.imageSrc} alt={state.dessert.imageAlt} fill sizes="48px" className="object-cover" />
              </div>
              <p className="flex-1 text-sm text-[var(--color-bone)]/90">
                {state.dessert.name} <span className="text-xs text-[var(--color-bone)]/50">(dessert)</span>
              </p>
            </div>
          )}

          <div className="mt-2 flex flex-col gap-1 rounded-3xl bg-white/[0.04] p-4 ring-1 ring-white/10">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-bone)]/60">Visit details</p>
            <p className="text-sm text-[var(--color-bone)]">{friendlyDateTime(state.date, state.time)}</p>
            <p className="text-sm text-[var(--color-bone)]/80">
              {[state.address.unit, state.address.street].filter(Boolean).join(", ")}
              {state.address.estate ? ` · ${state.address.estate}` : ""}
            </p>
          </div>
        </div>

        <aside className="flex h-fit flex-col gap-4 rounded-3xl bg-[var(--color-bone)] p-5 text-[var(--color-oxblood)] lg:sticky lg:top-4">
          <h3 className="font-display text-2xl font-semibold">What happens next</h3>
          <p className="text-sm leading-6 text-[var(--color-charcoal)]/75">
            Chefmate uses your meal choices, custom notes and visit details to prepare the right shopping list and chef session.
          </p>
          <div className="rounded-2xl bg-white/70 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-oxblood)]/60">No checkout here</p>
            <p className="mt-1 text-sm leading-6 text-[var(--color-charcoal)]/75">
              Pricing is not shown in this flow. The team confirms the session details with you after the request is placed.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

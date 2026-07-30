"use client";

import type { ReactElement } from "react";
import { EXTRA_SIDE_PRICE_ZAR, INCLUDED_SIDE_COUNT, SIDES } from "../constants/menu";
import { useOrder } from "../state/OrderContext";
import { DishCard } from "./DishCard";

/**
 * Side add-ons. The first two are included; every additional side uses the shared extra-side price.
 */
export function SidesSelect(): ReactElement {
  const { state, toggleSide } = useOrder();
  const selectedIds = new Set(state.sides.map((s) => s.id));

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-3xl font-semibold text-[var(--color-bone)] sm:text-4xl">
          Add some sides?
        </h2>
        <p className="text-sm text-[var(--color-bone)]/70">
          Choose up to two included sides. Any extra side adds R{EXTRA_SIDE_PRICE_ZAR}. Tap to add,
          tap again to remove.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {SIDES.map((s) => (
          <DishCard
            key={s.id}
            item={s}
            selected={selectedIds.has(s.id)}
            onSelect={() => toggleSide(s)}
            badge={s.isSignature ? "SA staple" : undefined}
          />
        ))}
      </div>

      {state.sides.length > 0 && (
        <p className="text-sm text-[var(--color-bone)]/80" aria-live="polite">
          {state.sides.length <= INCLUDED_SIDE_COUNT
            ? `${state.sides.length} side${state.sides.length === 1 ? "" : "s"} included`
            : `${INCLUDED_SIDE_COUNT} included, ${state.sides.length - INCLUDED_SIDE_COUNT} extra at R${EXTRA_SIDE_PRICE_ZAR} each`}
        </p>
      )}
    </div>
  );
}

"use client";

import type { ReactElement } from "react";
import { DESSERTS } from "../constants/menu";
import { useOrder } from "../state/OrderContext";
import { DishCard } from "./DishCard";

/**
 * Optional dessert. Single-select: tapping a dessert picks it and advances.
 * A "No dessert" path skips ahead.
 */
export function DessertSelect(): ReactElement {
  const { state, selectDessert, skipDessert } = useOrder();

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-3xl font-semibold text-[var(--color-bone)] sm:text-4xl">
          Something sweet?
        </h2>
        <p className="text-sm text-[var(--color-bone)]/70">
          Optional. Go on - malva counts as a food group.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {DESSERTS.map((d) => (
          <DishCard
            key={d.id}
            item={d}
            selected={state.dessert?.id === d.id}
            onSelect={() => selectDessert(d)}
            badge={d.isSignature ? "SA classic" : undefined}
            showImage={false}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={skipDessert}
        className="self-start text-sm font-semibold text-[var(--color-bone)]/70 underline decoration-[var(--color-bone)]/30 underline-offset-4 transition-colors hover:text-[var(--color-bone)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-bone)]"
      >
        No dessert for me
      </button>
    </div>
  );
}

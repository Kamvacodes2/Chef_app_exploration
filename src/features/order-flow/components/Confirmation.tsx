"use client";

import { motion } from "framer-motion";
import type { ReactElement } from "react";
import { useOrder } from "../state/OrderContext";

/**
 * Order confirmation. A warm thank-you with the session summary and a
 * "start another request" reset.
 */
export function Confirmation(): ReactElement {
  const { state, reset } = useOrder();

  return (
    <div className="flex w-full flex-col items-center gap-6 py-8 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 14 }}
        className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-bone)] text-4xl text-[var(--color-oxblood)]"
        aria-hidden="true"
      >
        ✓
      </motion.div>

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-4xl font-semibold text-[var(--color-bone)]">Request received.</h2>
        <p className="mx-auto max-w-md text-sm text-[var(--color-bone)]/70">
          Chefmate will confirm the session details and shopping list shortly.
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-2 rounded-3xl bg-white/[0.06] p-5 text-left ring-1 ring-white/10">
        <div className="flex justify-between gap-4 text-sm">
          <span className="text-[var(--color-bone)]/60">Main</span>
          <span className="text-right font-semibold text-[var(--color-bone)]">{state.main?.name ?? "Not selected"}</span>
        </div>
        {state.sides.length > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-bone)]/60">Sides</span>
            <span className="font-semibold text-[var(--color-bone)]">{state.sides.length}</span>
          </div>
        )}
        {state.dessert && (
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-[var(--color-bone)]/60">Dessert</span>
            <span className="text-right font-semibold text-[var(--color-bone)]">{state.dessert.name}</span>
          </div>
        )}
        <div className="flex justify-between gap-4 text-sm">
          <span className="text-[var(--color-bone)]/60">Visit</span>
          <span className="text-right font-semibold text-[var(--color-bone)]">
            {state.date ?? "Not selected"} {state.time ? ` · ${state.time}` : ""}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={reset}
        className="rounded-2xl bg-[var(--color-bone)] px-8 py-3 font-display text-base text-[var(--color-oxblood)] shadow-lg transition-transform hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-bone)]"
      >
        Start another request
      </button>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import type { ReactElement } from "react";
import { useOrder } from "../state/OrderContext";

/**
 * Order confirmation. A warm thank-you with the delivery summary and a
 * "start another order" reset.
 */
export function Confirmation(): ReactElement {
  const { state, total, reset } = useOrder();

  return (
    <div className="flex w-full flex-col items-center gap-6 py-8 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 14 }}
        className="flex h-20 w-20 items-center justify-center rounded-full bg-[#F3E3B2] text-4xl"
        aria-hidden="true"
      >
        ✓
      </motion.div>

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-4xl font-semibold text-[#F3E3B2]">Order&apos;s in!</h2>
        <p className="mx-auto max-w-md text-sm text-[#F3E3B2]/70">
          The kitchen&apos;s on it. We&apos;ll send a confirmation with your delivery details shortly.
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-2 rounded-3xl bg-white/[0.06] p-5 text-left ring-1 ring-white/10">
        <div className="flex justify-between text-sm">
          <span className="text-[#F3E3B2]/60">Meal</span>
          <span className="font-semibold text-[#F3E3B2]">{state.main?.name ?? "—"}</span>
        </div>
        {state.sides.length > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-[#F3E3B2]/60">Sides</span>
            <span className="font-semibold text-[#F3E3B2]">{state.sides.length}</span>
          </div>
        )}
        {state.dessert && (
          <div className="flex justify-between text-sm">
            <span className="text-[#F3E3B2]/60">Dessert</span>
            <span className="font-semibold text-[#F3E3B2]">{state.dessert.name}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-[#F3E3B2]/60">Delivery</span>
          <span className="font-semibold text-[#F3E3B2]">{state.date ?? "—"} {state.time ? `· ${state.time}` : ""}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-white/10 pt-2 text-base font-bold">
          <span className="text-[#F3E3B2]">Total</span>
          <span className="text-[#F3E3B2]">R{total}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-[#F3E3B2] px-8 py-3 font-display text-base text-[#1A1208] shadow-lg transition-transform hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F3E3B2]"
      >
        Start another order
      </button>
    </div>
  );
}

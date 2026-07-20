"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ReactElement } from "react";
import { GOALS } from "../constants/goals";
import { IN_DEMAND_IDS, MAINS } from "../constants/menu";
import { useOrder } from "../state/OrderContext";
import { DishCard } from "./DishCard";
import type { OrderMenuItem } from "../types";

/**
 * Meal selection. Top: a "What's in demand this week" rail of winter warmers
 * and SA favourites. Below: the mains grid, filtered by the chosen goal.
 * A persistent "Can't find what you want?" affordance opens the custom
 * request composer, which replaces the main with a kitchen-confirmed dish.
 */
export function MealSelect(): ReactElement {
  const { state, selectMain, setCustomRequest, clearCustomRequest } = useOrder();
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState("");

  const goal = GOALS.find((g) => g.id === state.goalId);

  const filtered = useMemo(() => {
    if (!goal || goal.matchTags.length === 0) return MAINS;
    return MAINS.filter((m) => m.goalTags.some((t) => goal.matchTags.includes(t)));
  }, [goal]);

  const inDemand = useMemo(
    () => IN_DEMAND_IDS.map((id) => MAINS.find((m) => m.id === id)).filter((m): m is OrderMenuItem => Boolean(m)),
    [],
  );

  const isSelected = (item: OrderMenuItem) => state.main?.id === item.id && state.customRequest === null;

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-3xl font-semibold text-[#F3E3B2] sm:text-4xl">
          {goal && goal.matchTags.length > 0 ? `Plates for ${goal.title.toLowerCase()}` : "Pick your main"}
        </h2>
        <p className="text-sm text-[#F3E3B2]/70">
          {goal && goal.matchTags.length > 0
            ? "Hand-picked to match your goal. Tap to choose."
            : "The full menu — tap a plate to choose it."}
        </p>
      </div>

      {/* What's in demand this week */}
      <section aria-label="In demand this week">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">🔥</span>
          <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#F3E3B2]/80">
            In demand this week
          </h3>
        </div>
        <div className="-mx-6 flex gap-4 overflow-x-auto px-6 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0">
          {inDemand.map((m) => (
            <div key={m.id} className="w-44 shrink-0 sm:w-auto">
              <DishCard item={m} selected={isSelected(m)} onSelect={() => selectMain(m)} badge="In demand" />
            </div>
          ))}
        </div>
      </section>

      {/* Filtered mains grid */}
      <section aria-label="All mains">
        <h3 className="mb-3 text-xs font-extrabold uppercase tracking-[0.2em] text-[#F3E3B2]/80">
          {goal && goal.matchTags.length > 0 ? "For your goal" : "All mains"}
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((m) => (
            <DishCard
              key={m.id}
              item={m}
              selected={isSelected(m)}
              onSelect={() => selectMain(m)}
              badge={m.isSignature ? "SA favourite" : undefined}
            />
          ))}
        </div>
      </section>

      {/* Custom request */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => setCustomOpen((o) => !o)}
          className="text-sm font-semibold text-[#F3E3B2] underline decoration-[#F3E3B2]/40 underline-offset-4 transition-colors hover:decoration-[#F3E3B2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F3E3B2]"
        >
          Can&apos;t find what you want?
        </button>

        <AnimatePresence>
          {customOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full max-w-md overflow-hidden"
            >
              <div className="flex flex-col gap-3 rounded-3xl bg-white/[0.06] p-4 ring-1 ring-white/10">
                <label htmlFor="custom-request" className="text-xs font-semibold uppercase tracking-wider text-[#F3E3B2]/80">
                  Tell the kitchen what you&apos;re craving
                </label>
                <textarea
                  id="custom-request"
                  rows={3}
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="e.g. Ouma's chicken curry with yellow rice, or a biltong-crusted steak…"
                  className="w-full resize-none rounded-2xl bg-white/90 p-3 text-sm text-[#1A1208] placeholder:text-[#1A1208]/40 focus:outline focus:outline-2 focus:outline-[#F3E3B2]"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomOpen(false);
                      setCustomText("");
                      clearCustomRequest();
                    }}
                    className="rounded-full px-4 py-2 text-sm text-[#F3E3B2]/70 hover:text-[#F3E3B2]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={customText.trim().length < 3}
                    onClick={() => setCustomRequest(customText.trim())}
                    className="rounded-full bg-[#F3E3B2] px-5 py-2 text-sm font-bold text-[#1A1208] transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                  >
                    Request this
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

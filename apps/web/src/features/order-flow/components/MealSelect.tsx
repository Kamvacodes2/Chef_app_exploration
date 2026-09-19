"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ReactElement } from "react";
import { MealBrowser } from "@/features/meal-browser/MealBrowser";
import type { BrowserMeal } from "@/features/meal-browser/api/mealCatalogClient";
import { toOrderMenuItem } from "@/features/meal-browser/toOrderMenuItem";
import { defaultCategorySlugForGoal } from "../constants/goalMealDefaults";
import { useOrder } from "../state/OrderContext";

export function MealSelect(): ReactElement {
  const { state, selectMain, setCustomRequest, clearCustomRequest } = useOrder();
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const [customLink, setCustomLink] = useState("");
  const customRef = useRef<HTMLTextAreaElement>(null);

  const openCustomRequest = useCallback(() => {
    setCustomOpen(true);
    requestAnimationFrame(() => customRef.current?.focus());
  }, []);

  const handleSelectMeal = useCallback(
    (meal: BrowserMeal) => {
      selectMain(toOrderMenuItem(meal));
    },
    [selectMain],
  );

  const initialCategorySlug = defaultCategorySlugForGoal(state.goalId);

  // Deep-linked meal highlight: the confirmation badge only sets state.main
  // text, so also drive MealBrowser.selectedSlug directly from the initial
  // hash slug once the meal step opens.
  const initialSelectedSlug =
    typeof window === "undefined"
      ? state.customRequest === null
        ? (state.main?.id ?? null)
        : null
      : (new URLSearchParams(window.location.hash.split("?", 2)[1] ?? "").get("meal") ??
        (state.customRequest === null ? (state.main?.id ?? null) : null));
  const opensInitialMealDetails =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.hash.split("?", 2)[1] ?? "").get("details") === "1";

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-bone)]/70">
          Meal discovery
        </p>
        <h2 className="font-display text-4xl font-semibold leading-tight text-[var(--color-bone)] sm:text-5xl">
          Find what you want to eat.
        </h2>
        <p className="max-w-xl text-sm leading-6 text-[var(--color-bone)]/72 sm:text-base">
          Browse by category or search ingredients, cravings and meal names. Tap a meal to see the
          detail, or tap the plus to build your Chefmate session with it.
        </p>
        {state.main && state.customRequest === null ? (
          <p className="w-fit rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-[var(--color-bone)]">
            Selected: {state.main.name}
          </p>
        ) : null}
      </div>

      <MealBrowser
        selectedSlug={initialSelectedSlug}
        initialMealSlug={opensInitialMealDetails ? initialSelectedSlug : null}
        onSelectMeal={handleSelectMeal}
        onRequestCustom={openCustomRequest}
        initialCategorySlug={initialCategorySlug}
      />

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => setCustomOpen((open) => !open)}
          className="text-sm font-semibold text-[var(--color-bone)] underline decoration-[var(--color-bone)]/40 underline-offset-4 transition-colors hover:decoration-[var(--color-bone)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-bone)]"
        >
          Can&apos;t find what you want?
        </button>
        <AnimatePresence>
          {customOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full max-w-xl overflow-hidden"
            >
              <div className="flex flex-col gap-3 rounded-3xl bg-white/[0.08] p-4 ring-1 ring-white/10">
                <label
                  htmlFor="custom-request"
                  className="text-xs font-semibold uppercase tracking-wider text-[var(--color-bone)]/80"
                >
                  Tell the kitchen what you&apos;re craving
                </label>
                <textarea
                  id="custom-request"
                  ref={customRef}
                  rows={3}
                  value={customText}
                  onChange={(event) => setCustomText(event.target.value)}
                  placeholder="e.g. Ouma's chicken curry, a TikTok pasta bake, or something saved from Pinterest"
                  className="w-full resize-none rounded-2xl bg-white/95 p-3 text-sm text-[var(--color-oxblood)] placeholder:text-[var(--color-oxblood)]/40 focus:outline focus:outline-2 focus:outline-[var(--color-bone)]"
                />
                <label
                  htmlFor="custom-request-link"
                  className="text-xs font-semibold uppercase tracking-wider text-[var(--color-bone)]/80"
                >
                  Recipe link (optional)
                </label>
                <input
                  id="custom-request-link"
                  type="url"
                  value={customLink}
                  onChange={(event) => setCustomLink(event.target.value)}
                  placeholder="https://www.tiktok.com/... or https://www.example.com/recipe"
                  className="w-full rounded-2xl bg-white/95 p-3 text-sm text-[var(--color-oxblood)] placeholder:text-[var(--color-oxblood)]/40 focus:outline focus:outline-2 focus:outline-[var(--color-bone)]"
                />
                <p className="text-xs leading-5 text-[var(--color-bone)]/60">
                  Add the recipe URL so the chef can review exactly what you mean.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomOpen(false);
                      setCustomText("");
                      setCustomLink("");
                      clearCustomRequest();
                    }}
                    className="rounded-xl px-4 py-2 text-sm text-[var(--color-bone)]/70 hover:text-[var(--color-bone)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={
                      customText.trim().length < 3 ||
                      (customLink.trim().length > 0 && !/^https?:\/\/\S+$/i.test(customLink.trim()))
                    }
                    onClick={() => {
                      const text = customText.trim();
                      const link = customLink.trim();
                      if (link) setCustomRequest(text, link);
                      else setCustomRequest(text);
                    }}
                    className="rounded-xl bg-[var(--color-bone)] px-5 py-2 text-sm font-bold text-[var(--color-oxblood)] transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
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

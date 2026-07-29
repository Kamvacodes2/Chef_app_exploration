"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ReactElement } from "react";
import { GOALS } from "../constants/goals";
import { getMealDetail } from "../constants/mealDetails";
import { IN_DEMAND_IDS, MAINS } from "../constants/menu";
import { useOrder } from "../state/OrderContext";
import { DishCard } from "./DishCard";
import type { OrderMenuItem } from "../types";

type MealCategoryId = "all" | "in-demand" | "healthy" | "chicken" | "beef" | "pasta" | "sunday";

const MEAL_CATEGORIES: ReadonlyArray<{ readonly id: MealCategoryId; readonly label: string }> = [
  { id: "all", label: "All meals" },
  { id: "in-demand", label: "In demand" },
  { id: "healthy", label: "Healthy" },
  { id: "chicken", label: "Chicken" },
  { id: "beef", label: "Beef & meat" },
  { id: "pasta", label: "Pasta & family" },
  { id: "sunday", label: "Sunday colours" },
];

function matchesCategory(item: OrderMenuItem, category: MealCategoryId): boolean {
  if (category === "all") return true;
  if (category === "in-demand") return IN_DEMAND_IDS.includes(item.id);

  const haystack =
    `${item.id} ${item.name} ${item.description} ${item.goalTags.join(" ")}`.toLowerCase();
  switch (category) {
    case "healthy":
      return item.goalTags.some((tag) =>
        ["light", "low-carb", "mediterranean", "plant-forward"].includes(tag),
      );
    case "chicken":
      return haystack.includes("chicken");
    case "beef":
      return ["beef", "oxtail", "lamb", "steak"].some((word) => haystack.includes(word));
    case "pasta":
      return ["pasta", "lasagne", "kid", "meatball", "mince"].some((word) =>
        haystack.includes(word),
      );
    case "sunday":
      return ["seven", "colours", "sunday"].some((word) => haystack.includes(word));
    default:
      return true;
  }
}

function matchesQuery(item: OrderMenuItem, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const detail = getMealDetail(item);
  return [item.name, item.description, ...item.goalTags, ...(detail?.ingredients ?? [])]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

/**
 * Meal discovery. Guests can search, filter by category, pick a dish, or send
 * a custom request for something they saw elsewhere.
 */
export function MealSelect(): ReactElement {
  const { state, selectMain, setCustomRequest, clearCustomRequest } = useOrder();
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<MealCategoryId>("all");

  const goal = GOALS.find((g) => g.id === state.goalId);
  const visibleMeals = useMemo(() => {
    const goalMatches =
      !goal || goal.matchTags.length === 0
        ? MAINS
        : MAINS.filter((meal) => meal.goalTags.some((tag) => goal.matchTags.includes(tag)));

    return goalMatches.filter(
      (meal) => matchesCategory(meal, activeCategory) && matchesQuery(meal, query),
    );
  }, [activeCategory, goal, query]);

  const isSelected = (item: OrderMenuItem) =>
    state.main?.id === item.id && state.customRequest === null;

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-bone)]/70">
            Meal discovery
          </p>
          <h2 className="font-display text-4xl font-semibold leading-tight text-[var(--color-bone)] sm:text-5xl">
            Find what you want to eat.
          </h2>
          <p className="max-w-xl text-sm leading-6 text-[var(--color-bone)]/72 sm:text-base">
            Browse by category or search ingredients, cravings and meal names. Pick a main to build
            your Chefmate session.
          </p>
        </div>

        <label className="relative block" htmlFor="meal-search">
          <span className="sr-only">Search meals or ingredients</span>
          <input
            id="meal-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search meals, ingredients or cravings"
            className="min-h-14 w-full rounded-2xl border border-white/20 bg-[var(--color-bone)] px-6 pr-20 text-sm font-semibold text-[var(--color-oxblood)] shadow-lg placeholder:text-[var(--color-oxblood)]/45 focus:outline focus:outline-2 focus:outline-offset-4 focus:outline-[var(--color-bone)]"
          />
          <span
            className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--color-oxblood)]"
            aria-hidden="true"
          >
            Search
          </span>
        </label>
      </div>

      <div
        className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
        aria-label="Meal categories"
      >
        {MEAL_CATEGORIES.map((category) => {
          const isActive = activeCategory === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCategory(category.id)}
              className={`min-h-11 shrink-0 rounded-xl px-5 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-bone)] ${
                isActive
                  ? "bg-[var(--color-bone)] text-[var(--color-oxblood)]"
                  : "border border-white/20 bg-white/10 text-[var(--color-bone)] hover:bg-white/15"
              }`}
              aria-pressed={isActive}
            >
              {category.label}
            </button>
          );
        })}
      </div>

      <section aria-label="Meals">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--color-bone)]/80">
              {goal && goal.matchTags.length > 0
                ? `Good matches for ${goal.title}`
                : "All chefmate meals"}
            </h3>
            <p className="mt-1 text-sm text-[var(--color-bone)]/60">
              {visibleMeals.length} meal{visibleMeals.length === 1 ? "" : "s"} found
            </p>
          </div>
          {state.main ? (
            <p className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-[var(--color-bone)]">
              Selected: {state.main.name}
            </p>
          ) : null}
        </div>

        {visibleMeals.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleMeals.map((meal) => (
              <DishCard
                key={meal.id}
                item={meal}
                selected={isSelected(meal)}
                onSelect={() => selectMain(meal)}
                badge={
                  IN_DEMAND_IDS.includes(meal.id)
                    ? "In demand"
                    : meal.isSignature
                      ? "SA favourite"
                      : undefined
                }
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl bg-white/[0.08] p-6 text-[var(--color-bone)] ring-1 ring-white/10">
            <h3 className="font-display text-2xl">No exact match yet.</h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--color-bone)]/70">
              If you saw something on TikTok, Instagram, Pinterest or anywhere else, send it as a
              custom request and the kitchen can confirm it.
            </p>
          </div>
        )}
      </section>

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
                  rows={3}
                  value={customText}
                  onChange={(event) => setCustomText(event.target.value)}
                  placeholder="e.g. Ouma's chicken curry, a TikTok pasta bake, or something saved from Pinterest"
                  className="w-full resize-none rounded-2xl bg-white/95 p-3 text-sm text-[var(--color-oxblood)] placeholder:text-[var(--color-oxblood)]/40 focus:outline focus:outline-2 focus:outline-[var(--color-bone)]"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomOpen(false);
                      setCustomText("");
                      clearCustomRequest();
                    }}
                    className="rounded-xl px-4 py-2 text-sm text-[var(--color-bone)]/70 hover:text-[var(--color-bone)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={customText.trim().length < 3}
                    onClick={() => setCustomRequest(customText.trim())}
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

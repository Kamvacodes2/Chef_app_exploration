"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { findChefmatePlan } from "@/features/plans/planCatalog";
import { fetchMeals, type BrowserMeal } from "@/features/meal-browser/api/mealCatalogClient";
import { toOrderMenuItem } from "@/features/meal-browser/toOrderMenuItem";
import { cn } from "@/lib/cn";
import { useOrder } from "../state/OrderContext";

const SEARCH_DEBOUNCE_MS = 250;

/**
 * "What would you like most often?" — a subscriber names a go-to dish.
 *
 * This step reads the real catalog (the same endpoint the meal browser uses)
 * rather than a hardcoded shortlist, so the stored favourite is always a slug
 * the backend can resolve. It deliberately stays a plain searchable list: the
 * rich browser (rails, drawer, calorie chips) belongs to the meal step.
 */
export function PlanFavoriteSelect(): ReactElement {
  const { state, selectPlanFavorite, decidePlanFavorite, reset } = useOrder();
  const plan = findChefmatePlan(state.planId);

  const [meals, setMeals] = useState<readonly BrowserMeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setLoadError(null);

    void fetchMeals({}, { signal: controller.signal })
      .then((loaded) => {
        if (controller.signal.aborted) return;
        setMeals(loaded.filter((meal) => meal.isActive !== false));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(
          error instanceof Error ? error.message : "We couldn't load the menu right now.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  const query = debouncedSearch.trim().toLowerCase();
  const visibleMeals = useMemo(
    () =>
      [...meals]
        .filter(
          (meal) =>
            query.length === 0 ||
            meal.name.toLowerCase().includes(query) ||
            meal.categoryName.toLowerCase().includes(query),
        )
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [meals, query],
  );

  if (!plan) {
    return <div />;
  }

  return (
    <div className="flex w-full flex-col gap-7">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--color-bone)]/70">
          {plan.name}
        </p>
        <h2 className="font-display text-3xl font-semibold text-[var(--color-bone)] sm:text-4xl">
          What would you like most often?
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-[var(--color-bone)]/72">
          Pick a favourite for your first Chefmate menu. You can change things up with every visit.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <label className="sr-only" htmlFor="plan-favourite-search">
          Search meals
        </label>
        <input
          id="plan-favourite-search"
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search the menu by meal or category"
          className="min-h-12 w-full max-w-xl rounded-2xl border border-white/20 bg-[var(--color-bone)] px-5 text-sm font-semibold text-[var(--color-oxblood)] shadow-lg placeholder:text-[var(--color-oxblood)]/45 focus:outline focus:outline-2 focus:outline-offset-4 focus:outline-[var(--color-bone)]"
        />

        {isLoading && !loadError ? (
          <p role="status" className="text-sm text-[var(--color-bone)]/70">
            Loading the menu…
          </p>
        ) : null}

        {loadError ? (
          <p
            role="alert"
            className="max-w-xl rounded-2xl bg-white/[0.08] px-4 py-3 text-sm text-[var(--color-bone)] ring-1 ring-white/10"
          >
            {loadError} You can still choose later and pick from the full menu before your first
            booking.
          </p>
        ) : null}

        {!isLoading && !loadError && visibleMeals.length === 0 ? (
          <p className="text-sm text-[var(--color-bone)]/70">
            No meal matches that search. Try another name, or choose later.
          </p>
        ) : null}

        {visibleMeals.length > 0 ? (
          <ul
            aria-label="Meals you can pick as your favourite"
            data-testid="plan-favourite-options"
            className="grid max-h-[26rem] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2"
          >
            {visibleMeals.map((meal) => {
              const selected = state.favoriteMealId === meal.slug;
              return (
                <li key={meal.slug}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    data-testid={`plan-favourite-${meal.slug}`}
                    onClick={() => selectPlanFavorite(toOrderMenuItem(meal))}
                    className={cn(
                      "flex min-h-14 w-full flex-col items-start gap-0.5 rounded-2xl px-4 py-3 text-left ring-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-bone)]",
                      selected
                        ? "bg-[var(--color-bone)] text-[var(--color-oxblood)] ring-[var(--color-bone)]"
                        : "bg-white/[0.07] text-[var(--color-bone)] ring-white/15 hover:bg-white/[0.13]",
                    )}
                  >
                    <span className="text-sm font-bold">{meal.name}</span>
                    <span
                      className={cn(
                        "text-xs",
                        selected ? "text-[var(--color-oxblood)]/70" : "text-[var(--color-bone)]/62",
                      )}
                    >
                      {meal.categoryName}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-pressed={state.favoriteMealDeferred}
          onClick={decidePlanFavorite}
          className={
            "min-h-11 rounded-xl px-5 text-sm font-bold ring-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-bone)] " +
            (state.favoriteMealDeferred
              ? "bg-[var(--color-bone)] text-[var(--color-oxblood)] ring-[var(--color-bone)]"
              : "bg-white/[0.07] text-[var(--color-bone)] ring-white/15 hover:bg-white/[0.13]")
          }
        >
          I&apos;ll choose later
        </button>
        <p className="text-sm text-[var(--color-bone)]/62">
          Choosing later takes you to the full menu before your first booking.
        </p>
      </div>

      <a
        href="#plans"
        onClick={reset}
        className="w-fit text-sm font-bold text-[var(--color-bone)] underline decoration-[var(--color-bone)]/40 underline-offset-4 transition hover:decoration-[var(--color-bone)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-bone)]"
      >
        Choose another package
      </a>
    </div>
  );
}

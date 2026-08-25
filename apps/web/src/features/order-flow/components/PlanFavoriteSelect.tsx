"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { findChefmatePlan } from "@/features/plans/planCatalog";
import { fetchMeals, type BrowserMeal } from "@/features/meal-browser/api/mealCatalogClient";
import { mealImage } from "@/features/meal-browser/mealPresentation";
import { toOrderMenuItem } from "@/features/meal-browser/toOrderMenuItem";
import { cn } from "@/lib/cn";
import { useOrder } from "../state/OrderContext";

const SEARCH_DEBOUNCE_MS = 250;

/**
 * "What would you like most often?" — a subscriber names a go-to dish, and can
 * optionally add a second meal for meal-prep packs (option 1 & 2).
 *
 * This step reads the real catalog (the same endpoint the meal browser uses)
 * rather than a hardcoded shortlist, so the stored favourites are always slugs
 * the backend can resolve. Meals render with their real photos so choosing
 * feels like the meal browser.
 */
export function PlanFavoriteSelect(): ReactElement {
  const { state, selectPlanFavorite, selectPlanSecondFavorite, decidePlanFavorite, reset } =
    useOrder();
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
    let cancelled = false;
    void fetchMeals()
      .then((catalog) => {
        if (!cancelled) setMeals(catalog);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setLoadError(
            caught instanceof Error ? caught.message : "The menu could not be loaded right now.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const query = debouncedSearch.trim().toLowerCase();
  const visibleMeals = useMemo(
    () =>
      [...meals]
        .filter((meal) => meal.isActive !== false)
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

  const firstMeal = state.favoriteMealId
    ? (meals.find((meal) => meal.slug === state.favoriteMealId) ?? null)
    : null;
  const secondMeal = state.secondFavoriteMealId
    ? (meals.find((meal) => meal.slug === state.secondFavoriteMealId) ?? null)
    : null;

  const handleMealClick = (meal: BrowserMeal): void => {
    if (state.favoriteMealId === meal.slug) {
      selectPlanFavorite(toOrderMenuItem(meal)); // toggles option 1 off
      return;
    }
    if (!state.favoriteMealId) {
      selectPlanFavorite(toOrderMenuItem(meal));
      return;
    }
    selectPlanSecondFavorite(toOrderMenuItem(meal));
  };

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
          Pick a favourite for your first Chefmate menu. You can change things up with every visit —
          or add a second meal for meal-prep packs.
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

        {firstMeal || secondMeal ? (
          <div
            className="flex max-w-xl flex-wrap items-center gap-2"
            aria-label="Your chosen meals"
          >
            {firstMeal ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-bone)] px-3 py-1.5 text-xs font-bold text-[var(--color-oxblood)]">
                <Image
                  src={mealImage(firstMeal).src}
                  alt=""
                  width={56}
                  height={56}
                  className="h-7 w-7 rounded-full object-cover"
                />
                Option 1: {firstMeal.name}
                <button
                  type="button"
                  aria-label={`Remove ${firstMeal.name} as option 1`}
                  onClick={() => selectPlanFavorite(toOrderMenuItem(firstMeal))}
                  className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-oxblood)]/15 text-[var(--color-oxblood)] hover:bg-[var(--color-oxblood)]/25"
                >
                  ×
                </button>
              </span>
            ) : null}
            {secondMeal ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-bone)]/15 px-3 py-1.5 text-xs font-bold text-[var(--color-bone)] ring-1 ring-white/20">
                <Image
                  src={mealImage(secondMeal).src}
                  alt=""
                  width={56}
                  height={56}
                  className="h-7 w-7 rounded-full object-cover"
                />
                Option 2: {secondMeal.name}
                <button
                  type="button"
                  aria-label={`Remove ${secondMeal.name} as option 2`}
                  onClick={() => selectPlanSecondFavorite(toOrderMenuItem(secondMeal))}
                  className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-[var(--color-bone)] hover:bg-white/30"
                >
                  ×
                </button>
              </span>
            ) : null}
            <span className="text-xs text-[var(--color-bone)]/62">
              Option 2 is for meal-prep packs — optional.
            </span>
          </div>
        ) : null}

        {visibleMeals.length > 0 ? (
          <ul
            aria-label="Meals you can pick as your favourite"
            data-testid="plan-favourite-options"
            className="grid max-h-[26rem] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2"
          >
            {visibleMeals.map((meal) => {
              const isOptionOne = state.favoriteMealId === meal.slug;
              const isOptionTwo = state.secondFavoriteMealId === meal.slug;
              const image = mealImage(meal);
              return (
                <li key={meal.slug}>
                  <button
                    type="button"
                    aria-pressed={isOptionOne || isOptionTwo}
                    data-testid={`plan-favourite-${meal.slug}`}
                    onClick={() => handleMealClick(meal)}
                    className={cn(
                      "flex min-h-[4.5rem] w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ring-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-bone)]",
                      isOptionOne
                        ? "bg-[var(--color-bone)] text-[var(--color-oxblood)] ring-[var(--color-bone)]"
                        : isOptionTwo
                          ? "bg-white/[0.13] text-[var(--color-bone)] ring-[var(--color-bone)]/70"
                          : "bg-white/[0.07] text-[var(--color-bone)] ring-white/15 hover:bg-white/[0.13]",
                    )}
                  >
                    <Image
                      src={image.src}
                      alt={image.alt}
                      width={144}
                      height={144}
                      className="h-16 w-16 shrink-0 rounded-xl object-cover"
                    />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="flex items-center gap-2 text-sm font-bold">
                        <span className="truncate">{meal.name}</span>
                        {isOptionOne ? (
                          <span className="shrink-0 rounded-full bg-[var(--color-oxblood)]/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--color-oxblood)]">
                            Option 1
                          </span>
                        ) : null}
                        {isOptionTwo ? (
                          <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--color-bone)]">
                            Option 2
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={cn(
                          "text-xs",
                          isOptionOne
                            ? "text-[var(--color-oxblood)]/70"
                            : "text-[var(--color-bone)]/62",
                        )}
                      >
                        {meal.categoryName}
                      </span>
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

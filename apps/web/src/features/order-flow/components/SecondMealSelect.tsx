"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { isRecurringChefmatePlan } from "@/features/plans/planCatalog";
import { fetchMeals, type BrowserMeal } from "@/features/meal-browser/api/mealCatalogClient";
import { mealImage } from "@/features/meal-browser/mealPresentation";
import { toOrderMenuItem } from "@/features/meal-browser/toOrderMenuItem";
import { cn } from "@/lib/cn";
import { SECOND_MEAL_PRICE_ZAR } from "../constants/menu";
import { useOrder } from "../state/OrderContext";

const SEARCH_DEBOUNCE_MS = 250;

/**
 * "Add another meal?" — the optional meal-prep second meal, offered right after
 * a main meal is picked at the meal step (instead of jumping straight to
 * sides). Subscription (recurring) plans include the second meal at no charge;
 * once-off sessions add a flat fee. Tapping a meal selects it, tapping again
 * removes it, and continuing without a choice is always allowed.
 *
 * This step reads the real catalog (the same endpoint the meal browser uses) so
 * the submitted second meal is always a slug the backend can resolve.
 */
export function SecondMealSelect(): ReactElement {
  const { state, selectPlanSecondFavorite } = useOrder();
  const isRecurring = state.planId ? isRecurringChefmatePlan(state.planId) : false;

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
  // The main meal already fills its slot, so it is not offered as the second
  // meal (the order contract also forbids picking it twice).
  const visibleMeals = useMemo(
    () =>
      [...meals]
        .filter((meal) => meal.isActive !== false)
        .filter((meal) => meal.slug !== state.main?.id)
        .filter(
          (meal) =>
            query.length === 0 ||
            meal.name.toLowerCase().includes(query) ||
            meal.categoryName.toLowerCase().includes(query),
        )
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [meals, query, state.main?.id],
  );

  const secondMeal = state.secondFavoriteMealId
    ? (meals.find((meal) => meal.slug === state.secondFavoriteMealId) ?? null)
    : null;

  return (
    <div className="flex w-full flex-col gap-7">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--color-bone)]/70">
          Meal prep pack
        </p>
        <h2 className="font-display text-3xl font-semibold text-[var(--color-bone)] sm:text-4xl">
          Add another meal?
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-[var(--color-bone)]/72">
          Make it a meal-prep pack with a second meal cooked in the same visit.
          {isRecurring
            ? " Your plan includes a second meal at no extra cost."
            : ` A second meal adds R${SECOND_MEAL_PRICE_ZAR} to your once-off session. Optional — skip it if you don't need it.`}
        </p>
      </div>

      {secondMeal ? (
        <div className="flex max-w-xl flex-wrap items-center gap-2" aria-label="Your chosen meals">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-bone)]/15 px-3 py-1.5 text-xs font-bold text-[var(--color-bone)] ring-1 ring-white/20">
            <Image
              src={mealImage(secondMeal).src}
              alt=""
              width={56}
              height={56}
              className="h-7 w-7 rounded-full object-cover"
            />
            Second meal: {secondMeal.name}
            <button
              type="button"
              aria-label={`Remove ${secondMeal.name} as second meal`}
              onClick={() => selectPlanSecondFavorite(toOrderMenuItem(secondMeal))}
              className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-[var(--color-bone)] hover:bg-white/30"
            >
              ×
            </button>
          </span>
          <span className="text-xs text-[var(--color-bone)]/62">
            {isRecurring ? "Included with your plan." : `Adds R${SECOND_MEAL_PRICE_ZAR}.`}
          </span>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <label className="sr-only" htmlFor="second-meal-search">
          Search meals
        </label>
        <input
          id="second-meal-search"
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
            {loadError} You can continue without a second meal.
          </p>
        ) : null}

        {!isLoading && !loadError && visibleMeals.length === 0 ? (
          <p className="text-sm text-[var(--color-bone)]/70">
            No meal matches that search. Try another name, or continue without a second meal.
          </p>
        ) : null}

        {visibleMeals.length > 0 ? (
          <ul
            aria-label="Meals you can add as your second meal"
            data-testid="second-meal-options"
            className="grid max-h-[26rem] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2"
          >
            {visibleMeals.map((meal) => {
              const isSecond = state.secondFavoriteMealId === meal.slug;
              const image = mealImage(meal);
              return (
                <li key={meal.slug}>
                  <button
                    type="button"
                    aria-pressed={isSecond}
                    data-testid={`second-meal-${meal.slug}`}
                    onClick={() => selectPlanSecondFavorite(toOrderMenuItem(meal))}
                    className={cn(
                      "flex min-h-[4.5rem] w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ring-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-bone)]",
                      isSecond
                        ? "bg-[var(--color-bone)] text-[var(--color-oxblood)] ring-[var(--color-bone)]"
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
                        {isSecond ? (
                          <span className="shrink-0 rounded-full bg-[var(--color-oxblood)]/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--color-oxblood)]">
                            Second meal
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={cn(
                          "text-xs",
                          isSecond
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

      <p className="text-sm text-[var(--color-bone)]/62">
        Next up: choosing your sides. Tap continue to carry on
        {state.secondFavoriteMealId ? " with your meal-prep pack" : " without a second meal"}.
      </p>
    </div>
  );
}

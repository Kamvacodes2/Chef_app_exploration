"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { cn } from "@/lib/cn";
import {
  fetchCategories,
  fetchMeals,
  type BrowserMeal,
  type BrowserMealCategory,
} from "./api/mealCatalogClient";
import { CALORIE_FILTERS, matchesCalorieFilter } from "./calorieFilters";
import { MealDetailDrawer } from "./MealDetailDrawer";
import { MealSection } from "./MealSection";
import { mealCalories, searchHaystack } from "./mealPresentation";

export interface MealBrowserProps {
  /** Catalog slug of the currently selected main, if any. */
  readonly selectedSlug: string | null;
  /** Selects a meal and advances the order flow. */
  readonly onSelectMeal: (meal: BrowserMeal) => void;
  /** Opens the "can't find it" custom-request escape hatch. */
  readonly onRequestCustom: () => void;
  /**
   * Soft starting category chip (e.g. derived from the guest's onboarding
   * goal). Applied once as the initial chip selection only — it is never
   * re-applied once the customer interacts with the chips, and it never
   * hides a category; "All" (or any other chip) is always reachable.
   */
  readonly initialCategorySlug?: string | null;
}

const SEARCH_DEBOUNCE_MS = 300;
const ALL_CATEGORIES = "all";

interface CatalogState {
  readonly meals: readonly BrowserMeal[];
  readonly categories: readonly BrowserMealCategory[];
}

/**
 * Rich meal browser: search, category chips, calorie chips, per-category
 * sections and a detail drawer. The whole active catalog is fetched once and
 * filtered in memory (45 meals), so no keystroke ever refetches and there is no
 * accumulated-results state to go stale.
 */
export function MealBrowser({
  selectedSlug,
  onSelectMeal,
  onRequestCustom,
  initialCategorySlug = null,
}: MealBrowserProps): ReactElement {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // Lazy initializer: read once on mount only, so a goal default never
  // re-overrides a chip the customer has already touched, and never refires
  // on catalog refetches (see `reloadToken` below).
  const [selectedCategory, setSelectedCategory] = useState<string>(
    () => initialCategorySlug ?? ALL_CATEGORIES,
  );
  const [selectedCalorieIndex, setSelectedCalorieIndex] = useState(0);
  const [catalog, setCatalog] = useState<CatalogState>({ meals: [], categories: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [detailMeal, setDetailMeal] = useState<BrowserMeal | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    // Replace, never accumulate: a reload always starts from an empty catalog.
    setCatalog({ meals: [], categories: [] });
    setIsLoading(true);
    setLoadError(null);

    void Promise.all([
      fetchMeals({}, { signal: controller.signal }),
      fetchCategories({ signal: controller.signal }),
    ])
      .then(([meals, categories]) => {
        if (controller.signal.aborted) return;
        setCatalog({ meals: meals.filter((meal) => meal.isActive !== false), categories });
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
  }, [reloadToken]);

  const calorieFilter = CALORIE_FILTERS[selectedCalorieIndex] ?? CALORIE_FILTERS[0]!;
  const query = debouncedSearch.trim().toLowerCase();

  /** Meals matching search + calories, before the category chip narrows them. */
  const filteredMeals = useMemo(
    () =>
      catalog.meals.filter(
        (meal) =>
          (query.length === 0 || searchHaystack(meal).includes(query)) &&
          matchesCalorieFilter(calorieFilter, mealCalories(meal)),
      ),
    [calorieFilter, catalog.meals, query],
  );

  /** Only categories that still have a match are offered as chips. */
  const availableCategories = useMemo(() => {
    const present = new Set(filteredMeals.map((meal) => meal.categorySlug));
    const fromApi = catalog.categories
      .filter((category) => present.has(category.slug))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    // Defensive: a category the meals reference but the endpoint omitted.
    const known = new Set(fromApi.map((category) => category.slug));
    const orphans = filteredMeals
      .filter((meal) => !known.has(meal.categorySlug))
      .map((meal) => ({
        slug: meal.categorySlug,
        name: meal.categoryName,
        sortOrder: Number.MAX_SAFE_INTEGER,
        mealCount: 0,
      }))
      .filter(
        (category, index, list) =>
          list.findIndex((other) => other.slug === category.slug) === index,
      );

    return [...fromApi, ...orphans];
  }, [catalog.categories, filteredMeals]);

  const sections = useMemo(() => {
    const wanted =
      selectedCategory === ALL_CATEGORIES
        ? availableCategories
        : availableCategories.filter((category) => category.slug === selectedCategory);

    return wanted
      .map((category) => ({
        slug: category.slug,
        title: category.name,
        meals: filteredMeals
          .filter((meal) => meal.categorySlug === category.slug)
          .sort((a, b) => a.sortOrder - b.sortOrder),
      }))
      .filter((section) => section.meals.length > 0);
  }, [availableCategories, filteredMeals, selectedCategory]);

  const visibleCount = sections.reduce((total, section) => total + section.meals.length, 0);

  const confirmFromDrawer = useCallback(
    (meal: BrowserMeal) => {
      setDetailMeal(null);
      onSelectMeal(meal);
    },
    [onSelectMeal],
  );

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="relative">
        <label className="sr-only" htmlFor="meal-search">
          Search meals or ingredients
        </label>
        <input
          id="meal-search"
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search meals, ingredients or cravings"
          className="min-h-14 w-full rounded-2xl border border-white/20 bg-[var(--color-bone)] px-6 pr-20 text-sm font-semibold text-[var(--color-oxblood)] shadow-lg placeholder:text-[var(--color-oxblood)]/45 focus:outline focus:outline-2 focus:outline-offset-4 focus:outline-[var(--color-bone)]"
        />
        <span
          className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--color-oxblood)]"
          aria-hidden="true"
        >
          Search
        </span>
      </div>

      <ChipRail label="Meal categories">
        <Chip
          label="All"
          active={selectedCategory === ALL_CATEGORIES}
          onClick={() => setSelectedCategory(ALL_CATEGORIES)}
        />
        {availableCategories.map((category) => (
          <Chip
            key={category.slug}
            label={category.name}
            active={selectedCategory === category.slug}
            onClick={() => setSelectedCategory(category.slug)}
          />
        ))}
      </ChipRail>

      <ChipRail label="Calories per plate">
        {CALORIE_FILTERS.map((filter, index) => (
          <Chip
            key={filter.id}
            label={filter.label}
            active={selectedCalorieIndex === index}
            onClick={() => setSelectedCalorieIndex(index)}
          />
        ))}
      </ChipRail>

      <p className="text-sm text-[var(--color-bone)]/60" data-testid="meal-result-count">
        {visibleCount} meal{visibleCount === 1 ? "" : "s"} found
      </p>

      {loadError ? (
        <div
          role="alert"
          className="rounded-3xl bg-white/[0.08] p-5 text-[var(--color-bone)] ring-1 ring-white/10"
        >
          <h3 className="font-display text-xl">We couldn&apos;t load the menu.</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--color-bone)]/70">{loadError}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setReloadToken((token) => token + 1)}
              className="rounded-xl bg-[var(--color-bone)] px-4 py-2 text-sm font-bold text-[var(--color-oxblood)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-bone)]"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={onRequestCustom}
              className="rounded-xl border border-white/25 px-4 py-2 text-sm font-semibold text-[var(--color-bone)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-bone)]"
            >
              Describe what you want instead
            </button>
          </div>
        </div>
      ) : null}

      {isLoading && !loadError ? (
        <p role="status" className="text-sm text-[var(--color-bone)]/70">
          Loading the menu…
        </p>
      ) : null}

      {sections.length > 0 ? (
        <div className="flex flex-col gap-7">
          {sections.map((section) => (
            <MealSection
              key={section.slug}
              slug={section.slug}
              title={section.title}
              meals={section.meals}
              selectedSlug={selectedSlug}
              onOpenDetail={setDetailMeal}
              onSelect={onSelectMeal}
            />
          ))}
        </div>
      ) : null}

      {!isLoading && !loadError && sections.length === 0 ? (
        <div className="rounded-3xl bg-white/[0.08] p-6 text-[var(--color-bone)] ring-1 ring-white/10">
          <h3 className="font-display text-2xl">No exact match yet.</h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--color-bone)]/70">
            If you saw something on TikTok, Instagram, Pinterest or anywhere else, send it as a
            custom request and the kitchen can confirm it.
          </p>
          <button
            type="button"
            onClick={onRequestCustom}
            className="mt-3 rounded-xl bg-[var(--color-bone)] px-4 py-2 text-sm font-bold text-[var(--color-oxblood)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-bone)]"
          >
            Describe what you want
          </button>
        </div>
      ) : null}

      {detailMeal ? (
        <MealDetailDrawer
          meal={detailMeal}
          onClose={() => setDetailMeal(null)}
          onConfirm={confirmFromDrawer}
        />
      ) : null}
    </div>
  );
}

function ChipRail({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}): ReactElement {
  return (
    <div
      aria-label={label}
      role="group"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {children}
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  readonly label: string;
  readonly active: boolean;
  readonly onClick: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-9 flex-none whitespace-nowrap rounded-full px-3.5 text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-bone)]",
        active
          ? "bg-[var(--color-oxblood)] text-[var(--color-bone)] ring-1 ring-[var(--color-bone)]/40"
          : "border border-white/25 bg-white/10 text-[var(--color-bone)] hover:bg-white/20",
      )}
    >
      {label}
    </button>
  );
}

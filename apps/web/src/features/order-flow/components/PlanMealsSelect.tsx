"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import {
  PREFERRED_DAYS,
  findChefmatePlan,
  type PlanDayMealPlan,
  type PreferredDayId,
} from "@/features/plans/planCatalog";
import {
  fetchCategories,
  fetchMeals,
  type BrowserMeal,
  type BrowserMealCategory,
} from "@/features/meal-browser/api/mealCatalogClient";
import { MealDetailDrawer } from "@/features/meal-browser/MealDetailDrawer";
import { MealSection } from "@/features/meal-browser/MealSection";
import { toOrderMenuItem } from "@/features/meal-browser/toOrderMenuItem";
import { cn } from "@/lib/cn";
import { useOrder } from "../state/OrderContext";
import type { MealLinkSource } from "../state/orderReducer";

interface PlanMealsSelectProps {
  readonly week2?: boolean;
}

const ALL_CATEGORIES = "all";
const LINK_SOURCES: readonly MealLinkSource[] = ["TIKTOK", "INSTAGRAM", "PINTEREST", "OTHER"];

/**
 * Per-day subscription menu builder. It intentionally uses the same category
 * chips, meal rails, photos and detail drawer as Explore meals, while adding a
 * day tab and a two-main-per-day selection cap.
 */
export function PlanMealsSelect({ week2 = false }: PlanMealsSelectProps): ReactElement {
  const {
    state,
    toggleDayMeal,
    toggleWeek2DayMeal,
    toggleDayOats,
    toggleWeek2DayOats,
    setDayLink,
    setWeek2DayLink,
    removeDayLink,
    removeWeek2DayLink,
  } = useOrder();
  const plan = findChefmatePlan(state.planId);
  const days = state.preferredDays;
  const [activeDay, setActiveDay] = useState<PreferredDayId>(days[0] ?? "monday");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [meals, setMeals] = useState<readonly BrowserMeal[]>([]);
  const [categories, setCategories] = useState<readonly BrowserMealCategory[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detailMeal, setDetailMeal] = useState<BrowserMeal | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkSource, setLinkSource] = useState<MealLinkSource>("TIKTOK");
  const [linkUrl, setLinkUrl] = useState("");

  const plans = week2 ? (state.week2DayMealPlans ?? []) : state.dayMealPlans;
  const currentPlan: PlanDayMealPlan = plans.find((candidate) => candidate.day === activeDay) ?? {
    day: activeDay,
    mainSlugs: [],
    overnightOats: false,
    links: [],
  };

  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchMeals(), fetchCategories()])
      .then(([nextMeals, nextCategories]) => {
        if (!cancelled) {
          setMeals(nextMeals.filter((meal) => meal.isActive !== false));
          setCategories(nextCategories);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setLoadError(error instanceof Error ? error.message : "The menu could not be loaded.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (days.length > 0 && !days.includes(activeDay)) setActiveDay(days[0]!);
  }, [activeDay, days]);

  const visibleMeals = useMemo(() => {
    const query = search.trim().toLowerCase();
    return meals.filter((meal) => {
      const matchesSearch =
        query.length === 0 ||
        meal.name.toLowerCase().includes(query) ||
        meal.categoryName.toLowerCase().includes(query);
      return matchesSearch && (category === ALL_CATEGORIES || meal.categorySlug === category);
    });
  }, [category, meals, search]);

  const sections = useMemo(() => {
    const selectedCategories =
      category === ALL_CATEGORIES
        ? categories
        : categories.filter((candidate) => candidate.slug === category);
    return selectedCategories
      .map((candidate) => ({
        slug: candidate.slug,
        title: candidate.name,
        meals: visibleMeals.filter((meal) => meal.categorySlug === candidate.slug),
      }))
      .filter((section) => section.meals.length > 0);
  }, [categories, category, visibleMeals]);

  const toggleMeal = (meal: BrowserMeal): void => {
    if (week2) toggleWeek2DayMeal?.(activeDay, toOrderMenuItem(meal));
    else toggleDayMeal?.(activeDay, toOrderMenuItem(meal));
  };

  const toggleOats = (): void => {
    if (week2) toggleWeek2DayOats?.(activeDay);
    else toggleDayOats?.(activeDay);
  };

  const addLink = (): void => {
    if (linkUrl.trim().length < 5) return;
    if (week2) setWeek2DayLink?.(activeDay, linkSource, linkUrl.trim());
    else setDayLink?.(activeDay, linkSource, linkUrl.trim());
    setLinkUrl("");
  };

  const removeLink = (url: string): void => {
    if (week2) removeWeek2DayLink?.(activeDay, url);
    else removeDayLink?.(activeDay, url);
  };

  if (!plan) return <div />;

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--color-bone)]/70">
          {plan.name} · {week2 ? "Week 2" : "Week 1"}
        </p>
        <h2 className="font-display text-3xl font-semibold text-[var(--color-bone)] sm:text-4xl">
          Choose meals for your days
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-[var(--color-bone)]/72">
          Select a day, then explore the full menu by category. You can choose up to two mains for
          each day, add overnight oats, or leave a day open for your chef.
        </p>
      </div>

      <div
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
        role="tablist"
        aria-label="Plan a day"
      >
        {days.map((dayId) => {
          const day = PREFERRED_DAYS.find((candidate) => candidate.id === dayId);
          const dayPlan = plans.find((candidate) => candidate.day === dayId);
          const count = (dayPlan?.mainSlugs.length ?? 0) + (dayPlan?.links.length ?? 0);
          return (
            <button
              key={dayId}
              type="button"
              role="tab"
              aria-selected={activeDay === dayId}
              onClick={() => setActiveDay(dayId)}
              className={cn(
                "flex min-h-16 items-center justify-between rounded-2xl px-4 text-left ring-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-bone)]",
                activeDay === dayId
                  ? "bg-[var(--color-bone)] text-[var(--color-oxblood)] ring-[var(--color-bone)]"
                  : "bg-white/[0.07] text-[var(--color-bone)] ring-white/15 hover:bg-white/[0.13]",
              )}
            >
              <span className="font-bold">{day?.label ?? dayId}</span>
              <span className="text-xs opacity-65">{count ? `${count} picked` : "Open"}</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-3xl bg-white/[0.06] p-4 ring-1 ring-white/10 sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--color-bone)]/60">
              {PREFERRED_DAYS.find((day) => day.id === activeDay)?.label ?? activeDay}
            </p>
            <p className="mt-1 text-sm text-[var(--color-bone)]/75">
              {currentPlan.mainSlugs.length}/2 mains selected
              {currentPlan.overnightOats ? " · overnight oats added" : ""}
            </p>
          </div>
          <button
            type="button"
            aria-pressed={currentPlan.overnightOats}
            onClick={toggleOats}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-bold ring-1 transition-colors",
              currentPlan.overnightOats
                ? "bg-[var(--color-bone)] text-[var(--color-oxblood)] ring-[var(--color-bone)]"
                : "bg-white/[0.07] text-[var(--color-bone)] ring-white/15 hover:bg-white/[0.13]",
            )}
          >
            {currentPlan.overnightOats ? "Overnight oats added" : "Add overnight oats"}
          </button>
        </div>
        <label className="sr-only" htmlFor={`plan-day-search-${week2 ? "week2" : "week1"}`}>
          Search meals
        </label>
        <input
          id={`plan-day-search-${week2 ? "week2" : "week1"}`}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search meals, ingredients or cravings"
          className="min-h-12 w-full rounded-2xl border border-white/20 bg-[var(--color-bone)] px-5 text-sm font-semibold text-[var(--color-oxblood)] placeholder:text-[var(--color-oxblood)]/45 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--color-bone)]"
        />
        <div
          className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Meal categories"
        >
          <button
            type="button"
            aria-pressed={category === ALL_CATEGORIES}
            onClick={() => setCategory(ALL_CATEGORIES)}
            className={chipClass(category === ALL_CATEGORIES)}
          >
            All
          </button>
          {categories.map((candidate) => (
            <button
              key={candidate.slug}
              type="button"
              aria-pressed={category === candidate.slug}
              onClick={() => setCategory(candidate.slug)}
              className={chipClass(category === candidate.slug)}
            >
              {candidate.name}
            </button>
          ))}
        </div>{" "}
        <div
          className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/[0.07] px-4 py-3"
          aria-label="Custom meal or recipe link"
        >
          <div>
            <p className="text-sm font-bold text-[var(--color-bone)]">Custom meal or recipe link</p>
            <p className="text-xs text-[var(--color-bone)]/60">
              Can&apos;t find the meal you want? Share a recipe or social link with your chef.
            </p>
          </div>
          <button
            type="button"
            aria-expanded={linkOpen}
            onClick={() => setLinkOpen((open) => !open)}
            className="flex-none rounded-xl bg-[var(--color-bone)] px-4 py-2 text-sm font-bold text-[var(--color-oxblood)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-bone)]"
          >
            {linkOpen ? "Hide link option" : "Add meal link"}
          </button>
        </div>
        {linkOpen ? (
          <div className="mt-3 flex flex-col gap-3 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
            <div className="flex flex-wrap gap-2">
              {LINK_SOURCES.map((source) => (
                <button
                  key={source}
                  type="button"
                  aria-pressed={linkSource === source}
                  onClick={() => setLinkSource(source)}
                  className={chipClass(linkSource === source)}
                >
                  {source === "OTHER" ? "Other" : source.charAt(0) + source.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="url"
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                placeholder="Paste a meal link"
                aria-label={`Meal link for ${activeDay}`}
                className="min-h-11 min-w-0 flex-1 rounded-xl bg-[var(--color-bone)] px-4 text-sm font-semibold text-[var(--color-oxblood)] placeholder:text-[var(--color-oxblood)]/45"
              />
              <button
                type="button"
                disabled={linkUrl.trim().length < 5}
                onClick={addLink}
                className="min-h-11 rounded-xl bg-[var(--color-bone)] px-4 text-sm font-bold text-[var(--color-oxblood)] disabled:opacity-45"
              >
                Add link
              </button>
            </div>
            {currentPlan.links.length > 0 ? (
              <ul className="flex flex-wrap gap-2" aria-label="Links for this day">
                {currentPlan.links.map((link) => (
                  <li
                    key={link}
                    className="flex max-w-full items-center gap-2 rounded-full bg-white/[0.12] px-3 py-1.5 text-xs text-[var(--color-bone)]"
                  >
                    <span className="truncate">{link}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${link}`}
                      onClick={() => removeLink(link)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        {loadError ? (
          <p role="alert" className="mt-5 text-sm text-[var(--color-bone)]">
            {loadError}
          </p>
        ) : null}
        {!loadError && sections.length > 0 ? (
          <div className="mt-6 flex flex-col gap-7">
            {sections.map((section) => (
              <MealSection
                key={section.slug}
                title={section.title}
                slug={`plan-${week2 ? "week2" : "week1"}-${section.slug}`}
                meals={section.meals}
                selectedSlug={currentPlan.mainSlugs}
                onOpenDetail={setDetailMeal}
                onSelect={toggleMeal}
              />
            ))}
          </div>
        ) : null}
      </div>

      <p className="text-sm text-[var(--color-bone)]/65">
        You can leave any day open and decide with your chef later. Your choices are preferences and
        can be changed.
      </p>

      {detailMeal ? (
        <MealDetailDrawer
          meal={detailMeal}
          onClose={() => setDetailMeal(null)}
          onConfirm={(meal) => {
            toggleMeal(meal);
            setDetailMeal(null);
          }}
        />
      ) : null}
    </div>
  );
}

function chipClass(active: boolean): string {
  return cn(
    "min-h-9 flex-none whitespace-nowrap rounded-full px-3.5 text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-bone)]",
    active
      ? "bg-[var(--color-bone)] text-[var(--color-oxblood)]"
      : "border border-white/25 bg-white/10 text-[var(--color-bone)] hover:bg-white/20",
  );
}

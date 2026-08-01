"use client";

import { useEffect, useState, type ReactElement } from "react";
import {
  FEATURED_MEAL_COUNT,
  fetchCatalogMeals,
  updateFeaturedMeals,
  type CatalogMeal,
} from "@/features/featured-meals/api/featuredMealsClient";

/**
 * Admin picker for the landing-page featured meals marquee. Enforces exactly
 * six selections client-side; the backend re-validates independently.
 */
export function FeaturedMealsPanel(): ReactElement {
  const [meals, setMeals] = useState<readonly CatalogMeal[]>([]);
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const catalog = await fetchCatalogMeals();
        if (!active) return;
        setMeals(catalog);
        setSelected(currentlyFeatured(catalog));
      } catch (caught) {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : "Could not load the meal catalog.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const isFull = selected.length >= FEATURED_MEAL_COUNT;
  const canSave = selected.length === FEATURED_MEAL_COUNT && !saving;

  const toggle = (slug: string): void => {
    setNotice(null);
    setError(null);
    setSelected((current) =>
      current.includes(slug)
        ? current.filter((entry) => entry !== slug)
        : current.length >= FEATURED_MEAL_COUNT
          ? current
          : [...current, slug],
    );
  };

  const save = (): void => {
    if (selected.length !== FEATURED_MEAL_COUNT) return;
    setSaving(true);
    setNotice(null);
    setError(null);
    void (async () => {
      try {
        const items = await updateFeaturedMeals(selected);
        setMeals((current) => mergeFeatured(current, items));
        setSelected(items.map((item) => item.slug));
        setNotice(`Featured meals updated: ${items.map((item) => item.name).join(", ")}.`);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not save featured meals.");
      } finally {
        setSaving(false);
      }
    })();
  };

  return (
    <section
      className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]"
      data-testid="featured-meals-panel"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-2xl font-black text-[var(--color-oxblood)]">Featured meals</h2>
        <p
          className="text-sm font-bold text-[var(--color-charcoal)]/70"
          data-testid="featured-count"
        >
          {selected.length} / {FEATURED_MEAL_COUNT} selected
        </p>
      </div>
      <p className="mt-2 text-sm text-[var(--color-charcoal)]/70">
        Pick exactly {FEATURED_MEAL_COUNT} meals for the landing page marquee. They appear in the
        order you select them.
      </p>

      {loading ? (
        <p className="mt-4 text-sm font-semibold" role="status">
          Loading meal catalog...
        </p>
      ) : null}
      {notice ? (
        <p
          className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900"
          role="status"
        >
          {notice}
        </p>
      ) : null}
      {error ? (
        <p
          className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-900"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <ul className="mt-4 grid max-h-[26rem] gap-2 overflow-y-auto pr-1">
        {meals.map((meal) => {
          const position = selected.indexOf(meal.slug);
          const checked = position >= 0;
          return (
            <li key={meal.slug}>
              <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-warm-cream)] p-3 text-sm">
                <input
                  checked={checked}
                  data-testid={`featured-meal-${meal.slug}`}
                  disabled={saving || (!checked && isFull)}
                  onChange={() => toggle(meal.slug)}
                  type="checkbox"
                />
                <span className="font-black">{meal.name}</span>
                {checked ? (
                  <span className="text-[var(--color-charcoal)]/60">position {position + 1}</span>
                ) : null}
              </label>
            </li>
          );
        })}
      </ul>

      <button
        className="mt-4 min-h-10 rounded-xl bg-[var(--color-oxblood)] px-4 text-sm font-bold text-white disabled:opacity-50"
        disabled={!canSave}
        onClick={save}
        type="button"
      >
        {saving ? "Saving..." : "Save featured meals"}
      </button>
    </section>
  );
}

function currentlyFeatured(catalog: readonly CatalogMeal[]): readonly string[] {
  return catalog
    .filter((meal) => meal.isFeatured)
    .slice()
    .sort((left, right) => (left.featuredOrder ?? 0) - (right.featuredOrder ?? 0))
    .slice(0, FEATURED_MEAL_COUNT)
    .map((meal) => meal.slug);
}

function mergeFeatured(
  catalog: readonly CatalogMeal[],
  featured: readonly CatalogMeal[],
): readonly CatalogMeal[] {
  const bySlug = new Map(featured.map((meal) => [meal.slug, meal]));
  return catalog.map((meal) => {
    const updated = bySlug.get(meal.slug);
    if (updated) return updated;
    return meal.isFeatured ? { ...meal, isFeatured: false, featuredOrder: null } : meal;
  });
}

"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { findChefmatePlan, weeklyMainCapacity } from "@/features/plans/planCatalog";
import { fetchMeals, type BrowserMeal } from "@/features/meal-browser/api/mealCatalogClient";
import { mealImage } from "@/features/meal-browser/mealPresentation";
import { toOrderMenuItem } from "@/features/meal-browser/toOrderMenuItem";
import { cn } from "@/lib/cn";
import { useOrder } from "../state/OrderContext";
import type { MealLinkSource } from "../state/orderReducer";

const SEARCH_DEBOUNCE_MS = 250;

/**
 * "What would you like most often?" — the subscriber names their weekly menu.
 * Option 1 is the go-to favourite; option 2 is the meal-prep pack; the 8- and
 * 12-session plans can name up to six mains so the weekly rota can cycle
 * through more variety (the 4-session plan keeps the original two options).
 * Any slot can also be a pasted TikTok / Instagram / Pinterest link instead of
 * a catalog meal. A meal fills exactly one slot.
 *
 * This step reads the real catalog (the same endpoint the meal browser uses)
 * rather than a hardcoded shortlist, so the stored favourites are always slugs
 * the backend can resolve. Meals render with their real photos so choosing
 * feels like the meal browser.
 */
export function PlanFavoriteSelect(): ReactElement {
  const {
    state,
    selectPlanFavorite,
    selectPlanSecondFavorite,
    togglePlanExtraMeal,
    setPlanFavoriteLink,
    setPlanSecondFavoriteLink,
    setPlanExtraMealLink,
    clearPlanFavoriteLink,
    clearPlanSecondFavoriteLink,
    removePlanExtraMealLink,
    decidePlanFavorite,
    reset,
  } = useOrder();
  const plan = findChefmatePlan(state.planId);
  const capacity = weeklyMainCapacity(state.planId);
  const extraCapacity = Math.max(0, capacity - 2);
  const extrasUsed = state.extraMeals.length + state.extraMealLinks.length;
  const extrasFull = extrasUsed >= extraCapacity;

  const [linkPanelOpen, setLinkPanelOpen] = useState(false);
  const [linkSource, setLinkSource] = useState<MealLinkSource>("TIKTOK");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkSlot, setLinkSlot] = useState<"one" | "two" | "extra">("one");

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
  const extraMeals = state.extraMeals;

  /** Which slot a tapped meal would fill (or is already filling). */
  const slotFor = (meal: BrowserMeal): 1 | 2 | "extra" | "full" => {
    if (state.favoriteMealId === meal.slug) return 1;
    if (state.secondFavoriteMealId === meal.slug) return 2;
    if (state.extraMeals.some((extra) => extra.id === meal.slug)) return "extra";
    if (!state.favoriteMealId) return 1;
    if (!state.secondFavoriteMealId) return 2;
    return extrasFull ? "full" : "extra";
  };

  const handleMealClick = (meal: BrowserMeal): void => {
    const slot = slotFor(meal);
    const item = toOrderMenuItem(meal);
    if (slot === 1) {
      selectPlanFavorite(item); // toggles option 1 off
      return;
    }
    if (slot === 2) {
      selectPlanSecondFavorite(item); // toggles option 2 off
      return;
    }
    if (slot === "extra") {
      togglePlanExtraMeal(item);
    }
    // "full": every slot is taken — no-op, matching the disabled semantics.
  };

  const submitLink = (): void => {
    if (linkUrl.trim().length < 5) return;
    if (linkSlot === "one") {
      setPlanFavoriteLink(linkSource, linkUrl.trim());
      setLinkSlot("two");
    } else if (linkSlot === "two") {
      setPlanSecondFavoriteLink(linkSource, linkUrl.trim());
      if (extraCapacity > 0) setLinkSlot("extra");
    } else if (!extrasFull) {
      setPlanExtraMealLink(linkSource, linkUrl.trim());
    }
    setLinkUrl("");
  };

  const linkSlotAvailable = (slot: "one" | "two" | "extra"): boolean => {
    if (slot === "one") return !state.favoriteMealId && !state.favoriteMealLink;
    if (slot === "two") return !state.secondFavoriteMealId && !state.secondFavoriteMealLink;
    return !extrasFull;
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
          {capacity > 2
            ? `Name your weekly menu — up to ${capacity} mains your chef can cycle through. You can change things up with every visit.`
            : "Pick a favourite for your first Chefmate menu. You can change things up with every visit — or add a second meal for meal-prep packs."}
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

        {firstMeal ||
        secondMeal ||
        extraMeals.length > 0 ||
        state.favoriteMealLink ||
        state.secondFavoriteMealLink ||
        state.extraMealLinks.length > 0 ? (
          <div
            className="flex max-w-xl flex-wrap items-center gap-2"
            aria-label="Your chosen meals"
          >
            {state.favoriteMealLink ? (
              <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-[var(--color-bone)] px-3 py-1.5 text-xs font-bold text-[var(--color-oxblood)]">
                Option 1: {state.favoriteMealLink.source.toLowerCase()} link
                <button
                  type="button"
                  aria-label="Remove option 1 link"
                  onClick={clearPlanFavoriteLink}
                  className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-oxblood)]/15 text-[var(--color-oxblood)] hover:bg-[var(--color-oxblood)]/25"
                >
                  ×
                </button>
              </span>
            ) : null}
            {state.secondFavoriteMealLink ? (
              <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-[var(--color-bone)]/15 px-3 py-1.5 text-xs font-bold text-[var(--color-bone)] ring-1 ring-white/20">
                Option 2: {state.secondFavoriteMealLink.source.toLowerCase()} link
                <button
                  type="button"
                  aria-label="Remove option 2 link"
                  onClick={clearPlanSecondFavoriteLink}
                  className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-[var(--color-bone)] hover:bg-white/30"
                >
                  ×
                </button>
              </span>
            ) : null}
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
            {extraMeals.map((meal) => (
              <span
                key={meal.id}
                className="inline-flex items-center gap-2 rounded-full bg-white/[0.13] px-3 py-1.5 text-xs font-bold text-[var(--color-bone)] ring-1 ring-white/20"
              >
                {/* Extras are full catalog items — render their image directly. */}
                <Image
                  src={meal.imageSrc}
                  alt=""
                  width={56}
                  height={56}
                  className="h-7 w-7 rounded-full object-cover"
                />
                {meal.name}
                <button
                  type="button"
                  aria-label={`Remove ${meal.name}`}
                  onClick={() => togglePlanExtraMeal(meal)}
                  className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-[var(--color-bone)] hover:bg-white/30"
                >
                  ×
                </button>
              </span>
            ))}
            {state.extraMealLinks.map((link) => (
              <span
                key={link.url}
                className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/[0.13] px-3 py-1.5 text-xs font-bold text-[var(--color-bone)] ring-1 ring-white/20"
              >
                {link.source.toLowerCase()} link
                <button
                  type="button"
                  aria-label={`Remove ${link.source.toLowerCase()} link`}
                  onClick={() => removePlanExtraMealLink(link.url)}
                  className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-[var(--color-bone)] hover:bg-white/30"
                >
                  ×
                </button>
              </span>
            ))}
            <span className="text-xs text-[var(--color-bone)]/62">
              {capacity > 2
                ? `${extrasUsed}/${extraCapacity} extra mains · option 2 is for meal-prep packs.`
                : "Option 2 is for meal-prep packs — optional."}
            </span>
          </div>
        ) : null}

        {visibleMeals.length > 0 ? (
          <ul
            aria-label="Meals you can pick as your favourites"
            data-testid="plan-favourite-options"
            className="grid max-h-[26rem] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2"
          >
            {visibleMeals.map((meal) => {
              const slot = slotFor(meal);
              const isSelected = slot === 1 || slot === 2 || slot === "extra";
              const isFull = slot === "full" && !isSelected;
              const image = mealImage(meal);
              return (
                <li key={meal.slug}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    aria-disabled={isFull}
                    data-testid={`plan-favourite-${meal.slug}`}
                    onClick={() => handleMealClick(meal)}
                    className={cn(
                      "flex min-h-[4.5rem] w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ring-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-bone)]",
                      slot === 1
                        ? "bg-[var(--color-bone)] text-[var(--color-oxblood)] ring-[var(--color-bone)]"
                        : isSelected
                          ? "bg-white/[0.13] text-[var(--color-bone)] ring-[var(--color-bone)]/70"
                          : "bg-white/[0.07] text-[var(--color-bone)] ring-white/15 hover:bg-white/[0.13]",
                      isFull && "cursor-not-allowed opacity-45 hover:bg-white/[0.07]",
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
                        {slot === 1 ? (
                          <span className="shrink-0 rounded-full bg-[var(--color-oxblood)]/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--color-oxblood)]">
                            Option 1
                          </span>
                        ) : null}
                        {slot === 2 ? (
                          <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--color-bone)]">
                            Option 2
                          </span>
                        ) : null}
                        {slot === "extra" ? (
                          <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--color-bone)]">
                            Weekly main
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={cn(
                          "text-xs",
                          slot === 1
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

      <div className="flex flex-col gap-3">
        <button
          type="button"
          aria-expanded={linkPanelOpen}
          onClick={() => setLinkPanelOpen((open) => !open)}
          className="w-fit text-sm font-bold text-[var(--color-bone)] underline decoration-[var(--color-bone)]/40 underline-offset-4 transition hover:decoration-[var(--color-bone)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-bone)]"
        >
          Can&apos;t find what you want? Paste a link
        </button>

        {linkPanelOpen ? (
          <div className="flex max-w-xl flex-col gap-3 rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/15">
            <p className="text-sm text-[var(--color-bone)]/80">
              Saw something delicious on TikTok, Instagram or Pinterest? Paste the link and our
              chefs will make it happen.
            </p>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-label="Where did you see it?"
            >
              {(["TIKTOK", "INSTAGRAM", "PINTEREST", "OTHER"] as const).map((source) => (
                <button
                  key={source}
                  type="button"
                  aria-pressed={linkSource === source}
                  onClick={() => setLinkSource(source)}
                  className={
                    "min-h-9 rounded-full px-4 text-xs font-extrabold uppercase tracking-wide ring-1 transition-colors " +
                    (linkSource === source
                      ? "bg-[var(--color-bone)] text-[var(--color-oxblood)] ring-[var(--color-bone)]"
                      : "bg-white/[0.07] text-[var(--color-bone)] ring-white/20 hover:bg-white/[0.13]")
                  }
                >
                  {source === "OTHER" ? "Other" : source.charAt(0) + source.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-label="Which option does this link fill?"
            >
              {(["one", "two", ...(extraCapacity > 0 ? (["extra"] as const) : [])] as const).map(
                (slot) => (
                  <button
                    key={slot}
                    type="button"
                    aria-pressed={linkSlot === slot}
                    disabled={!linkSlotAvailable(slot)}
                    onClick={() => setLinkSlot(slot)}
                    className={
                      "min-h-9 rounded-full px-4 text-xs font-extrabold uppercase tracking-wide ring-1 transition-colors disabled:cursor-not-allowed disabled:opacity-40 " +
                      (linkSlot === slot
                        ? "bg-[var(--color-bone)] text-[var(--color-oxblood)] ring-[var(--color-bone)]"
                        : "bg-white/[0.07] text-[var(--color-bone)] ring-white/20 hover:bg-white/[0.13]")
                    }
                  >
                    {slot === "one" ? "Option 1" : slot === "two" ? "Option 2" : "Extra main"}
                  </button>
                ),
              )}
            </div>
            <input
              type="url"
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="Paste your meal link"
              aria-label="Meal link"
              className="min-h-11 w-full rounded-xl border border-white/20 bg-[var(--color-bone)] px-4 text-sm font-semibold text-[var(--color-oxblood)] placeholder:text-[var(--color-oxblood)]/45 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--color-bone)]"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={linkUrl.trim().length < 5 || !linkSlotAvailable(linkSlot)}
                onClick={submitLink}
                className="min-h-10 rounded-xl bg-[var(--color-bone)] px-4 text-sm font-bold text-[var(--color-oxblood)] transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {linkSlot === "one"
                  ? "Use as option 1"
                  : linkSlot === "two"
                    ? "Use as option 2"
                    : "Add as extra main"}
              </button>
            </div>
          </div>
        ) : null}
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

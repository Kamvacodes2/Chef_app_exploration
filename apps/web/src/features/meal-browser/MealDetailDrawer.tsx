"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { cn } from "@/lib/cn";
import type { BrowserMeal, MealNutritionProfile } from "./api/mealCatalogClient";
import {
  PLATE_LABELS,
  mealImage,
  parseIngredients,
  parseRecipeSteps,
  primaryProfile,
  servesLabel,
} from "./mealPresentation";

export interface MealDetailDrawerProps {
  readonly meal: BrowserMeal;
  readonly onClose: () => void;
  /** Selects the meal and advances the order flow, then closes the drawer. */
  readonly onConfirm: (meal: BrowserMeal) => void;
}

const INGREDIENTS_FALLBACK = "Ingredients will be confirmed before your session.";

/**
 * Bottom-sheet meal detail. Every optional field is hidden rather than shown
 * empty, and nothing here can block booking.
 */
export function MealDetailDrawer({
  meal,
  onClose,
  onConfirm,
}: MealDetailDrawerProps): ReactElement {
  const [plateType, setPlateType] = useState<MealNutritionProfile["plateType"] | null>(
    primaryProfile(meal)?.plateType ?? null,
  );
  const [recipeOpen, setRecipeOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const image = mealImage(meal);
  const profile = meal.nutritionProfiles.find((p) => p.plateType === plateType) ?? null;
  const ingredients = parseIngredients(meal.ingredients);
  const recipeSteps = parseRecipeSteps(meal.recipeGuidelines);
  const chefNote = meal.chefNote?.trim() ?? "";
  const titleId = `meal-drawer-title-${meal.slug}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Close meal details"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="meal-detail-drawer"
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-[var(--color-warm-cream)] shadow-2xl"
        style={{ animation: "chefmate-drawer-in 260ms ease-out both" }}
      >
        <style>{`@keyframes chefmate-drawer-in { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

        <div className="relative h-56 w-full shrink-0 bg-[var(--color-oxblood)]">
          <Image src={image.src} alt={image.alt} fill sizes="512px" className="object-cover" />
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-sm font-bold text-[var(--color-bone)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-bone)]"
          >
            <span aria-hidden="true">{"✕"}</span>
            <span className="sr-only">Close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-oxblood)]/60">
            {meal.categoryName}
          </p>
          <h2
            id={titleId}
            className="mt-1 font-display text-2xl font-semibold text-[var(--color-oxblood)]"
          >
            {meal.name}
          </h2>
          <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/70">
            {servesLabel(meal)}
            {meal.sessionFit ? ` · ${meal.sessionFit}` : ""}
          </p>
          {meal.description ? (
            <p className="mt-3 text-sm leading-6 text-[var(--color-charcoal)]/85">
              {meal.description}
            </p>
          ) : null}

          {meal.nutritionProfiles.length > 0 ? (
            <section className="mt-5" aria-label="Nutrition">
              <div
                className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="group"
                aria-label="Plate style"
              >
                {meal.nutritionProfiles.map((option) => {
                  const active = option.plateType === plateType;
                  return (
                    <button
                      key={option.plateType}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setPlateType(option.plateType)}
                      className={cn(
                        "flex-none whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-oxblood)]",
                        active
                          ? "bg-[var(--color-oxblood)] text-[var(--color-bone)]"
                          : "border border-[var(--color-oxblood)]/25 bg-white/70 text-[var(--color-oxblood)]",
                      )}
                    >
                      {PLATE_LABELS[option.plateType]}
                    </button>
                  );
                })}
              </div>

              {profile ? (
                <dl className="mt-3 grid grid-cols-4 gap-2">
                  <NutritionStat label="Calories" value={`${Math.round(profile.caloriesKcal)}`} />
                  <NutritionStat label="Protein" value={`${Math.round(profile.proteinG)}g`} />
                  <NutritionStat label="Carbs" value={`${Math.round(profile.carbsG)}g`} />
                  <NutritionStat label="Fat" value={`${Math.round(profile.fatG)}g`} />
                </dl>
              ) : null}
              {meal.measurementNote ? (
                <p className="mt-2 text-[10px] leading-tight text-[var(--color-charcoal)]/55">
                  {meal.measurementNote}
                </p>
              ) : null}
            </section>
          ) : null}

          <section className="mt-5" aria-label="Ingredients">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--color-oxblood)]">
              Ingredients
            </h3>
            {ingredients.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {ingredients.map((ingredient) => (
                  <li
                    key={ingredient}
                    className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-[var(--color-charcoal)]/85 ring-1 ring-[var(--color-oxblood)]/10"
                  >
                    {ingredient}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-[var(--color-charcoal)]/75">{INGREDIENTS_FALLBACK}</p>
            )}
          </section>

          {recipeSteps.length > 0 ? (
            <section className="mt-5" aria-label="How the chef cooks it">
              <button
                type="button"
                onClick={() => setRecipeOpen((open) => !open)}
                aria-expanded={recipeOpen}
                className="flex w-full items-center justify-between rounded-xl bg-white/70 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--color-oxblood)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-oxblood)]"
              >
                How the chef cooks it
                <span aria-hidden="true">{recipeOpen ? "−" : "+"}</span>
              </button>
              {recipeOpen ? (
                <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-6 text-[var(--color-charcoal)]/85">
                  {recipeSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              ) : null}
            </section>
          ) : null}

          {chefNote ? (
            <section className="mt-5" aria-label="Chef note">
              <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--color-oxblood)]">
                Chef note
              </h3>
              <p className="mt-2 rounded-2xl bg-[var(--color-soft-beige)]/70 p-3 text-sm leading-6 text-[var(--color-charcoal)]/85">
                {chefNote}
              </p>
            </section>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-[var(--color-oxblood)]/10 bg-[var(--color-warm-white)] p-4">
          <button
            type="button"
            onClick={() => onConfirm(meal)}
            className="min-h-12 w-full rounded-2xl bg-[var(--color-oxblood)] text-sm font-bold text-[var(--color-bone)] transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-oxblood)]"
          >
            Continue to session
          </button>
        </div>
      </div>
    </div>
  );
}

function NutritionStat({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="rounded-2xl bg-white/80 p-2.5 text-center ring-1 ring-[var(--color-oxblood)]/10">
      <dt className="text-[9px] font-bold uppercase tracking-wide text-[var(--color-oxblood)]/60">
        {label}
      </dt>
      <dd className="text-sm font-bold text-[var(--color-oxblood)]">{value}</dd>
    </div>
  );
}

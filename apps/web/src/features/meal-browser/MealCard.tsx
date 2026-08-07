"use client";

import Image from "next/image";
import type { ReactElement } from "react";
import { cn } from "@/lib/cn";
import type { BrowserMeal } from "./api/mealCatalogClient";
import { mealImage, primaryProfile, servesLabel } from "./mealPresentation";

export interface MealCardProps {
  readonly meal: BrowserMeal;
  readonly selected: boolean;
  /** Card body tap — opens the detail drawer. */
  readonly onOpenDetail: () => void;
  /** Plus button — selects the meal and advances the step immediately. */
  readonly onSelect: () => void;
}

/**
 * A single meal tile. Deliberately price-free: mains are covered by the flat
 * session base price, so the badge carries kcal instead.
 */
export function MealCard({ meal, selected, onOpenDetail, onSelect }: MealCardProps): ReactElement {
  const image = mealImage(meal);
  const profile = primaryProfile(meal);

  return (
    <article
      data-testid={`meal-card-${meal.slug}`}
      className={cn(
        "group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl bg-[var(--color-warm-white)] text-left shadow-md transition-shadow",
        selected
          ? "ring-[3px] ring-[var(--color-terracotta)] shadow-xl"
          : "ring-1 ring-black/10 hover:shadow-lg",
      )}
    >
      {/* Fixed 65% aspect box: food detail is centred, so cover-cropping is correct. */}
      <div
        className="relative w-full overflow-hidden bg-[var(--color-oxblood)]"
        style={{ paddingBottom: "65%" }}
      >
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="(max-width: 767px) 44vw, (max-width: 1023px) 33vw, 260px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div
          className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent"
          aria-hidden="true"
        />
        {profile ? (
          <span className="absolute bottom-2 left-2 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-bone)] backdrop-blur-sm">
            {Math.round(profile.caloriesKcal)} kcal
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h4 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-tight text-[var(--color-oxblood)]">
          {meal.name}
        </h4>
        <p className="text-[11px] font-medium text-[var(--color-charcoal)]/70">
          {servesLabel(meal)}
        </p>

        {profile ? (
          <>
            <dl
              className="mt-auto grid grid-cols-3 gap-1 border-t border-[var(--color-oxblood)]/10 pt-1.5 text-[10px] text-[var(--color-charcoal)]/75"
              aria-label={`Macros for ${meal.name}`}
            >
              <div>
                <dt className="font-bold uppercase tracking-wide">P</dt>
                <dd>{Math.round(profile.proteinG)}g</dd>
              </div>
              <div>
                <dt className="font-bold uppercase tracking-wide">C</dt>
                <dd>{Math.round(profile.carbsG)}g</dd>
              </div>
              <div>
                <dt className="font-bold uppercase tracking-wide">F</dt>
                <dd>{Math.round(profile.fatG)}g</dd>
              </div>
            </dl>
            <p className="text-[9px] leading-tight text-[var(--color-charcoal)]/55">
              Estimate per plate
            </p>
          </>
        ) : null}
      </div>

      {/* Full-card hit area for the detail drawer, kept keyboard reachable. */}
      <button
        type="button"
        onClick={onOpenDetail}
        aria-label={`View ${meal.name} details`}
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-bone)]"
      />

      <button
        type="button"
        onClick={(event) => {
          // Selecting must not also open the drawer.
          event.stopPropagation();
          onSelect();
        }}
        aria-label={`Choose ${meal.name}`}
        className="absolute right-2 top-2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-oxblood)] text-lg font-bold leading-none text-[var(--color-bone)] shadow-lg transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-bone)]"
      >
        <span aria-hidden="true">+</span>
      </button>
    </article>
  );
}

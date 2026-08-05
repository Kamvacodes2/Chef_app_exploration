"use client";

import type { ReactElement } from "react";
import type { BrowserMeal } from "./api/mealCatalogClient";
import { MealCard } from "./MealCard";

export interface MealSectionProps {
  readonly title: string;
  readonly slug: string;
  readonly meals: readonly BrowserMeal[];
  readonly selectedSlug: string | null;
  readonly onOpenDetail: (meal: BrowserMeal) => void;
  readonly onSelect: (meal: BrowserMeal) => void;
}

/**
 * One category of meals: a horizontal swipe rail on mobile (roughly 2.5 cards
 * visible so the sideways gesture is discoverable) and a grid on desktop.
 */
export function MealSection({
  title,
  slug,
  meals,
  selectedSlug,
  onOpenDetail,
  onSelect,
}: MealSectionProps): ReactElement | null {
  if (meals.length === 0) return null;

  return (
    <section aria-labelledby={`meal-section-${slug}`} data-testid={`meal-section-${slug}`}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3
          id={`meal-section-${slug}`}
          className="font-display text-lg font-semibold text-[var(--color-bone)]"
        >
          {title}
        </h3>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-bone)]/60">
          {meals.length} meal{meals.length === 1 ? "" : "s"}
        </p>
      </div>

      {/*
        One DOM set, two layouts: a scroll-snapping rail under `md` and a grid
        above it. Rendering the cards twice would duplicate every button and
        image in the accessibility tree, so the layout switches by class.

        Column tiers (the grid lives inside the order flow's `max-w-6xl`
        (1152px) shell, so widths stop growing past a 1152px content box):
          768-1439px  -> 3 columns  (1024px viewport => ~315px cards,
                                     1280px viewport => ~373px cards)
          >= 1440px   -> 4 columns  (~276px cards)
        `lg:` (1024px) was previously used for the 4-column tier, which made the
        3-column tier unreachable on every real desktop width. 1440px is not a
        default Tailwind breakpoint (`xl` is 1280px, `2xl` is 1536px), so it is
        declared as a custom NAMED breakpoint (`wide`, see the `@theme` block in
        `app/globals.css`).

        Do not switch this back to an arbitrary `min-[1440px]:` variant: at
        >=1440px both the `md` and the 1440px media queries match, both rules
        have identical specificity, and Tailwind v4 only guarantees value-order
        emission for NAMED breakpoints. As an arbitrary variant it was emitted
        before `md:grid-cols-3`, which then won the cascade and pinned every
        wide desktop to 3 columns.
      */}
      <div
        className="-mx-4 flex items-stretch gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 wide:grid-cols-4 [&::-webkit-scrollbar]:hidden"
        data-testid={`meal-grid-${slug}`}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {meals.map((meal) => (
          <div key={meal.slug} className="w-[38vw] flex-none md:w-auto">
            <MealCard
              meal={meal}
              selected={meal.slug === selectedSlug}
              onOpenDetail={() => onOpenDetail(meal)}
              onSelect={() => onSelect(meal)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

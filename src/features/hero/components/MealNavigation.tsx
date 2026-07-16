"use client";

export interface MealNavigationProps {
  readonly onPrev: () => void;
  readonly onNext: () => void;
}

/**
 * Renders the prev/next arrows for meal navigation.
 *
 * Mobile: a single stacked row below the model (thumb-zone friendly).
 * Desktop (sm+): the row becomes `display: contents` so each child can be
 * absolutely positioned against the nearest positioned ancestor (the model's
 * own container) — the arrows flank the model on either side.
 */
export function MealNavigation({ onPrev, onNext }: MealNavigationProps) {
  return (
    <div
      className="flex items-center justify-center gap-4 pb-[calc(var(--safe-bottom)+0.5rem)] sm:contents"
      data-testid="meal-navigation"
    >
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous meal"
        className="hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/80 text-xl shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-900 sm:absolute sm:left-4 sm:top-1/2 sm:z-20 sm:flex sm:-translate-y-1/2"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={onNext}
        aria-label="Next meal"
        className="hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/80 text-xl shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-900 sm:absolute sm:right-4 sm:top-1/2 sm:z-20 sm:flex sm:-translate-y-1/2"
      >
        ›
      </button>
    </div>
  );
}

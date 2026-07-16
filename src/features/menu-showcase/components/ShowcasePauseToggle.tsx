"use client";

import type { ReactElement } from "react";

export interface ShowcasePauseToggleProps {
  readonly isPaused: boolean;
  readonly onToggle: () => void;
}

/**
 * Keyboard-focusable pause/play control for the auto-advancing showcase.
 * Positioned unobtrusively in the stage's bottom-right corner. Styled to
 * match the project's existing round icon-button conventions (see
 * hero/components/MealNavigation.tsx).
 */
export function ShowcasePauseToggle({ isPaused, onToggle }: ShowcasePauseToggleProps): ReactElement {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isPaused ? "Resume menu showcase" : "Pause menu showcase"}
      data-testid="showcase-pause-toggle"
      className="absolute bottom-4 right-4 z-20 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/80 text-xl shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-900"
    >
      {isPaused ? "▶" : "⏸"}
    </button>
  );
}

"use client";

export interface PrimaryCtaProps {
  readonly onClick: () => void;
}

export function PrimaryCta({ onClick }: PrimaryCtaProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 min-h-[44px] min-w-[44px] rounded-2xl bg-[var(--color-bone)] px-8 py-3 font-display text-lg text-[var(--color-oxblood)] shadow-lg transition-transform transition-colors hover:scale-105 hover:bg-[var(--color-maize)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-bone)] active:scale-95"
    >
      Choose Your Meal
    </button>
  );
}

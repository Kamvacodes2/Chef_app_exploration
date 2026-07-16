"use client";

export interface PrimaryCtaProps {
  readonly onClick: () => void;
}

export function PrimaryCta({ onClick }: PrimaryCtaProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 min-h-[44px] min-w-[44px] rounded-full bg-[#F3E3B2] px-8 py-3 font-display text-lg text-[#1A1208] shadow-lg transition-transform transition-colors hover:scale-105 hover:bg-[#FAF3DC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F3E3B2] active:scale-95"
    >
      Choose Your Meal
    </button>
  );
}

import Image from "next/image";

/**
 * Small, unobtrusive brand mark for the hero corner. Renders the "C" spoon
 * icon cropped from the source logo asset alongside a styled "chill chef"
 * text wordmark (Sora 800, -0.06em tracking, 0.9 line-height) — the source
 * PNG's baked-in serif text doesn't match the brand typography spec, so the
 * wordmark is rendered as real text instead of reusing that image region.
 *
 * Defaults to the warm cream text color (#F3E3B2) for legibility on dark
 * backgrounds (olive/espresso/bean) such as the sticky top bar it lives in.
 * Pass `textColor` to override when the mark sits on a light palette.
 *
 * Kept deliberately quiet: this is UI chrome, not a hero focal point
 * (visual hierarchy is Human > Food > Background > Text > CTA).
 */
export interface BrandMarkProps {
  readonly onReset: () => void;
  /**
   * On-background text color, derived from the active palette's
   * `textColor` — keeps the wordmark legible on both light and dark
   * palettes. Falls back to the default dark neutral when omitted.
   */
  readonly textColor?: string;
}

export function BrandMark({ onReset, textColor }: BrandMarkProps) {
  return (
    <button
      type="button"
      onClick={onReset}
      aria-label="chill chef — return to start"
      className="flex cursor-pointer items-center gap-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900/60"
      data-testid="brand-mark"
    >
      <Image
        src="/images/brand/logo-icon.webp"
        alt=""
        width={28}
        height={28}
        className="h-7 w-7 shrink-0"
        aria-hidden="true"
      />
      <span
        className="font-brand text-lg"
        style={{ color: textColor ?? "#F3E3B2" }}
      >
        chill chef
      </span>
    </button>
  );
}

import Image from "next/image";

/**
 * Brand mark for the site header. Renders the full ChefMate lockup (pot +
 * spoon icon alongside the baked-in "chef" / "mate" stacked wordmark)
 * directly from the source logo asset, rather than reconstructing the
 * wordmark as live text — the baked-in typography doesn't match any font
 * available in this project, so re-rendering "chefmate" as a single line of
 * text looked visibly different from the actual logo.
 */
export interface BrandMarkProps {
  readonly onReset: () => void;
}

export function BrandMark({ onReset }: BrandMarkProps) {
  return (
    <button
      type="button"
      onClick={onReset}
      aria-label="ChefMate — return to start"
      className="flex cursor-pointer items-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900/60"
      data-testid="brand-mark"
    >
      <Image
        src="/images/brand/logo.webp"
        alt="ChefMate"
        width={965}
        height={393}
        className="h-11 w-auto sm:h-12"
        priority
      />
    </button>
  );
}

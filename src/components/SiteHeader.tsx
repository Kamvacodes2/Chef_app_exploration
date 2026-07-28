"use client";

import { BrandMark } from "@/features/hero/components/BrandMark";

/** Homepage-level brand header. It belongs before every page section rather
 * than inside one feature, so the first thing in the document is always the
 * ChefMate identity. Reloading the root route also restores any client-side
 * feature state when the wordmark is activated.
 */
export function SiteHeader() {
  const returnToStart = (): void => {
    window.location.assign("/");
  };

  return (
    <header
      className="sticky top-0 z-30 w-full border-b border-[var(--color-oxblood)]/10 bg-[var(--color-warm-cream)]/95 px-4 py-3 backdrop-blur sm:px-6"
      data-testid="site-header"
    >
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4">
        <BrandMark onReset={returnToStart} />
        <nav className="hidden items-center gap-6 text-sm font-semibold text-[var(--color-charcoal)]/80 md:flex" aria-label="Primary">
          <a className="inline-flex min-h-10 items-center transition hover:text-[var(--color-oxblood)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-terracotta)]" href="#how-it-works">
            How it works
          </a>
          <a className="inline-flex min-h-10 items-center transition hover:text-[var(--color-oxblood)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-terracotta)]" href="#meals">
            Meals
          </a>
          <a className="inline-flex min-h-10 items-center transition hover:text-[var(--color-oxblood)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-terracotta)]" href="#plans">
            Plans
          </a>
        </nav>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <a
            href="#order-flow"
            className="inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-lg bg-[var(--color-oxblood)] px-3 text-xs font-bold text-white transition hover:bg-[var(--color-oxblood)]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-terracotta)] sm:px-5 sm:text-sm"
          >
            Book a chef
          </a>
          <a
            href="/login"
            className="inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-lg border border-[var(--color-oxblood)]/35 px-3 text-xs font-bold text-[var(--color-oxblood)] transition hover:border-[var(--color-oxblood)] hover:bg-[var(--color-oxblood)]/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-terracotta)] sm:px-4 sm:text-sm"
          >
            Login
          </a>
        </div>
      </div>
    </header>
  );
}
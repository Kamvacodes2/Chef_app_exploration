"use client";

import { BrandMark } from "@/features/hero/components/BrandMark";

/** Homepage-level brand header. It belongs before every page section rather
 * than inside one feature, so the first thing in the document is always the
 * Chill Chef identity. Reloading the root route also restores any client-side
 * feature state when the wordmark is activated.
 */
export function SiteHeader() {
  const returnToStart = (): void => {
    window.location.assign("/");
  };

  return (
    <header
      className="relative z-30 flex h-[60px] w-full items-center justify-start bg-[#1A1A0B] px-4 sm:px-6"
      data-testid="site-header"
    >
      <BrandMark onReset={returnToStart} />
    </header>
  );
}

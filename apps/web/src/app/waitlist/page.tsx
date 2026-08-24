"use client";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { BrandMark } from "@/features/hero/components/BrandMark";
import { WaitlistPage } from "@/features/waitlist/WaitlistPage";

export default function WaitlistRoute() {
  return (
    <>
      <header className="sticky top-0 z-30 w-full border-b border-[var(--color-oxblood)]/10 bg-[var(--color-warm-cream)]/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-[1200px] items-center">
          <BrandMark onReset={() => window.location.assign("/waitlist")} />
        </div>
      </header>
      <WaitlistPage />
      <SiteFooter />
    </>
  );
}

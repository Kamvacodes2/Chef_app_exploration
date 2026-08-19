"use client";

import { BrandMark } from "@/features/hero/components/BrandMark";
import { ChefApplicationPage } from "@/features/platform/ChefApplicationPage";
import { SiteFooter } from "@/components/layout/SiteFooter";

export default function Page() {
  return (
    <>
      <header
        className="sticky top-0 z-30 w-full border-b border-[var(--color-oxblood)]/10 bg-[var(--color-warm-cream)]/95 px-4 py-3 backdrop-blur sm:px-6"
        data-testid="site-header"
      >
        <div className="mx-auto flex max-w-[1200px] items-center">
          <BrandMark onReset={() => window.location.assign("/chef/apply")} />
        </div>
      </header>
      <ChefApplicationPage />
      <SiteFooter />
    </>
  );
}

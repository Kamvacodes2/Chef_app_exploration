"use client";

import { FeaturedMealsPanel } from "@/features/platform/FeaturedMealsPanel";

export default function Page() {
  return (
    <div>
      <h1 className="text-2xl font-black text-[var(--color-oxblood)]">Featured Meals</h1>
      <p className="mt-1 text-sm text-[var(--color-charcoal)]/60">
        Curate meals that appear on the public homepage.
      </p>
      <div className="mt-6">
        <FeaturedMealsPanel />
      </div>
    </div>
  );
}

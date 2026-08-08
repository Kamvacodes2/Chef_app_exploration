"use client";

import { StatCard } from "@/components/ui/StatCard";

function formatZar(cents: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(cents / 100);
}

export function ChefEarnings() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
        <h2 className="text-2xl font-black text-[var(--color-oxblood)]">Earnings</h2>
        <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">
          Your payout history and earnings summary.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          <StatCard label="Total Earned" value={formatZar(0)} valueColor="text-emerald-700" />
          <StatCard label="Pending Payout" value={formatZar(0)} valueColor="text-amber-600" />
          <StatCard label="Paid Out" value={formatZar(0)} />
        </div>

        <p className="mt-6 rounded-2xl bg-[var(--color-warm-cream)] p-4 text-sm text-[var(--color-charcoal)]/70">
          Earnings data will populate here as you complete bookings.
        </p>
      </section>
    </div>
  );
}

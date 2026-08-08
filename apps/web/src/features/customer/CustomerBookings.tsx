"use client";

import { StatusBadge } from "@/components/ui/StatusBadge";
import Link from "next/link";

export function CustomerBookings() {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
      <h2 className="text-2xl font-black text-[var(--color-oxblood)]">My Bookings</h2>
      <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">Your booking history.</p>
      <p className="mt-6 rounded-2xl bg-[var(--color-warm-cream)] p-4 text-sm text-[var(--color-charcoal)]/70">
        No bookings yet.{" "}
        <Link href="/" className="font-semibold text-[var(--color-oxblood)] hover:underline">
          Book a cook
        </Link>{" "}
        to get started.
      </p>
    </section>
  );
}

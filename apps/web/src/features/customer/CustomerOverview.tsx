"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatCard } from "@/components/ui/StatCard";
import { PolicyAcceptanceModal } from "@/components/ui/PolicyAcceptanceModal";
import { fetchPolicyStatus, type PolicyStatusItem } from "@/features/platform/api/platformClient";

function formatZar(cents: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(cents / 100);
}

export function CustomerOverview() {
  const [policyStatus, setPolicyStatus] = useState<PolicyStatusItem[] | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  useEffect(() => {
    void fetchPolicyStatus()
      .then(setPolicyStatus)
      .catch(() => setPolicyStatus(null));
  }, []);

  const unacceptedCount = policyStatus?.filter((p) => !p.accepted).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="rounded-3xl bg-[var(--color-oxblood)] p-8 text-white">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/70">
          Customer Dashboard
        </p>
        <h2 className="mt-3 text-3xl font-black">Welcome back! 👋</h2>
        <p className="mt-3 max-w-3xl text-white/75">Your next dinner is handled with ChefMate.</p>
      </div>

      {/* Policy acceptance banner */}
      {unacceptedCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border-l-4 border-amber-600 bg-amber-50 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
              Action Required
            </p>
            <p className="font-semibold text-[var(--color-charcoal)]">
              Please review and accept our updated policies.
            </p>
            <p className="text-sm text-[var(--color-charcoal)]/70">
              {unacceptedCount} document{unacceptedCount > 1 ? "s" : ""} pending acceptance.
            </p>
          </div>
          <button
            onClick={() => setShowPolicyModal(true)}
            className="whitespace-nowrap rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
            type="button"
          >
            Review Now
          </button>
        </div>
      ) : null}

      {/* Policy modal */}
      {showPolicyModal && policyStatus ? (
        <PolicyAcceptanceModal
          policies={policyStatus}
          onComplete={() => setShowPolicyModal(false)}
          onClose={() => setShowPolicyModal(false)}
        />
      ) : null}

      {/* Next booking alert */}
      <div className="rounded-xl border-l-4 border-emerald-600 bg-emerald-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
          Next Booking
        </p>
        <p className="font-semibold text-[var(--color-charcoal)]">You have no upcoming bookings.</p>
        <p className="text-sm text-[var(--color-charcoal)]/70">
          Book a chef to get your next meal sorted.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total Bookings" value={0} />
        <StatCard label="Completed" value={0} valueColor="text-emerald-700" />
        <StatCard label="Upcoming" value={0} valueColor="text-[var(--color-oxblood)]" />
        <StatCard label="Total Spent" value={formatZar(0)} />
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="mb-4 font-semibold text-[var(--color-charcoal)]">Quick Actions</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Book a Chef", desc: "Order your next meal", path: "/" },
            {
              label: "My Bookings",
              desc: "View your booking history",
              path: "/customer/bookings",
            },
            {
              label: "Edit Profile",
              desc: "Update your details",
              path: "/customer/profile",
            },
          ].map((a) => (
            <Link
              key={a.label}
              href={a.path}
              className="rounded-xl border border-[var(--color-oxblood)]/10 bg-white p-4 text-center transition-colors hover:border-[var(--color-oxblood)]/50"
            >
              <p className="text-sm font-semibold text-[var(--color-charcoal)]">{a.label}</p>
              <p className="mt-1 text-xs text-[var(--color-charcoal)]/50">{a.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Upcoming bookings placeholder */}
      <section className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
        <h3 className="text-xl font-black text-[var(--color-oxblood)]">Upcoming Bookings</h3>
        <p className="mt-4 rounded-2xl bg-[var(--color-warm-cream)] p-4 text-sm text-[var(--color-charcoal)]/70">
          No upcoming bookings.{" "}
          <Link href="/" className="font-semibold text-[var(--color-oxblood)] hover:underline">
            Book a cook
          </Link>{" "}
          to get started.
        </p>
      </section>
    </div>
  );
}

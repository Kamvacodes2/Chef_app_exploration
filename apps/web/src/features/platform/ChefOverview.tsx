"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { IconSparkles } from "@/components/ui/icons";
import {
  fetchChefBookings,
  fetchChefOffers,
  fetchChefProfile,
  acceptChefOffer,
  declineChefOffer,
  markChefEnRoute,
  completeChefBooking,
  type ChefProfile,
  type ChefOffer,
  type ChefBooking,
} from "@/features/platform/api/platformClient";

function formatZar(cents: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(cents / 100);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(value));
}

export function ChefOverview() {
  const [profile, setProfile] = useState<ChefProfile | null>(null);
  const [offers, setOffers] = useState<ChefOffer[]>([]);
  const [bookings, setBookings] = useState<ChefBooking[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setBusy("load");
    setError(null);
    try {
      const [p, o, b] = await Promise.all([
        fetchChefProfile(),
        fetchChefOffers(),
        fetchChefBookings(),
      ]);
      setProfile(p);
      setOffers(o);
      setBookings(b);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Load failed");
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const run = async (name: string, action: () => Promise<void>) => {
    setBusy(name);
    setNotice(null);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const accept = (offer: ChefOffer) => {
    void run(`accept-${offer.id}`, async () => {
      await acceptChefOffer(offer.id);
      setNotice(`Job ${offer.booking.reference} accepted.`);
      await load();
    });
  };

  const decline = (offer: ChefOffer) => {
    void run(`decline-${offer.id}`, async () => {
      await declineChefOffer(offer.id);
      setNotice(`Job ${offer.booking.reference} declined.`);
      await load();
    });
  };

  const enRoute = (booking: ChefBooking) => {
    void run(`en-route-${booking.id}`, async () => {
      await markChefEnRoute(booking.id, null);
      setNotice(`Marked ${booking.reference} as en route.`);
      await load();
    });
  };

  const complete = (booking: ChefBooking) => {
    void run(`complete-${booking.id}`, async () => {
      const result = await completeChefBooking(booking.id, null);
      setNotice(`Booking complete. You earned ${formatZar(result.earning.chefPayoutCents)}.`);
      await load();
    });
  };

  const displayName = profile?.displayName ?? "Chef";
  const firstName = displayName.split(" ")[0] ?? displayName;

  if (busy === "load") {
    return (
      <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-[var(--color-charcoal)]/75">
        Loading chef portal...
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="rounded-3xl bg-[var(--color-oxblood)] p-8 text-white">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/70">Chef Portal</p>
        <h2 className="mt-3 text-3xl font-black">Good morning, {firstName}! 👋</h2>
        <p className="mt-3 max-w-3xl text-white/75">
          Here&apos;s what&apos;s happening with your bookings.
        </p>
      </div>

      {notice ? (
        <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-900">{error}</p>
      ) : null}

      {/* Incoming offers alert */}
      {offers.length > 0 ? (
        <Link
          href="/chef/portal/bookings"
          className="block rounded-xl border-l-4 border-amber-600 bg-amber-50 px-5 py-4 transition-colors hover:bg-amber-100/50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-600/20">
              <IconSparkles width={20} height={20} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">
                You have {offers.length} incoming job
                {offers.length > 1 ? "s" : ""} awaiting your response
              </p>
              <p className="mt-0.5 text-xs text-amber-600/70">
                Click to view and accept or decline
              </p>
            </div>
            <span className="text-lg font-bold text-amber-800">&rarr;</span>
          </div>
        </Link>
      ) : null}

      {/* Profile active indicator */}
      {profile?.isAvailable ? (
        <div className="rounded-xl border-l-4 border-emerald-600 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-800">
          ✓ Your profile is active and visible to customers.
        </div>
      ) : (
        <div className="rounded-xl border-l-4 border-amber-600 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-800">
          Your profile is not available for new bookings. Update your availability in Profile.
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Upcoming"
          value={
            bookings.filter((b) => ["CONFIRMED", "CHEF_MATCHED", "EN_ROUTE"].includes(b.status))
              .length
          }
        />
        <StatCard
          label="Completed"
          value={bookings.filter((b) => b.status === "COMPLETED").length}
        />
        <StatCard
          label="Pending Offers"
          value={offers.length}
          valueColor={offers.length > 0 ? "text-amber-600" : undefined}
        />
        <StatCard
          label="Status"
          value={profile?.isAvailable ? "Available" : "Offline"}
          valueColor={profile?.isAvailable ? "text-emerald-700" : "text-amber-600"}
        />
      </div>

      {/* Incoming offers */}
      <section className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
        <h3 className="text-xl font-black text-[var(--color-oxblood)]">Incoming Session Offers</h3>
        {offers.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-[var(--color-warm-cream)] p-4 text-sm text-[var(--color-charcoal)]/70">
            No incoming offers right now.
          </p>
        ) : (
          offers.map((offer) => (
            <article
              key={offer.id}
              className="mt-4 rounded-2xl border border-[var(--color-oxblood)]/10 p-5"
            >
              <h4 className="text-lg font-black">{offer.booking.mainName}</h4>
              <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">
                {offer.booking.reference} · {formatDate(offer.booking.scheduledDate)} at{" "}
                {offer.booking.timeSlot}
                {offer.booking.serviceArea ? ` · ${offer.booking.serviceArea}` : ""}
              </p>
              <p className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-900">
                You receive {formatZar(offer.chefPayoutCents)}
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  className="min-h-10 rounded-xl bg-[var(--color-oxblood)] px-4 text-sm font-bold text-white disabled:opacity-50"
                  disabled={busy === `accept-${offer.id}`}
                  onClick={() => accept(offer)}
                  type="button"
                >
                  Accept
                </button>
                <button
                  className="min-h-10 rounded-xl border border-[var(--color-oxblood)]/20 px-4 text-sm font-bold text-[var(--color-oxblood)] disabled:opacity-50"
                  disabled={busy === `decline-${offer.id}`}
                  onClick={() => decline(offer)}
                  type="button"
                >
                  Decline
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      {/* Assigned bookings */}
      <section className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
        <h3 className="text-xl font-black text-[var(--color-oxblood)]">Assigned Bookings</h3>
        {bookings.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-[var(--color-warm-cream)] p-4 text-sm text-[var(--color-charcoal)]/70">
            No active assigned bookings yet.
          </p>
        ) : (
          bookings.map((booking) => (
            <article
              key={booking.id}
              className="mt-4 rounded-2xl border border-[var(--color-oxblood)]/10 p-5"
            >
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-charcoal)]/50">
                {booking.reference} · <StatusBadge status={booking.status} />
              </p>
              <h4 className="mt-2 text-lg font-black">{booking.mainName}</h4>
              <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">
                {formatDate(booking.scheduledDate)} at {booking.timeSlot} ·{" "}
                {booking.serviceArea ?? "Area pending"}
              </p>
              {booking.chefPayoutCents != null ? (
                <p className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-900">
                  You receive {formatZar(booking.chefPayoutCents)}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="min-h-10 rounded-xl border border-[var(--color-oxblood)]/20 px-4 text-sm font-bold text-[var(--color-oxblood)] disabled:opacity-50"
                  disabled={booking.status !== "CHEF_MATCHED" || busy === `en-route-${booking.id}`}
                  onClick={() => enRoute(booking)}
                  type="button"
                >
                  Mark En Route
                </button>
                <button
                  className="min-h-10 rounded-xl bg-[var(--color-oxblood)] px-4 text-sm font-bold text-white disabled:opacity-50"
                  disabled={
                    !["CHEF_MATCHED", "EN_ROUTE"].includes(booking.status) ||
                    busy === `complete-${booking.id}`
                  }
                  onClick={() => complete(booking)}
                  type="button"
                >
                  Complete Booking
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            label: "Update Availability",
            desc: "Set when you're free",
            path: "/chef/portal/profile",
          },
          { label: "View Earnings", desc: "Check your payouts", path: "/chef/portal/earnings" },
          { label: "Edit Profile", desc: "Update your bio & skills", path: "/chef/portal/profile" },
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
  );
}

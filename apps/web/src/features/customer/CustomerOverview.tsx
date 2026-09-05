"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { StatCard } from "@/components/ui/StatCard";
import { PolicyAcceptanceModal } from "@/components/ui/PolicyAcceptanceModal";
import { useAuth } from "@/features/auth/AuthContext";
import { fetchPolicyStatus, type PolicyStatusItem } from "@/features/platform/api/platformClient";
import {
  fetchCustomerBookings,
  fetchCustomerSubscription,
  type CustomerBooking,
  type CustomerBookingStatus,
  type CustomerSubscription,
} from "@/features/customer/api/customerBookingsClient";

const OPEN_STATUSES: readonly CustomerBookingStatus[] = [
  "REQUESTED",
  "NEEDS_REVIEW",
  "CONFIRMED",
  "AWAITING_CHEF",
  "CHEF_MATCHED",
  "EN_ROUTE",
];

const STATUS_LABEL: Record<CustomerBookingStatus, string> = {
  REQUESTED: "Order received",
  NEEDS_REVIEW: "Awaiting review",
  CONFIRMED: "Confirmed",
  AWAITING_CHEF: "Finding your chef",
  CHEF_MATCHED: "Chef matched",
  EN_ROUTE: "On its way",
  CANCELLED: "Cancelled",
  COMPLETED: "Delivered",
};

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return new Intl.DateTimeFormat("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(new Date(year, month - 1, day));
}

function mealList(booking: CustomerBooking): string {
  // Prefer every dish ordered: main(s) plus any sides/dessert added.
  return booking.meals.length > 0
    ? booking.meals.map((meal) => meal.name).join(", ")
    : booking.mainMeal.name;
}

function planDisplayName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatRand(cents: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function CustomerOverview() {
  const { logout } = useAuth();
  const [policyStatus, setPolicyStatus] = useState<PolicyStatusItem[] | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [bookings, setBookings] = useState<CustomerBooking[] | null>(null);
  const [subscription, setSubscription] = useState<CustomerSubscription | null>(null);
  const dashboardHeadingRef = useRef<HTMLHeadingElement>(null);

  const handleLogout = (): void => {
    void logout().finally(() => {
      window.location.assign("/");
    });
  };

  useEffect(() => {
    void fetchPolicyStatus()
      .then(setPolicyStatus)
      .catch(() => setPolicyStatus(null));
    void fetchCustomerBookings()
      .then(setBookings)
      .catch(() => setBookings([]));
    void fetchCustomerSubscription()
      .then(setSubscription)
      .catch(() => setSubscription(null));
  }, []);

  const requiredPending = policyStatus?.filter((p) => p.required && !p.accepted) ?? [];
  const optionalPending = policyStatus?.filter((p) => !p.required && !p.accepted) ?? [];
  const unacceptedCount = requiredPending.length + optionalPending.length;

  const upcoming = (bookings ?? []).filter((booking) => OPEN_STATUSES.includes(booking.status));
  const completed = (bookings ?? []).filter((booking) => booking.status === "COMPLETED");
  const nextBooking =
    upcoming.length > 0
      ? ([...upcoming].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0] ?? null)
      : null;

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="rounded-3xl bg-[var(--color-oxblood)] p-8 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/70">
              Customer Dashboard
            </p>
            <h2 ref={dashboardHeadingRef} className="mt-3 text-3xl font-black" tabIndex={-1}>
              Welcome back! 👋
            </h2>
            <p className="mt-3 max-w-3xl text-white/75">
              Your next dinner is handled with ChefMate.
            </p>
          </div>
          <button
            className="inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-lg border border-white/35 px-4 text-sm font-bold text-white transition hover:border-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            onClick={handleLogout}
            type="button"
          >
            Log out
          </button>
        </div>
      </div>

      {/* Policy acceptance banner */}
      {unacceptedCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border-l-4 border-amber-600 bg-amber-50 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
              Policy Updates Available
            </p>
            <p className="font-semibold text-[var(--color-charcoal)]">
              Review our current policies when you are ready.
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

      {/* Required policy gate: the customer must accept current required terms to continue. */}
      {requiredPending.length > 0 ? (
        <PolicyAcceptanceModal
          mode="required"
          policies={requiredPending}
          onComplete={async () => {
            const nextStatus = await fetchPolicyStatus();
            setPolicyStatus(nextStatus);
            requestAnimationFrame(() => dashboardHeadingRef.current?.focus());
          }}
        />
      ) : null}

      {/* Optional policy modal */}
      {showPolicyModal && policyStatus && optionalPending.length > 0 ? (
        <PolicyAcceptanceModal
          mode="optional"
          policies={optionalPending}
          onComplete={async () => {
            const nextStatus = await fetchPolicyStatus();
            setPolicyStatus(nextStatus);
            setShowPolicyModal(false);
            requestAnimationFrame(() => dashboardHeadingRef.current?.focus());
          }}
          onClose={() => setShowPolicyModal(false)}
        />
      ) : null}

      {/* Next booking alert */}
      <div className="rounded-xl border-l-4 border-emerald-600 bg-emerald-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
          Next Booking
        </p>
        {nextBooking ? (
          <>
            <p className="font-semibold text-[var(--color-charcoal)]">
              {mealList(nextBooking)} · {formatDate(nextBooking.scheduledDate)}
            </p>
            <p className="text-sm text-[var(--color-charcoal)]/70">
              {nextBooking.timeSlot} · {STATUS_LABEL[nextBooking.status]} · Ref{" "}
              {nextBooking.reference}
            </p>
          </>
        ) : (
          <>
            <p className="font-semibold text-[var(--color-charcoal)]">
              You have no upcoming bookings.
            </p>
            <p className="text-sm text-[var(--color-charcoal)]/70">
              Book a chef to get your next meal sorted.
            </p>
          </>
        )}
      </div>

      {/* Recurring package summary: name, sessions used and sessions left. */}
      {subscription ? (
        <section
          aria-label="Your package"
          className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-terracotta)]">
                Your package
              </p>
              <h3 className="mt-1 text-xl font-black text-[var(--color-oxblood)]">
                {planDisplayName(subscription.planName)}
              </h3>
              {subscription.planPriceCents > 0 ? (
                <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">
                  {`${formatRand(subscription.planPriceCents)} / month · ${subscription.totalSessions} dinner${subscription.totalSessions === 1 ? "" : "s"} included`}
                </p>
              ) : null}
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-[var(--color-oxblood)]">
                {subscription.sessionsRemaining}
              </p>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-charcoal)]/60">
                dinners left
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {Array.from({ length: subscription.totalSessions }, (_, index) => (
              <span
                key={index}
                aria-hidden="true"
                className={`h-2.5 w-2.5 rounded-full ${
                  index < subscription.sessionsUsed
                    ? "bg-[var(--color-terracotta)]"
                    : "border border-[var(--color-oxblood)]/30 bg-white"
                }`}
              />
            ))}
            <span className="ml-2 text-sm text-[var(--color-charcoal)]/70">
              {subscription.sessionsUsed} of {subscription.totalSessions} dinner
              {subscription.totalSessions === 1 ? "" : "s"} used
              {subscription.sessionsRemaining > 0
                ? ` · ${subscription.sessionsRemaining} dinner${subscription.sessionsRemaining === 1 ? "" : "s"} left this month`
                : subscription.sessionsUsed >= subscription.totalSessions
                  ? " · your full package has been used"
                  : " · all remaining dinners this month are scheduled"}
            </span>
          </div>
        </section>
      ) : null}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard label="Total Bookings" value={bookings?.length ?? 0} />
        <StatCard
          label="Upcoming"
          value={upcoming.length}
          valueColor="text-[var(--color-oxblood)]"
        />
        <StatCard label="Completed" value={completed.length} valueColor="text-emerald-700" />
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

      {/* Upcoming bookings */}
      <section className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
        <h3 className="text-xl font-black text-[var(--color-oxblood)]">Upcoming Bookings</h3>
        {upcoming.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {upcoming.map((booking) => (
              <li
                key={booking.id}
                className="rounded-2xl border border-[var(--color-oxblood)]/10 bg-[var(--color-warm-cream)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--color-charcoal)]">
                      {mealList(booking)}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">
                      {formatDate(booking.scheduledDate)} · {booking.timeSlot}
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--color-bone)] px-3 py-1 text-xs font-bold text-[var(--color-oxblood)]">
                    {STATUS_LABEL[booking.status]}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[var(--color-charcoal)]/50">
                  Ref {booking.reference}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-2xl bg-[var(--color-warm-cream)] p-4 text-sm text-[var(--color-charcoal)]/70">
            No upcoming bookings.{" "}
            <Link href="/" className="font-semibold text-[var(--color-oxblood)] hover:underline">
              Book a cook
            </Link>{" "}
            to get started.
          </p>
        )}
      </section>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchCustomerBookings,
  type CustomerBooking,
  type CustomerBookingStatus,
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
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function mealList(booking: CustomerBooking): string {
  return booking.meals.length > 0
    ? booking.meals.map((meal) => meal.name).join(", ")
    : booking.mainMeal.name;
}

function BookingCard({ booking }: { booking: CustomerBooking }) {
  const isUpcoming = OPEN_STATUSES.includes(booking.status);
  return (
    <li className="rounded-2xl border border-[var(--color-oxblood)]/10 bg-white p-5 shadow-[0_10px_30px_rgba(70,33,24,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-[var(--color-charcoal)]">{mealList(booking)}</p>
          <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">
            {formatDate(booking.scheduledDate)} · {booking.timeSlot}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            isUpcoming
              ? "bg-emerald-100 text-emerald-800"
              : booking.status === "CANCELLED"
                ? "bg-rose-100 text-rose-700"
                : "bg-[var(--color-bone)] text-[var(--color-oxblood)]"
          }`}
        >
          {STATUS_LABEL[booking.status]}
        </span>
      </div>
      <p className="mt-2 text-xs text-[var(--color-charcoal)]/50">Ref {booking.reference}</p>
    </li>
  );
}

export function CustomerBookings() {
  const [bookings, setBookings] = useState<CustomerBooking[] | null>(null);

  useEffect(() => {
    void fetchCustomerBookings()
      .then(setBookings)
      .catch(() => setBookings([]));
  }, []);

  const upcoming = (bookings ?? []).filter((booking) => OPEN_STATUSES.includes(booking.status));
  const history = (bookings ?? []).filter((booking) => !OPEN_STATUSES.includes(booking.status));

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
        <h2 className="text-2xl font-black text-[var(--color-oxblood)]">My Bookings</h2>
        <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">
          The meals you have coming up.
        </p>

        <h3 className="mt-6 font-semibold text-[var(--color-charcoal)]">Upcoming</h3>
        {upcoming.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {upcoming.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-2xl bg-[var(--color-warm-cream)] p-4 text-sm text-[var(--color-charcoal)]/70">
            No upcoming bookings.{" "}
            <Link href="/" className="font-semibold text-[var(--color-oxblood)] hover:underline">
              Book a cook
            </Link>{" "}
            to get started.
          </p>
        )}

        <h3 className="mt-8 font-semibold text-[var(--color-charcoal)]">Past</h3>
        {history.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {history.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-2xl bg-[var(--color-warm-cream)] p-4 text-sm text-[var(--color-charcoal)]/70">
            No past bookings yet.
          </p>
        )}
      </section>
    </div>
  );
}

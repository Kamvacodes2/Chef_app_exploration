"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchCustomerBookings,
  rescheduleCustomerBooking,
  type CustomerBooking,
  type CustomerBookingStatus,
} from "@/features/customer/api/customerBookingsClient";
import {
  fetchAvailabilityForDate,
  type AvailabilitySlot,
} from "@/features/order-flow/api/availabilityClient";

const OPEN_STATUSES: readonly CustomerBookingStatus[] = [
  "REQUESTED",
  "NEEDS_REVIEW",
  "CONFIRMED",
  "AWAITING_CHEF",
  "CHEF_MATCHED",
  "EN_ROUTE",
];

// Self-service reschedule is allowed up until a chef is dispatched: once the
// chef is en route the session can no longer move without ops involvement.
const RESCHEDULABLE_STATUSES: readonly CustomerBookingStatus[] = [
  "REQUESTED",
  "NEEDS_REVIEW",
  "CONFIRMED",
  "AWAITING_CHEF",
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

function RescheduleModal({
  booking,
  busy,
  onCancel,
  onConfirm,
}: {
  readonly booking: CustomerBooking;
  readonly busy: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: (scheduledDate: string, timeSlot: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(booking.scheduledDate >= today ? booking.scheduledDate : today);
  const [slots, setSlots] = useState<readonly AvailabilitySlot[] | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [timeSlot, setTimeSlot] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    setSlotsError(null);
    setSlots(null);
    setTimeSlot("");
    fetchAvailabilityForDate(date)
      .then((next) => {
        if (!cancelled) setSlots(next.filter((slot) => slot.available));
      })
      .catch(() => {
        if (!cancelled) setSlotsError("Could not load available times. Please try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  const canConfirm =
    timeSlot !== "" && (date !== booking.scheduledDate || timeSlot !== booking.timeSlot);

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
      role="dialog"
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.2)]">
        <h3 className="text-lg font-black text-[var(--color-oxblood)]">
          Reschedule {booking.reference}
        </h3>
        <p className="mt-2 text-sm text-[var(--color-charcoal)]/70">
          Currently scheduled for {formatDate(booking.scheduledDate)} at {booking.timeSlot}.
        </p>

        <label
          className="mt-4 grid gap-2 text-sm font-bold text-[var(--color-charcoal)]"
          htmlFor="reschedule-date"
        >
          New date
          <input
            className="min-h-11 rounded-xl border border-[var(--color-oxblood)]/20 px-3 text-sm font-normal"
            id="reschedule-date"
            min={today}
            onChange={(event) => setDate(event.target.value)}
            required
            type="date"
            value={date}
          />
        </label>

        <p className="mt-4 text-sm font-bold text-[var(--color-charcoal)]">New time</p>
        {slotsError ? (
          <p className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-900">{slotsError}</p>
        ) : slots === null ? (
          <p className="mt-2 text-sm text-[var(--color-charcoal)]/60">Loading times...</p>
        ) : slots.length === 0 ? (
          <p className="mt-2 rounded-xl bg-[var(--color-warm-cream)] p-3 text-sm text-[var(--color-charcoal)]/70">
            No open times on this date — bookings need at least 24 hours' notice.
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {slots.map((slot) => (
              <button
                className={`min-h-10 rounded-xl border px-3 text-sm font-bold transition ${
                  timeSlot === slot.time
                    ? "border-[var(--color-oxblood)] bg-[var(--color-oxblood)] text-white"
                    : "border-[var(--color-oxblood)]/20 text-[var(--color-oxblood)] hover:bg-[var(--color-oxblood)]/5"
                }`}
                key={slot.time}
                onClick={() => setTimeSlot(slot.time)}
                type="button"
              >
                {slot.label}
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            className="min-h-10 rounded-xl border border-[var(--color-oxblood)]/20 px-4 text-sm font-bold text-[var(--color-oxblood)] disabled:opacity-50"
            disabled={busy}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="min-h-10 rounded-xl bg-[var(--color-oxblood)] px-4 text-sm font-bold text-white disabled:opacity-50"
            disabled={busy || !canConfirm}
            onClick={() => onConfirm(date, timeSlot)}
            type="button"
          >
            {busy ? "Rescheduling..." : "Confirm new time"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BookingCard({
  booking,
  canReschedule,
  onReschedule,
}: {
  readonly booking: CustomerBooking;
  readonly canReschedule: boolean;
  readonly onReschedule: (booking: CustomerBooking) => void;
}) {
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
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[var(--color-charcoal)]/50">Ref {booking.reference}</p>
        {canReschedule ? (
          <button
            className="min-h-9 rounded-xl border border-[var(--color-oxblood)]/25 px-3 text-xs font-bold text-[var(--color-oxblood)] transition hover:bg-[var(--color-oxblood)]/5"
            onClick={() => onReschedule(booking)}
            type="button"
          >
            Reschedule
          </button>
        ) : null}
      </div>
    </li>
  );
}

export function CustomerBookings() {
  const [bookings, setBookings] = useState<CustomerBooking[] | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<CustomerBooking | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    void fetchCustomerBookings()
      .then(setBookings)
      .catch(() => setBookings([]));
  };

  useEffect(() => {
    load();
  }, []);

  const confirmReschedule = (scheduledDate: string, timeSlot: string) => {
    if (!rescheduleTarget) return;
    setBusy(true);
    setError(null);
    void rescheduleCustomerBooking(rescheduleTarget.id, { scheduledDate, timeSlot })
      .then((updated) => {
        setBookings((prev) =>
          (prev ?? []).map((booking) => (booking.id === updated.id ? updated : booking)),
        );
        setRescheduleTarget(null);
        setNotice(
          `Booking ${updated.reference} moved to ${formatDate(updated.scheduledDate)} at ${updated.timeSlot}.`,
        );
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "Reschedule failed. Please try again.");
      })
      .finally(() => setBusy(false));
  };

  const upcoming = (bookings ?? []).filter((booking) => OPEN_STATUSES.includes(booking.status));
  const history = (bookings ?? []).filter((booking) => !OPEN_STATUSES.includes(booking.status));

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
        <h2 className="text-2xl font-black text-[var(--color-oxblood)]">My Bookings</h2>
        <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">
          The meals you have coming up.
        </p>

        {notice ? (
          <p
            className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900"
            role="status"
          >
            {notice}
          </p>
        ) : null}
        {error ? (
          <p
            className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-900"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <h3 className="mt-6 font-semibold text-[var(--color-charcoal)]">Upcoming</h3>
        {upcoming.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {upcoming.map((booking) => (
              <BookingCard
                booking={booking}
                canReschedule={RESCHEDULABLE_STATUSES.includes(booking.status)}
                key={booking.id}
                onReschedule={setRescheduleTarget}
              />
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
              <BookingCard
                booking={booking}
                canReschedule={false}
                key={booking.id}
                onReschedule={setRescheduleTarget}
              />
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-2xl bg-[var(--color-warm-cream)] p-4 text-sm text-[var(--color-charcoal)]/70">
            No past bookings yet.
          </p>
        )}
      </section>

      {rescheduleTarget ? (
        <RescheduleModal
          booking={rescheduleTarget}
          busy={busy}
          onCancel={() => setRescheduleTarget(null)}
          onConfirm={confirmReschedule}
        />
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  fetchChefBookings,
  markChefEnRoute,
  completeChefBooking,
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

export function ChefBookingsPage() {
  const [bookings, setBookings] = useState<ChefBooking[]>([]);
  const [tab, setTab] = useState<"active" | "past">("active");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setBusy("load");
    setError(null);
    try {
      const data = await fetchChefBookings();
      setBookings(data);
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

  const activeBookings = bookings.filter((b) => !["COMPLETED", "CANCELLED"].includes(b.status));
  const pastBookings = bookings.filter((b) => ["COMPLETED", "CANCELLED"].includes(b.status));

  const currentList = tab === "active" ? activeBookings : pastBookings;

  if (busy === "load") {
    return (
      <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-[var(--color-charcoal)]/75">
        Loading bookings...
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {notice ? (
        <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-900">{error}</p>
      ) : null}

      <section className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black text-[var(--color-oxblood)]">My Bookings</h2>
            <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">
              Manage your upcoming visits and view past booking history.
            </p>
          </div>

          <div className="flex rounded-2xl bg-[var(--color-warm-cream)] p-1">
            <button
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                tab === "active"
                  ? "bg-white text-[var(--color-oxblood)] shadow-sm"
                  : "text-[var(--color-charcoal)]/70 hover:text-[var(--color-charcoal)]"
              }`}
              onClick={() => setTab("active")}
              type="button"
            >
              Active & Upcoming ({activeBookings.length})
            </button>
            <button
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                tab === "past"
                  ? "bg-white text-[var(--color-oxblood)] shadow-sm"
                  : "text-[var(--color-charcoal)]/70 hover:text-[var(--color-charcoal)]"
              }`}
              onClick={() => setTab("past")}
              type="button"
            >
              Past Bookings ({pastBookings.length})
            </button>
          </div>
        </div>

        {currentList.length === 0 ? (
          <p className="mt-6 rounded-2xl bg-[var(--color-warm-cream)] p-4 text-sm text-[var(--color-charcoal)]/70">
            {tab === "active"
              ? "No active bookings right now. When customers book you, they'll appear here."
              : "No past bookings yet. Completed visits will be archived here."}
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {currentList.map((booking) => (
              <article
                key={booking.id}
                className="rounded-2xl border border-[var(--color-oxblood)]/10 p-5 transition hover:border-[var(--color-oxblood)]/20"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-charcoal)]/50">
                        {booking.reference}
                      </span>
                      <StatusBadge status={booking.status} />
                    </div>
                    <h3 className="mt-2 text-lg font-black">{booking.mainName}</h3>
                    <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">
                      {formatDate(booking.scheduledDate)} at {booking.timeSlot} ·{" "}
                      {booking.serviceArea ?? "Area pending"}
                    </p>
                    {booking.chefPayoutCents != null ? (
                      <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-900">
                        <span>💰</span>
                        {booking.status === "COMPLETED" ? "Earned " : "You receive "}
                        {formatZar(booking.chefPayoutCents)}
                      </p>
                    ) : null}
                    {booking.street ? (
                      <p className="mt-2 text-sm text-[var(--color-charcoal)]/70">
                        📍 {booking.estate ? `${booking.estate}, ` : ""}
                        {booking.street}
                      </p>
                    ) : null}
                  </div>

                  {tab === "active" ? (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        className="min-h-10 rounded-xl border border-[var(--color-oxblood)]/20 px-4 text-sm font-bold text-[var(--color-oxblood)] disabled:opacity-50"
                        disabled={
                          booking.status !== "CHEF_MATCHED" || busy === `en-route-${booking.id}`
                        }
                        onClick={() => enRoute(booking)}
                        type="button"
                      >
                        En Route
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
                        Complete
                      </button>
                    </div>
                  ) : (
                    <div className="text-right text-xs font-semibold text-[var(--color-charcoal)]/60">
                      {booking.status === "COMPLETED" ? (
                        <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-800 font-bold">
                          ✓ Visit Completed
                        </span>
                      ) : (
                        <span className="rounded-lg bg-zinc-100 px-2.5 py-1 text-zinc-600">
                          Cancelled
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

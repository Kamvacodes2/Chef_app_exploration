"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { getChefmateApiUrl } from "@/lib/env";
import { getCurrentUser } from "@/features/auth/api/authClient";

// ── Types ──────────────────────────────────────────────────────────────────

interface BookingDetail {
  readonly id: string;
  readonly reference: string;
  readonly status: string;
  readonly type: string;
  readonly mainMeal: { readonly slug: string; readonly name: string };
  readonly scheduledDate: string;
  readonly timeSlot: string;
  readonly pricing: {
    readonly subtotalCents: number;
    readonly discountCents: number;
    readonly totalCents: number;
  };
}

// ── Payment state helpers ──────────────────────────────────────────────────

/**
 * Booking statuses that mean payment is still outstanding.
 * REQUESTED / NEEDS_REVIEW = booking created but payment not verified.
 */
const PAYMENT_PENDING_STATUSES = new Set(["REQUESTED", "NEEDS_REVIEW"]);

/**
 * Booking statuses that mean payment has been verified.
 * AWAITING_CHEF and beyond = payment confirmed, chef matching in progress.
 */
const PAYMENT_CONFIRMED_STATUSES = new Set([
  "CONFIRMED",
  "AWAITING_CHEF",
  "CHEF_MATCHED",
  "EN_ROUTE",
  "COMPLETED",
]);

function isPaymentPending(status: string): boolean {
  return PAYMENT_PENDING_STATUSES.has(status);
}

// ── Formatters ─────────────────────────────────────────────────────────────

function formatZar(cents: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(cents / 100);
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

function formatTime(slot: string): string {
  const [start, end] = slot.split("-");
  if (!start || !end) return slot;
  return `${start.trim()} – ${end.trim()}`;
}

const WHATSAPP_NUMBER = "+27710000000";
const CONTACT_MESSAGE = encodeURIComponent("Hi ChefMate, I have a question about my booking.");

// ── Tracking helpers ───────────────────────────────────────────────────────

function fireUmamiEvent(event: string, data: Record<string, unknown>) {
  const umami = (window as unknown as Record<string, unknown>).umami as
    { track?: (event: string, data: Record<string, unknown>) => void } | undefined;
  if (typeof umami?.track === "function") {
    umami.track(event, data);
  }
}

function fireGoogleAdsConversion(booking: BookingDetail) {
  const gtag = (window as unknown as Record<string, unknown>).gtag as
    ((...args: unknown[]) => void) | undefined;
  if (typeof gtag !== "function") return;

  // Only fire Google Ads conversion when payment is actually verified.
  // Replace AW-XXXXXXXXX/XXXXXXXX with the real ID/label from Google Ads.
  gtag("event", "conversion", {
    send_to: "AW-XXXXXXXXX/XXXXXXXX",
    value: booking.pricing.totalCents / 100,
    currency: "ZAR",
    transaction_id: booking.reference,
  });
}

// ── Page Content ───────────────────────────────────────────────────────────

function ConfirmedPageContent() {
  const searchParams = useSearchParams();
  const bookingRef = searchParams.get("ref") ?? "";

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBooking = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const res = await fetch(`${getChefmateApiUrl()}/api/v1/account/booking-requests`, {
        credentials: "include",
      });
      if (!res.ok) return;

      const data = await res.json();
      const bookings: BookingDetail[] = data.data?.items ?? [];

      if (bookingRef) {
        const match = bookings.find((b) => b.reference === bookingRef);
        if (match) {
          setBooking(match);
          return;
        }
      }

      // Fall back to most recent booking
      if (bookings.length > 0) {
        setBooking(bookings[0]!);
      }
    } catch {
      // User may not be authenticated
    } finally {
      setLoading(false);
    }
  }, [bookingRef]);

  useEffect(() => {
    void fetchBooking();
  }, [fetchBooking]);

  // Fire tracking events once booking is loaded.
  // Google Ads conversion ONLY fires when payment is confirmed.
  // Umami fires booking_created for pending, purchase_success for confirmed.
  useEffect(() => {
    if (!booking) return;

    if (isPaymentPending(booking.status)) {
      fireUmamiEvent("booking_created", {
        reference: booking.reference,
        value: booking.pricing.totalCents / 100,
      });
    } else {
      fireGoogleAdsConversion(booking);
      fireUmamiEvent("purchase_success", {
        reference: booking.reference,
        value: booking.pricing.totalCents / 100,
      });
    }
  }, [booking]);

  // ── Loading ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-[var(--color-charcoal)]/50">Loading your booking...</p>
      </div>
    );
  }

  // ── No booking found (not authenticated or no matching ref) ────────
  if (!booking) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <h1 className="font-display text-3xl text-[var(--color-oxblood)] sm:text-4xl">
          Dinner is handled. 🤎
        </h1>
        <p className="max-w-md text-[var(--color-charcoal)]/70">
          We couldn&apos;t find a booking to show here. If you just completed an order, check your
          email for the confirmation details.
        </p>
        <Link
          href="/"
          className="rounded-2xl bg-[var(--color-oxblood)] px-8 py-3 font-display text-base text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          Browse meals
        </Link>
      </div>
    );
  }

  const paymentPending = isPaymentPending(booking.status);

  return (
    <div className="flex min-h-[60vh] flex-col items-center gap-8 px-4 py-12 text-center">
      {/* ── Logo + heading ──────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center justify-center rounded-3xl bg-[var(--color-oxblood)] px-6 py-4">
          <Image
            src="/images/brand/logo.webp"
            alt="ChefMate"
            width={965}
            height={393}
            className="h-10 w-auto brightness-0 invert"
          />
        </div>
        <h1 className="font-display text-3xl text-[var(--color-oxblood)] sm:text-4xl">
          {paymentPending ? "Your Chefmate booking has been received 🤎" : "Dinner is handled. 🤎"}
        </h1>
        <p className="max-w-md text-lg text-[var(--color-charcoal)]/70">
          {paymentPending
            ? "Complete your bank transfer to secure your booking."
            : "Your payment has been received and your Chefmate booking is confirmed."}
        </p>
      </div>

      {/* ── Booking details card ────────────────────────────────────── */}
      <div className="w-full max-w-md rounded-3xl border border-[var(--color-oxblood)]/10 bg-white p-6 text-left shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
        <h2 className="mb-4 font-display text-xl text-[var(--color-oxblood)]">Booking details</h2>
        <dl className="divide-y divide-[var(--color-oxblood)]/5">
          <DetailRow label="Booking">{booking.reference}</DetailRow>
          <DetailRow label="Meal">{booking.mainMeal.name}</DetailRow>
          <DetailRow label="Date">{formatDate(booking.scheduledDate)}</DetailRow>
          <DetailRow label="Time">{formatTime(booking.timeSlot)}</DetailRow>
          <DetailRow label="Amount">{formatZar(booking.pricing.totalCents)}</DetailRow>
          <DetailRow label="Status">
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                paymentPending ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
              }`}
            >
              {paymentPending ? "AWAITING PAYMENT" : booking.status.replace(/_/g, " ")}
            </span>
          </DetailRow>
        </dl>
      </div>

      {/* ── Bank transfer instructions (pending only) ───────────────── */}
      {paymentPending ? (
        <div className="w-full max-w-md rounded-3xl border-2 border-amber-200 bg-amber-50 p-6 text-left">
          <h2 className="mb-3 font-display text-lg text-amber-800">Bank transfer required</h2>
          <p className="mb-4 text-sm leading-relaxed text-amber-700">
            Your booking is not yet confirmed. Please complete your bank transfer using the details
            in your confirmation email, using the reference above. Once payment is received,
            we&apos;ll confirm your cook and session.
          </p>
          <p className="text-sm font-semibold text-amber-800">Reference: {booking.reference}</p>
        </div>
      ) : (
        /* ── What happens next (confirmed only) ──────────────────── */
        <div className="w-full max-w-md rounded-3xl bg-[var(--color-warm-cream)] p-6 text-left">
          <h2 className="mb-2 font-display text-lg text-[var(--color-oxblood)]">
            What happens next
          </h2>
          <p className="text-sm leading-relaxed text-[var(--color-charcoal)]/70">
            We&apos;ll send you your cook&apos;s details and everything you need before your
            session. Your cook will arrive with all the ingredients and leave your kitchen spotless.
          </p>
        </div>
      )}

      {/* ── Action buttons ──────────────────────────────────────────── */}
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/customer/bookings"
          className="rounded-2xl bg-[var(--color-oxblood)] px-6 py-3 font-display text-sm text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          View my booking
        </Link>
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${CONTACT_MESSAGE}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl border border-[var(--color-oxblood)]/20 px-6 py-3 font-display text-sm text-[var(--color-oxblood)] transition hover:bg-[var(--color-oxblood)]/5"
        >
          Contact Chefmate
        </a>
        <Link
          href="/"
          className="rounded-2xl border border-[var(--color-oxblood)]/20 px-6 py-3 font-display text-sm text-[var(--color-oxblood)] transition hover:bg-[var(--color-oxblood)]/5"
        >
          Browse more meals
        </Link>
      </div>
    </div>
  );
}

// ── Detail row ─────────────────────────────────────────────────────────────

function DetailRow({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="shrink-0 text-xs font-medium text-[var(--color-charcoal)]/50">{label}</span>
      <span className="text-right text-sm font-semibold text-[var(--color-charcoal)]">
        {children}
      </span>
    </div>
  );
}

// ── Page export with Suspense boundary ─────────────────────────────────────

export default function ConfirmedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-[var(--color-charcoal)]/50">Loading...</p>
        </div>
      }
    >
      <ConfirmedPageContent />
    </Suspense>
  );
}

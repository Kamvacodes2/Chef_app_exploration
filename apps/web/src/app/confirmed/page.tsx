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

// ── Helpers ────────────────────────────────────────────────────────────────

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

  // Fire Google Ads conversion + Umami events once booking is loaded
  useEffect(() => {
    if (!booking) return;

    // Google Ads purchase conversion
    const win = window as unknown as Record<string, unknown>;
    const gtag = win.gtag as ((...args: unknown[]) => void) | undefined;
    if (typeof gtag === "function") {
      gtag("event", "conversion", {
        send_to: "AW-XXXXXXXXX/XXXXXXXX",
        value: booking.pricing.totalCents / 100,
        currency: "ZAR",
        transaction_id: booking.reference,
      });
    }

    // Umami purchase success event
    const umami = win.umami as
      { track?: (event: string, data: Record<string, unknown>) => void } | undefined;
    if (typeof umami?.track === "function") {
      umami.track("purchase_success", {
        reference: booking.reference,
        value: booking.pricing.totalCents / 100,
      });
    }
  }, [booking]);

  // ── Loading state ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-[var(--color-charcoal)]/50">Loading your booking...</p>
      </div>
    );
  }

  // ── No booking found ──────────────────────────────────────────────
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

  // ── Booking confirmed ─────────────────────────────────────────────
  const isBankTransfer = booking.status === "REQUESTED" || booking.status === "NEEDS_REVIEW";
  const isConfirmed =
    booking.status === "CONFIRMED" ||
    booking.status === "AWAITING_CHEF" ||
    booking.status === "CHEF_MATCHED";

  return (
    <div className="flex min-h-[60vh] flex-col items-center gap-8 px-4 py-12 text-center">
      {/* Logo + heading */}
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
          Dinner is handled. 🤎
        </h1>
        <p className="max-w-md text-lg text-[var(--color-charcoal)]/70">
          {isConfirmed
            ? "Your Chefmate booking is confirmed."
            : "Your Chefmate booking has been received."}
        </p>
      </div>

      {/* Booking details card */}
      <div className="w-full max-w-md rounded-3xl border border-[var(--color-oxblood)]/10 bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)] text-left">
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
                isConfirmed ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {booking.status.replace(/_/g, " ")}
            </span>
          </DetailRow>
        </dl>
      </div>

      {/* What happens next */}
      <div className="w-full max-w-md rounded-3xl bg-[var(--color-warm-cream)] p-6 text-left">
        <h2 className="mb-2 font-display text-lg text-[var(--color-oxblood)]">What happens next</h2>
        {isBankTransfer ? (
          <p className="text-sm leading-relaxed text-[var(--color-charcoal)]/70">
            We&apos;ll verify your bank transfer and match you with the best available cook in your
            area. You&apos;ll receive an email once a cook is assigned — usually within a few hours.
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-[var(--color-charcoal)]/70">
            We&apos;ll send you your cook&apos;s details and everything you need before your
            session. Your cook will arrive with all the ingredients and leave your kitchen spotless.
          </p>
        )}
      </div>

      {/* Action buttons */}
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

// ── Page export with Suspense boundary for useSearchParams ──────────────────

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

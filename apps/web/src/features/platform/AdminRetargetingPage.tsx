"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchRetargetableBookings,
  sendRetargetEmail,
  type RetargetableBooking,
} from "./api/platformClient";

function formatZar(cents: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(cents / 100);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(value));
}

function defaultGreeting(booking: RetargetableBooking): string {
  const first = (booking.contactName ?? "").trim().split(/\s+/)[0];
  return first || booking.contactEmail.split("@")[0] || "there";
}

function defaultSubject(booking: RetargetableBooking): string {
  return `Still thinking about your Chefmate booking, ${defaultGreeting(booking)}?`;
}

function defaultMessage(booking: RetargetableBooking): string {
  const when = `${formatDate(booking.scheduledDate)} at ${booking.timeSlot}`;
  return `Hi ${defaultGreeting(booking)}, your Chefmate order ${booking.reference} (${booking.mainName}, ${when}) is still reserved and awaiting payment. If anything got in the way, just reply here — we are happy to help you reschedule or adjust the order. You can pick up where you left off in your Chefmate dashboard.`;
}

const STATUS_LABELS: Readonly<Record<string, string>> = {
  REQUESTED: "Awaiting payment review",
  NEEDS_REVIEW: "Needs review",
  CONFIRMED: "Confirmed — unpaid",
  AWAITING_CHEF: "Awaiting chef — unpaid",
  CHEF_MATCHED: "Chef matched — unpaid",
};

export function AdminRetargetingPage() {
  const [bookings, setBookings] = useState<readonly RetargetableBooking[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [composing, setComposing] = useState<RetargetableBooking | null>(null);
  const [subject, setSubject] = useState("");
  const [greeting, setGreeting] = useState("");
  const [message, setMessage] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoSummary, setPromoSummary] = useState("");
  const [sendBusy, setSendBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setBookings(await fetchRetargetableBookings());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load retargeting list");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const realBookings = useMemo(() => bookings.filter((b) => !b.isTestBooking), [bookings]);
  const testBookings = useMemo(() => bookings.filter((b) => b.isTestBooking), [bookings]);

  const openComposer = (booking: RetargetableBooking) => {
    setComposing(booking);
    setSubject(defaultSubject(booking));
    setGreeting(defaultGreeting(booking));
    setMessage(defaultMessage(booking));
    setPromoCode("");
    setPromoSummary("");
    setSendError(null);
    setNotice(null);
  };

  const send = async () => {
    if (!composing) return;
    setSendBusy(true);
    setSendError(null);
    try {
      const result = await sendRetargetEmail({
        bookingId: composing.bookingId,
        subject: subject.trim() || undefined,
        greeting: greeting.trim() || undefined,
        message: message.trim(),
        promoCode: promoCode.trim() || undefined,
        promoSummary: promoSummary.trim() || undefined,
      });
      setNotice(
        `Retargeting email queued for ${result.booking.contactEmail} (${result.booking.reference}). It will be delivered by the email worker shortly.`,
      );
      setComposing(null);
      await load();
    } catch (caught) {
      setSendError(
        caught instanceof Error ? caught.message : "Failed to queue the retargeting email",
      );
    } finally {
      setSendBusy(false);
    }
  };

  const renderRow = (booking: RetargetableBooking) => (
    <li
      key={booking.bookingId}
      className="rounded-2xl border border-[var(--color-oxblood)]/10 bg-white p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold text-[var(--color-charcoal)]">
            {booking.contactName ?? booking.contactEmail}{" "}
            <span className="font-mono text-xs font-normal text-[var(--color-charcoal)]/60">
              {booking.reference}
            </span>
          </p>
          <p className="mt-0.5 text-sm text-[var(--color-charcoal)]/70">
            {booking.mainName} · {formatDate(booking.scheduledDate)} at {booking.timeSlot} ·{" "}
            {formatZar(booking.totalCents)}
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-charcoal)]/60">
            {STATUS_LABELS[booking.status] ?? booking.status} · Payment:{" "}
            {booking.paymentStatus?.toLowerCase() ?? "none"} · Created{" "}
            {formatDate(booking.createdAt)}
            {booking.retargetEmailSentAt
              ? ` · Retarget email sent ${formatDate(booking.retargetEmailSentAt)}`
              : ""}
          </p>
        </div>
        <button
          className="inline-flex min-h-10 items-center rounded-xl bg-[var(--color-oxblood)] px-4 text-xs font-bold text-white transition hover:opacity-90"
          onClick={() => openComposer(booking)}
          type="button"
        >
          {booking.retargetEmailSentAt ? "Send again" : "Send promo email"}
        </button>
      </div>
    </li>
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-[var(--color-oxblood)]">Retargeting</h2>
            <p className="mt-1 max-w-2xl text-sm text-[var(--color-charcoal)]/70">
              Customers who placed an order but never completed payment. Send a personalized
              win-back email at your discretion — optionally with an active promo code. Payment
              status refreshes as customers pay; cancelled bookings never appear here.
            </p>
          </div>
          <button
            className="inline-flex min-h-10 items-center rounded-xl border border-[var(--color-oxblood)] px-4 text-xs font-bold text-[var(--color-oxblood)]"
            onClick={() => void load()}
            type="button"
          >
            Refresh
          </button>
        </div>

        {notice ? (
          <p
            className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800"
            role="status"
          >
            {notice}
          </p>
        ) : null}
        {error ? (
          <p
            className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {busy ? (
          <p className="mt-6 text-sm text-[var(--color-charcoal)]/60" role="status">
            Loading retargeting candidates...
          </p>
        ) : (
          <>
            <ul className="mt-6 space-y-3">{realBookings.map(renderRow)}</ul>
            {realBookings.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-[var(--color-warm-cream)] p-6 text-center text-sm text-[var(--color-charcoal)]/70">
                <p className="text-2xl">🎉</p>
                <p className="mt-2 font-bold text-[var(--color-oxblood)]">
                  No unpaid orders to retarget right now.
                </p>
              </div>
            ) : null}

            {testBookings.length > 0 ? (
              <details className="mt-6 rounded-2xl border border-dashed border-[var(--color-charcoal)]/25 p-4">
                <summary className="cursor-pointer text-sm font-bold text-[var(--color-charcoal)]/70">
                  Test bookings ({testBookings.length}) — excluded from sending
                </summary>
                <ul className="mt-3 space-y-3">{testBookings.map(renderRow)}</ul>
              </details>
            ) : null}
          </>
        )}
      </section>

      {composing ? (
        <section className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
          <h3 className="text-xl font-black text-[var(--color-oxblood)]">
            Compose retargeting email — {composing.reference}
          </h3>
          <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">
            To {composing.contactEmail}. The book-again link is added automatically.
          </p>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-1.5 text-sm font-bold text-[var(--color-charcoal)]">
              Subject
              <input
                className="min-h-11 rounded-lg border border-[var(--color-oxblood)]/25 bg-white px-3 text-base font-normal"
                maxLength={160}
                onChange={(event) => setSubject(event.target.value)}
                value={subject}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-[var(--color-charcoal)]">
              Greeting (first name)
              <input
                className="min-h-11 rounded-lg border border-[var(--color-oxblood)]/25 bg-white px-3 text-base font-normal"
                maxLength={80}
                onChange={(event) => setGreeting(event.target.value)}
                value={greeting}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-[var(--color-charcoal)]">
              Message
              <textarea
                className="min-h-32 rounded-lg border border-[var(--color-oxblood)]/25 bg-white px-3 py-2 text-base font-normal"
                maxLength={1500}
                onChange={(event) => setMessage(event.target.value)}
                value={message}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-bold text-[var(--color-charcoal)]">
                Promo code (optional)
                <input
                  className="min-h-11 rounded-lg border border-[var(--color-oxblood)]/25 bg-white px-3 font-mono text-base font-normal uppercase"
                  maxLength={40}
                  onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
                  placeholder="e.g. WELCOME15"
                  value={promoCode}
                />
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-[var(--color-charcoal)]">
                Promo summary (optional)
                <input
                  className="min-h-11 rounded-lg border border-[var(--color-oxblood)]/25 bg-white px-3 text-base font-normal"
                  maxLength={120}
                  onChange={(event) => setPromoSummary(event.target.value)}
                  placeholder="e.g. 15% off any chef visit"
                  value={promoSummary}
                />
              </label>
            </div>
          </div>

          {sendError ? (
            <p
              className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800"
              role="alert"
            >
              {sendError}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="inline-flex min-h-11 items-center rounded-xl bg-[var(--color-oxblood)] px-5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
              disabled={sendBusy || message.trim().length < 10}
              onClick={() => void send()}
              type="button"
            >
              {sendBusy ? "Queueing..." : "Queue retargeting email"}
            </button>
            <button
              className="inline-flex min-h-11 items-center rounded-xl border border-[var(--color-oxblood)] px-5 text-sm font-bold text-[var(--color-oxblood)]"
              onClick={() => setComposing(null)}
              type="button"
            >
              Cancel
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

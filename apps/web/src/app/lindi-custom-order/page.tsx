"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  initializePaystackCheckout,
  submitBookingRequestPayload,
} from "@/features/order-flow/api/bookingRequestClient";

const SCHEDULED_DATE = "2026-10-02";
const TIME_SLOT = "16:00";
const TOTAL_LABEL = "R980";
const CUSTOM_REQUEST_TEXT =
  "Bespoke two-main session for Lindi (R980 fixed). " +
  "Main 1: Creamy Coconut Fish Curry and Rice with a side of cucumber and coriander salad. " +
  "Main 2: Honey Garlic roasted chicken with crispy rosemary potatoes and rocket and butternut salad.";

function normalizePhone(value: string): string {
  const compact = value.trim().replace(/[\s()-]/g, "");
  const normalized = compact.startsWith("00")
    ? "+" + compact.slice(2)
    : compact.startsWith("0")
      ? "+27" + compact.slice(1)
      : compact;
  if (!/^\+?[1-9]\d{7,14}$/.test(normalized)) {
    throw new Error("A valid contact phone number is required.");
  }
  return normalized;
}

export default function LindiCustomOrderPage() {
  const [name, setName] = useState("Lindi");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [area, setArea] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!acceptTerms) {
      setError("Please agree to the Customer Terms and Conditions to continue.");
      return;
    }
    setIsSubmitting(true);
    try {
      const contact = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: normalizePhone(phone),
      };
      if (contact.name.length < 2) throw new Error("Contact name is required.");
      if (!/^\S+@\S+\.\S+$/.test(contact.email)) throw new Error("A valid contact email is required.");
      if (street.trim().length <= 2) throw new Error("Street address is required for the chef visit.");
      if (area.trim().length <= 1) throw new Error("Area or suburb is required for the chef visit.");

      const confirmation = await submitBookingRequestPayload(
        {
          source: "landing-order-flow",
          goalId: null,
          mainSlug: "custom-request",
          sideSlugs: [],
          dessertSlug: null,
          customRequest: CUSTOM_REQUEST_TEXT,
          customMealTier: "two-mains-980",
          scheduledDate: SCHEDULED_DATE,
          timeSlot: TIME_SLOT,
          address: {
            estate: "",
            unit: "",
            street: street.trim(),
            area: area.trim(),
          },
          contact,
          giftCode: null,
        },
        { idempotencyKey: crypto.randomUUID() },
      );

      // Activation + account link are queued automatically for this guest
      // booking (email.customer.activation); the order confirmation carries
      // the payment. Take them straight to the R980 Paystack gateway.
      const existingUrl = confirmation.payment?.paystack?.authorizationUrl;
      if (existingUrl) {
        window.location.assign(existingUrl);
        return;
      }
      const checkout = await initializePaystackCheckout(confirmation.reference);
      window.location.assign(checkout.authorizationUrl);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Chefmate could not start this booking.",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-warm-cream)] px-4 py-12 sm:px-6">
      <section className="mx-auto max-w-2xl rounded-3xl border border-[var(--color-oxblood)]/15 bg-white p-6 shadow-[0_16px_42px_rgba(83,31,27,0.1)] sm:p-9">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--color-terracotta)]">
          Bespoke Chefmate session
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-[var(--color-oxblood)]">
          Lindi&apos;s custom order — {TOTAL_LABEL}
        </h1>
        <div className="mt-4 rounded-2xl bg-[var(--color-warm-cream)] p-4 text-sm leading-6 text-[var(--color-charcoal)]/80">
          <p className="font-bold text-[var(--color-oxblood)]">Friday 2 October 2026 · 16:00 (Johannesburg time)</p>
          <p className="mt-2">
            <span className="font-bold">Main 1:</span> Creamy Coconut Fish Curry and Rice with a side
            of cucumber and coriander salad.
          </p>
          <p className="mt-1">
            <span className="font-bold">Main 2:</span> Honey Garlic roasted chicken with crispy
            rosemary potatoes and rocket and butternut salad.
          </p>
          <p className="mt-2 font-bold text-[var(--color-oxblood)]">Session total: {TOTAL_LABEL} via Paystack</p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="grid gap-2 text-sm font-bold text-[var(--color-charcoal)]" htmlFor="lindi-name">
            Full name
            <input
              id="lindi-name"
              autoComplete="name"
              required
              minLength={2}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="min-h-11 rounded-lg border border-[var(--color-oxblood)]/25 px-3 text-base font-normal outline-none focus:border-[var(--color-oxblood)] focus:ring-2 focus:ring-[var(--color-terracotta)]/35"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-[var(--color-charcoal)]" htmlFor="lindi-email">
            Email address
            <input
              id="lindi-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="min-h-11 rounded-lg border border-[var(--color-oxblood)]/25 px-3 text-base font-normal outline-none focus:border-[var(--color-oxblood)] focus:ring-2 focus:ring-[var(--color-terracotta)]/35"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-[var(--color-charcoal)]" htmlFor="lindi-phone">
            Phone number
            <input
              id="lindi-phone"
              type="tel"
              autoComplete="tel"
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+27..."
              className="min-h-11 rounded-lg border border-[var(--color-oxblood)]/25 px-3 text-base font-normal outline-none focus:border-[var(--color-oxblood)] focus:ring-2 focus:ring-[var(--color-terracotta)]/35"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-[var(--color-charcoal)]" htmlFor="lindi-street">
            Street address (where the chef cooks)
            <input
              id="lindi-street"
              autoComplete="street-address"
              required
              value={street}
              onChange={(event) => setStreet(event.target.value)}
              className="min-h-11 rounded-lg border border-[var(--color-oxblood)]/25 px-3 text-base font-normal outline-none focus:border-[var(--color-oxblood)] focus:ring-2 focus:ring-[var(--color-terracotta)]/35"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-[var(--color-charcoal)]" htmlFor="lindi-area">
            Area / suburb
            <input
              id="lindi-area"
              required
              value={area}
              onChange={(event) => setArea(event.target.value)}
              className="min-h-11 rounded-lg border border-[var(--color-oxblood)]/25 px-3 text-base font-normal outline-none focus:border-[var(--color-oxblood)] focus:ring-2 focus:ring-[var(--color-terracotta)]/35"
            />
          </label>

          <label className="flex cursor-pointer items-start gap-3 text-sm text-[var(--color-charcoal)]/85">
            <input
              id="lindi-terms"
              type="checkbox"
              checked={acceptTerms}
              onChange={(event) => setAcceptTerms(event.target.checked)}
              required
              className="mt-1 h-4 w-4 accent-[var(--color-oxblood)]"
            />
            <span>
              I agree to the{" "}
              <Link
                href="/legal/customer-terms"
                target="_blank"
                className="font-semibold text-[var(--color-oxblood)] underline-offset-4 hover:underline"
              >
                Customer Terms and Conditions
              </Link>
              <span className="text-[var(--color-oxblood)]"> *</span>
            </span>
          </label>

          {error ? (
            <p className="text-sm font-medium text-[var(--color-oxblood)]" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--color-oxblood)] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Starting your booking…" : `Continue to booking — pay ${TOTAL_LABEL}`}
          </button>
          <p className="text-xs leading-5 text-[var(--color-charcoal)]/60">
            Continuing creates your Chefmate order and account activation link, then takes you to
            the secure Paystack gateway for {TOTAL_LABEL}. Your order confirmation and activation
            email use Chefmate theming.
          </p>
        </form>
      </section>
    </main>
  );
}

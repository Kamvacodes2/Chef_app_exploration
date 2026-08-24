"use client";

import { type FormEvent, type ReactElement, useState } from "react";
import { joinWaitlist, type WaitlistServiceFrequency } from "./api/waitlistClient";

const CITIES = [
  "Johannesburg",
  "Pretoria",
  "Cape Town",
  "Durban",
  "Port Elizabeth",
  "East London",
  "Bloemfontein",
  "Polokwane",
  "Mbombela (Nelspruit)",
  "Other",
] as const;

const OTHER_CITY = "Other";

const FREQUENCY_OPTIONS: readonly {
  readonly value: WaitlistServiceFrequency;
  readonly label: string;
}[] = [
  { value: "ONCE_A_WEEK", label: "Once a week" },
  { value: "TWICE_A_WEEK", label: "Twice a week" },
  { value: "FOUR_TIMES_A_WEEK", label: "4 times a week" },
];

const PHONE_PATTERN = /^\+?[0-9][0-9 ()-]{5,}$/;

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  otherCity: string;
  serviceFrequency: WaitlistServiceFrequency | null;
}

const initialForm: FormState = {
  fullName: "",
  email: "",
  phone: "",
  city: "",
  otherCity: "",
  serviceFrequency: null,
};

export function WaitlistPage(): ReactElement {
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [joined, setJoined] = useState(false);

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [field]: value }));

  const chosenCity = form.city === OTHER_CITY ? form.otherCity.trim() : form.city.trim();
  const frequency = form.serviceFrequency;
  const canSubmit =
    form.fullName.trim().length >= 2 &&
    form.email.includes("@") &&
    PHONE_PATTERN.test(form.phone.trim()) &&
    chosenCity.length >= 2 &&
    frequency !== null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!frequency || chosenCity.length < 2) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await joinWaitlist({
        displayName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        city: chosenCity,
        serviceFrequency: frequency,
      });
      setJoined(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not join the waiting list. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (joined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-warm-cream)] px-4">
        <div
          className="max-w-md rounded-3xl bg-white p-10 text-center shadow-[0_20px_60px_rgba(70,33,24,0.08)]"
          role="status"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="mt-6 font-display-wide text-2xl font-black text-[var(--color-oxblood)]">
            You&apos;re on the list!
          </h1>
          <p className="mt-3 leading-7 text-[var(--color-charcoal)]/70">
            Thanks for joining the ChefMate waiting list. We&apos;ll email you the moment we start
            cooking in <span className="font-bold text-[var(--color-charcoal)]">{chosenCity}</span>.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-[var(--color-warm-cream)] text-[var(--color-charcoal)]">
      {/* Hero */}
      <section className="bg-[var(--color-oxblood)] px-6 py-16 text-white sm:px-8 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/70">
            ChefMate waiting list
          </p>
          <h1 className="mt-4 font-display-wide text-4xl leading-tight sm:text-5xl">
            A chef in your kitchen,{" "}
            <span className="text-[var(--color-maize)]">coming to your area.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-white/80">
            ChefMate is launching across South Africa. Join the waiting list and we&apos;ll let you
            know the moment we&apos;re cooking in your city.
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-sm text-white/60">
            Johannesburg · Pretoria · Cape Town · Durban · Port Elizabeth · East London · and more
            soon
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="px-6 py-14 sm:px-8 sm:py-16" aria-labelledby="join-form-heading">
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 shadow-[0_20px_60px_rgba(70,33,24,0.08)] sm:p-10">
          <h2
            id="join-form-heading"
            className="font-display text-2xl font-black text-[var(--color-oxblood)]"
          >
            Join the waiting list
          </h2>
          <p className="mt-2 text-sm text-[var(--color-charcoal)]/60">
            It takes under a minute. We only email you when ChefMate arrives in your area.
          </p>

          <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="waitlist-name"
                className="text-sm font-bold text-[var(--color-charcoal)]"
              >
                Full name
              </label>
              <input
                id="waitlist-name"
                name="displayName"
                type="text"
                autoComplete="name"
                value={form.fullName}
                onChange={(e) => update("fullName", e.target.value)}
                className="min-h-11 rounded-lg border border-[var(--color-charcoal)]/15 bg-white px-4 text-sm text-[var(--color-charcoal)] placeholder:text-[var(--color-charcoal)]/35 focus:border-[var(--color-terracotta)] focus:outline-none focus:ring-2 focus:ring-[var(--color-terracotta)]/30"
                placeholder="e.g. Nomsa Dlamini"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="waitlist-email"
                className="text-sm font-bold text-[var(--color-charcoal)]"
              >
                Email
              </label>
              <input
                id="waitlist-email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className="min-h-11 rounded-lg border border-[var(--color-charcoal)]/15 bg-white px-4 text-sm text-[var(--color-charcoal)] placeholder:text-[var(--color-charcoal)]/35 focus:border-[var(--color-terracotta)] focus:outline-none focus:ring-2 focus:ring-[var(--color-terracotta)]/30"
                placeholder="you@example.com"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="waitlist-phone"
                className="text-sm font-bold text-[var(--color-charcoal)]"
              >
                Phone number
              </label>
              <input
                id="waitlist-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                className="min-h-11 rounded-lg border border-[var(--color-charcoal)]/15 bg-white px-4 text-sm text-[var(--color-charcoal)] placeholder:text-[var(--color-charcoal)]/35 focus:border-[var(--color-terracotta)] focus:outline-none focus:ring-2 focus:ring-[var(--color-terracotta)]/30"
                placeholder="+27 82 123 4567"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="waitlist-city"
                className="text-sm font-bold text-[var(--color-charcoal)]"
              >
                Your city or area
              </label>
              <select
                id="waitlist-city"
                name="city"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                className="min-h-11 rounded-lg border border-[var(--color-charcoal)]/15 bg-white px-4 text-sm text-[var(--color-charcoal)] focus:border-[var(--color-terracotta)] focus:outline-none focus:ring-2 focus:ring-[var(--color-terracotta)]/30"
              >
                <option value="" disabled>
                  Choose your city or area
                </option>
                {CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {form.city === OTHER_CITY && (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="waitlist-other-city"
                  className="text-sm font-bold text-[var(--color-charcoal)]"
                >
                  Tell us your area
                </label>
                <input
                  id="waitlist-other-city"
                  name="otherCity"
                  type="text"
                  value={form.otherCity}
                  onChange={(e) => update("otherCity", e.target.value)}
                  className="min-h-11 rounded-lg border border-[var(--color-charcoal)]/15 bg-white px-4 text-sm text-[var(--color-charcoal)] placeholder:text-[var(--color-charcoal)]/35 focus:border-[var(--color-terracotta)] focus:outline-none focus:ring-2 focus:ring-[var(--color-terracotta)]/30"
                  placeholder="e.g. George, Klerksdorp, Rustenburg"
                />
              </div>
            )}

            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-bold text-[var(--color-charcoal)]">
                How often do you wish someone took care of the cooking?
              </legend>
              <div
                className="flex flex-col gap-2"
                role="radiogroup"
                aria-label="How often do you wish someone took care of the cooking?"
              >
                {FREQUENCY_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-[var(--color-charcoal)]/15 bg-white px-4 text-sm text-[var(--color-charcoal)] transition has-[:checked]:border-[var(--color-oxblood)] has-[:checked]:bg-[var(--color-oxblood)]/5"
                  >
                    <input
                      type="radio"
                      name="serviceFrequency"
                      value={option.value}
                      checked={form.serviceFrequency === option.value}
                      onChange={() => update("serviceFrequency", option.value)}
                      className="size-4 accent-[var(--color-oxblood)]"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>

            {error && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--color-oxblood)] px-6 text-sm font-bold text-white transition hover:bg-[var(--color-oxblood)]/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-terracotta)]"
            >
              {isSubmitting ? "Joining..." : "Join the waiting list"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

"use client";

import { FormEvent, useState } from "react";
import { submitChefApplication, type ChefApplication } from "./api/platformClient";

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  city: "",
  serviceAreas: "",
  experience: "",
};

type FormState = typeof initialForm;

export function ChefApplicationPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitted, setSubmitted] = useState<ChefApplication | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof FormState, value: string): void => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const application = await submitChefApplication({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        city: form.city.trim() ? form.city : null,
        serviceAreas: splitCsv(form.serviceAreas),
        experience: form.experience,
      });
      setSubmitted(application);
      setForm(initialForm);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not submit the application.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="bg-[var(--color-warm-cream)] px-4 py-12 text-[var(--color-charcoal)] sm:px-6">
      <section className="mx-auto grid max-w-[1100px] gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl bg-white/70 p-8 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--color-terracotta)]">
            Chef applications
          </p>
          <h1 className="mt-4 text-4xl font-black leading-tight text-[var(--color-oxblood)]">
            Apply to cook with ChefMate.
          </h1>
          <p className="mt-4 text-lg leading-8 text-[var(--color-charcoal)]/75">
            Tell us where you work, what you cook best, and how much experience you have. Admins can
            review the pipeline, set interviews, and send portal access once you are approved.
          </p>
        </div>

        <form
          className="rounded-3xl border border-[var(--color-oxblood)]/10 bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)] sm:p-8"
          onSubmit={submit}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Full name"
              name="fullName"
              value={form.fullName}
              onChange={(value) => updateField("fullName", value)}
              autoComplete="name"
              required
            />
            <Field
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={(value) => updateField("email", value)}
              autoComplete="email"
              required
            />
            <Field
              label="Phone"
              name="phone"
              value={form.phone}
              onChange={(value) => updateField("phone", value)}
              autoComplete="tel"
              required
            />
            <Field
              label="City"
              name="city"
              value={form.city}
              onChange={(value) => updateField("city", value)}
              autoComplete="address-level2"
            />
          </div>

          <label className="mt-4 block text-sm font-bold text-[var(--color-charcoal)]">
            Service areas
            <input
              className="mt-2 min-h-12 w-full rounded-2xl border border-[var(--color-oxblood)]/15 px-4 text-base outline-none transition focus:border-[var(--color-terracotta)]"
              name="serviceAreas"
              value={form.serviceAreas}
              onChange={(event) => updateField("serviceAreas", event.target.value)}
              placeholder="Fourways, Sandton, Rosebank"
              required
            />
          </label>

          <label className="mt-4 block text-sm font-bold text-[var(--color-charcoal)]">
            Cooking experience
            <textarea
              className="mt-2 min-h-40 w-full rounded-2xl border border-[var(--color-oxblood)]/15 px-4 py-3 text-base outline-none transition focus:border-[var(--color-terracotta)]"
              name="experience"
              value={form.experience}
              onChange={(event) => updateField("experience", event.target.value)}
              placeholder="Tell us about your professional experience, signature meals, event work, and availability."
              required
            />
          </label>

          <button
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[var(--color-oxblood)] px-5 font-bold text-white transition hover:bg-[var(--color-oxblood)]/90 disabled:cursor-wait disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Submitting..." : "Submit application"}
          </button>

          {submitted ? (
            <p
              className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900"
              role="status"
            >
              Application received. Your status is {submitted.status}; reference {submitted.id}.
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
        </form>
      </section>
    </main>
  );
}

interface FieldProps {
  readonly label: string;
  readonly name: keyof FormState;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly type?: string;
  readonly autoComplete?: string;
  readonly required?: boolean;
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  autoComplete,
  required = false,
}: FieldProps) {
  return (
    <label className="block text-sm font-bold text-[var(--color-charcoal)]">
      {label}
      <input
        autoComplete={autoComplete}
        className="mt-2 min-h-12 w-full rounded-2xl border border-[var(--color-oxblood)]/15 px-4 text-base outline-none transition focus:border-[var(--color-terracotta)]"
        name={name}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

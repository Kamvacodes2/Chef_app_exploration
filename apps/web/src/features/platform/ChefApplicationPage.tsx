"use client";

import { FormEvent, useState } from "react";
import {
  submitChefApplication,
  type ChefApplication,
  type ChefReferenceInput,
} from "./api/platformClient";

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  serviceAreas: string;
  experience: string;
  idNumber: string;
  dateOfBirth: string;
  nationality: string;
  yearsOfExperience: string;
  culinaryEducation: string;
  cuisines: string;
  languages: string;
  hasFoodSafetyCert: boolean;
  hasOwnTransport: boolean;
  ref1Name: string;
  ref1Relationship: string;
  ref1Phone: string;
  ref1Email: string;
  ref2Name: string;
  ref2Relationship: string;
  ref2Phone: string;
  ref2Email: string;
}

const initialForm: FormState = {
  fullName: "",
  email: "",
  phone: "",
  city: "",
  serviceAreas: "",
  experience: "",
  idNumber: "",
  dateOfBirth: "",
  nationality: "South African",
  yearsOfExperience: "",
  culinaryEducation: "",
  cuisines: "",
  languages: "English",
  hasFoodSafetyCert: false,
  hasOwnTransport: false,
  ref1Name: "",
  ref1Relationship: "",
  ref1Phone: "",
  ref1Email: "",
  ref2Name: "",
  ref2Relationship: "",
  ref2Phone: "",
  ref2Email: "",
};

const CUISINE_OPTIONS = [
  "South African",
  "Italian",
  "Asian",
  "Mediterranean",
  "Mexican",
  "Indian",
  "French",
  "Fusion",
  "Vegan/Vegetarian",
  "Seafood",
  "BBQ/Grilling",
  "Baking & Pastries",
];

const NATIONALITIES = [
  "South African",
  "Zimbabwean",
  "Mozambican",
  "Zambian",
  "Malawian",
  "Nigerian",
  "Kenyan",
  "Congolese",
  "Other",
];

export function ChefApplicationPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitted, setSubmitted] = useState<ChefApplication | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]): void => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const buildReferences = (): ChefReferenceInput[] | null => {
    const refs: ChefReferenceInput[] = [];
    if (form.ref1Name.trim()) {
      refs.push({
        name: form.ref1Name,
        relationship: form.ref1Relationship,
        phone: form.ref1Phone,
        email: form.ref1Email,
      });
    }
    if (form.ref2Name.trim()) {
      refs.push({
        name: form.ref2Name,
        relationship: form.ref2Relationship,
        phone: form.ref2Phone,
        email: form.ref2Email,
      });
    }
    return refs.length > 0 ? refs : null;
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
        city: form.city.trim() || null,
        serviceAreas: splitCsv(form.serviceAreas),
        experience: form.experience,
        idNumber: form.idNumber.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
        nationality: form.nationality || null,
        yearsOfExperience: form.yearsOfExperience ? Number(form.yearsOfExperience) : null,
        culinaryEducation: form.culinaryEducation.trim() || null,
        cuisines: splitCsv(form.cuisines),
        languages: splitCsv(form.languages),
        hasFoodSafetyCert: form.hasFoodSafetyCert,
        hasOwnTransport: form.hasOwnTransport,
        references: buildReferences(),
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
            Tell us about your experience, qualifications, and what you cook best. We review every
            application and match approved chefs with customers in their area.
          </p>
          <div className="mt-6 space-y-2 text-sm text-[var(--color-charcoal)]/60">
            <p>✓ Takes about 5 minutes</p>
            <p>✓ You can save and come back</p>
            <p>✓ We respond within 48 hours</p>
          </div>
        </div>

        <form
          className="rounded-3xl border border-[var(--color-oxblood)]/10 bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)] sm:p-8"
          onSubmit={submit}
        >
          {/* Personal details */}
          <h2 className="mb-4 text-lg font-black text-[var(--color-oxblood)]">Personal Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <StrField
              label="Full name"
              value={form.fullName}
              onChange={(v) => updateField("fullName", v)}
              autoComplete="name"
              required
            />
            <StrField
              label="Email"
              type="email"
              value={form.email}
              onChange={(v) => updateField("email", v)}
              autoComplete="email"
              required
            />
            <StrField
              label="Phone"
              value={form.phone}
              onChange={(v) => updateField("phone", v)}
              autoComplete="tel"
              required
            />
            <StrField
              label="City"
              value={form.city}
              onChange={(v) => updateField("city", v)}
              autoComplete="address-level2"
            />
            <StrField
              label="ID / Passport number"
              value={form.idNumber}
              onChange={(v) => updateField("idNumber", v)}
            />
            <StrField
              label="Date of birth"
              type="date"
              value={form.dateOfBirth}
              onChange={(v) => updateField("dateOfBirth", v)}
            />
            <div>
              <label className="block text-sm font-bold text-[var(--color-charcoal)]">
                Nationality
              </label>
              <select
                className="mt-2 min-h-12 w-full rounded-2xl border border-[var(--color-oxblood)]/15 px-4 text-base outline-none"
                value={form.nationality}
                onChange={(e) => updateField("nationality", e.target.value)}
              >
                {NATIONALITIES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Experience */}
          <h2 className="mb-4 mt-8 text-lg font-black text-[var(--color-oxblood)]">
            Experience & Skills
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <StrField
              label="Years of experience"
              type="number"
              value={form.yearsOfExperience}
              onChange={(v) => updateField("yearsOfExperience", v)}
              min="0"
            />
            <StrField
              label="Culinary education"
              value={form.culinaryEducation}
              onChange={(v) => updateField("culinaryEducation", v)}
              placeholder="Le Cordon Bleu, self-taught, 6-month course..."
            />
          </div>

          <label className="mt-4 block text-sm font-bold text-[var(--color-charcoal)]">
            Cuisines you specialise in
            <input
              className="mt-2 min-h-12 w-full rounded-2xl border border-[var(--color-oxblood)]/15 px-4 text-base outline-none transition focus:border-[var(--color-terracotta)]"
              value={form.cuisines}
              onChange={(e) => updateField("cuisines", e.target.value)}
              placeholder="South African, Italian, Asian..."
            />
          </label>
          <p className="mt-1 text-xs text-[var(--color-charcoal)]/40">
            Suggestions: {CUISINE_OPTIONS.join(", ")}
          </p>

          <label className="mt-4 block text-sm font-bold text-[var(--color-charcoal)]">
            Languages spoken
            <input
              className="mt-2 min-h-12 w-full rounded-2xl border border-[var(--color-oxblood)]/15 px-4 text-base outline-none transition focus:border-[var(--color-terracotta)]"
              value={form.languages}
              onChange={(e) => updateField("languages", e.target.value)}
              placeholder="English, Zulu, Afrikaans..."
            />
          </label>

          {/* Service areas */}
          <h2 className="mb-4 mt-8 text-lg font-black text-[var(--color-oxblood)]">Service Area</h2>
          <label className="block text-sm font-bold text-[var(--color-charcoal)]">
            Service areas (comma-separated)
            <input
              className="mt-2 min-h-12 w-full rounded-2xl border border-[var(--color-oxblood)]/15 px-4 text-base outline-none transition focus:border-[var(--color-terracotta)]"
              value={form.serviceAreas}
              onChange={(e) => updateField("serviceAreas", e.target.value)}
              placeholder="Fourways, Sandton, Rosebank"
              required
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-6">
            <label className="flex items-center gap-3 text-sm font-bold text-[var(--color-charcoal)]">
              <input
                type="checkbox"
                checked={form.hasFoodSafetyCert}
                onChange={(e) => updateField("hasFoodSafetyCert", e.target.checked)}
                className="h-5 w-5 rounded"
              />
              I have a food safety certificate
            </label>
            <label className="flex items-center gap-3 text-sm font-bold text-[var(--color-charcoal)]">
              <input
                type="checkbox"
                checked={form.hasOwnTransport}
                onChange={(e) => updateField("hasOwnTransport", e.target.checked)}
                className="h-5 w-5 rounded"
              />
              I have my own transport
            </label>
          </div>

          {/* Experience text */}
          <label className="mt-5 block text-sm font-bold text-[var(--color-charcoal)]">
            Cooking experience
            <textarea
              className="mt-2 min-h-40 w-full rounded-2xl border border-[var(--color-oxblood)]/15 px-4 py-3 text-base outline-none transition focus:border-[var(--color-terracotta)]"
              value={form.experience}
              onChange={(e) => updateField("experience", e.target.value)}
              placeholder="Tell us about your professional experience, signature meals, event work, and why you want to cook with ChefMate."
              required
            />
          </label>

          {/* References */}
          <h2 className="mb-4 mt-8 text-lg font-black text-[var(--color-oxblood)]">References</h2>
          <p className="mb-3 text-xs text-[var(--color-charcoal)]/50">
            Provide at least one professional or character reference.
          </p>
          <div className="grid gap-3 rounded-2xl bg-[var(--color-warm-cream)] p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-charcoal)]/50">
              Reference 1
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <StrField
                label="Name"
                value={form.ref1Name}
                onChange={(v) => updateField("ref1Name", v)}
              />
              <StrField
                label="Relationship"
                value={form.ref1Relationship}
                onChange={(v) => updateField("ref1Relationship", v)}
                placeholder="Former employer, colleague..."
              />
              <StrField
                label="Phone"
                value={form.ref1Phone}
                onChange={(v) => updateField("ref1Phone", v)}
              />
              <StrField
                label="Email"
                type="email"
                value={form.ref1Email}
                onChange={(v) => updateField("ref1Email", v)}
              />
            </div>
          </div>
          <div className="mt-3 grid gap-3 rounded-2xl bg-[var(--color-warm-cream)] p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-charcoal)]/50">
              Reference 2 (optional)
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <StrField
                label="Name"
                value={form.ref2Name}
                onChange={(v) => updateField("ref2Name", v)}
              />
              <StrField
                label="Relationship"
                value={form.ref2Relationship}
                onChange={(v) => updateField("ref2Relationship", v)}
                placeholder="Former employer, colleague..."
              />
              <StrField
                label="Phone"
                value={form.ref2Phone}
                onChange={(v) => updateField("ref2Phone", v)}
              />
              <StrField
                label="Email"
                type="email"
                value={form.ref2Email}
                onChange={(v) => updateField("ref2Email", v)}
              />
            </div>
          </div>

          <button
            className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[var(--color-oxblood)] px-5 font-bold text-white transition hover:bg-[var(--color-oxblood)]/90 disabled:cursor-wait disabled:opacity-60"
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
              Application received. Reference: {submitted.id}. We&apos;ll be in touch within 48
              hours.
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

interface StrFieldProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly type?: string;
  readonly autoComplete?: string;
  readonly required?: boolean;
  readonly placeholder?: string;
  readonly min?: string;
}

function StrField({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  required = false,
  placeholder,
  min,
}: StrFieldProps) {
  return (
    <label className="block text-sm font-bold text-[var(--color-charcoal)]">
      {label}
      <input
        autoComplete={autoComplete}
        className="mt-2 min-h-12 w-full rounded-2xl border border-[var(--color-oxblood)]/15 px-4 text-base outline-none transition focus:border-[var(--color-terracotta)]"
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
        placeholder={placeholder}
        min={min}
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

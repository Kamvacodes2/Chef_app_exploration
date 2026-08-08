"use client";

import { FormEvent, useState } from "react";
import {
  submitChefApplication,
  type ChefApplication,
  type ChefReferenceInput,
} from "./api/platformClient";

// ── Types ──────────────────────────────────────────────────────
interface FormState {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  idNumber: string;
  dateOfBirth: string;
  nationality: string;
  yearsOfExperience: string;
  culinaryEducation: string;
  cuisines: string;
  languages: string;
  serviceAreas: string;
  hasFoodSafetyCert: boolean;
  hasOwnTransport: boolean;
  experience: string;
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
  idNumber: "",
  dateOfBirth: "",
  nationality: "South African",
  yearsOfExperience: "",
  culinaryEducation: "",
  cuisines: "",
  languages: "English",
  serviceAreas: "",
  hasFoodSafetyCert: false,
  hasOwnTransport: false,
  experience: "",
  ref1Name: "",
  ref1Relationship: "",
  ref1Phone: "",
  ref1Email: "",
  ref2Name: "",
  ref2Relationship: "",
  ref2Phone: "",
  ref2Email: "",
};

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

const CUISINE_SUGGESTIONS = [
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

const STEPS = [
  { id: "personal", label: "Personal", num: 1 },
  { id: "skills", label: "Skills", num: 2 },
  { id: "service", label: "Service", num: 3 },
  { id: "references", label: "References", num: 4 },
  { id: "review", label: "Review", num: 5 },
] as const;

type StepId = (typeof STEPS)[number]["id"];

// ── Component ──────────────────────────────────────────────────
export function ChefApplicationPage() {
  const [step, setStep] = useState<StepId>("personal");
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitted, setSubmitted] = useState<ChefApplication | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentIndex = STEPS.findIndex((s) => s.id === step);

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [field]: value }));

  const next = () => {
    const nextStep = STEPS[currentIndex + 1];
    if (nextStep) setStep(nextStep.id);
  };
  const prev = () => {
    const prevStep = STEPS[currentIndex - 1];
    if (prevStep) setStep(prevStep.id);
  };

  const canProgress = (): boolean => {
    switch (step) {
      case "personal":
        return (
          form.fullName.trim().length >= 2 &&
          form.email.includes("@") &&
          form.phone.trim().length >= 6
        );
      case "skills":
        return true; // all optional
      case "service":
        return form.serviceAreas.trim().length > 0 && form.experience.trim().length >= 20;
      case "references":
        return true; // at least one is encouraged but not forced
      default:
        return true;
    }
  };

  const buildRefs = (): ChefReferenceInput[] | null => {
    const refs: ChefReferenceInput[] = [];
    if (form.ref1Name.trim())
      refs.push({
        name: form.ref1Name,
        relationship: form.ref1Relationship,
        phone: form.ref1Phone,
        email: form.ref1Email,
      });
    if (form.ref2Name.trim())
      refs.push({
        name: form.ref2Name,
        relationship: form.ref2Relationship,
        phone: form.ref2Phone,
        email: form.ref2Email,
      });
    return refs.length > 0 ? refs : null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const app = await submitChefApplication({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        city: form.city.trim() || null,
        idNumber: form.idNumber.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
        nationality: form.nationality || null,
        yearsOfExperience: form.yearsOfExperience ? Number(form.yearsOfExperience) : null,
        culinaryEducation: form.culinaryEducation.trim() || null,
        cuisines: splitCsv(form.cuisines),
        languages: splitCsv(form.languages),
        serviceAreas: splitCsv(form.serviceAreas),
        hasFoodSafetyCert: form.hasFoodSafetyCert,
        hasOwnTransport: form.hasOwnTransport,
        experience: form.experience,
        references: buildRefs(),
      });
      setSubmitted(app);
      setForm(initialForm);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not submit.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-warm-cream)] px-4">
        <div className="max-w-md rounded-3xl bg-white p-10 text-center shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <span className="text-3xl">✓</span>
          </div>
          <h2 className="mt-6 text-2xl font-black text-[var(--color-oxblood)]">
            Application submitted!
          </h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            We&apos;ll review your application and get back to you within 48 hours.
          </p>
          <p className="mt-1 text-xs text-[var(--color-charcoal)]/40">Reference: {submitted.id}</p>
          <button
            onClick={() => {
              setSubmitted(null);
              setStep("personal");
            }}
            className="mt-6 rounded-xl bg-[var(--color-oxblood)] px-6 py-3 text-sm font-bold text-white"
          >
            Submit another
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-warm-cream)] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black transition ${
                    i < currentIndex
                      ? "bg-emerald-500 text-white"
                      : i === currentIndex
                        ? "bg-[var(--color-oxblood)] text-white"
                        : "bg-[var(--color-charcoal)]/10 text-[var(--color-charcoal)]/40"
                  }`}
                >
                  {i < currentIndex ? "✓" : s.num}
                </div>
                <span
                  className={`ml-2 hidden text-xs font-bold sm:inline ${
                    i <= currentIndex
                      ? "text-[var(--color-charcoal)]"
                      : "text-[var(--color-charcoal)]/30"
                  }`}
                >
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div
                    className={`mx-2 hidden h-0.5 w-8 rounded sm:block ${
                      i < currentIndex ? "bg-emerald-500" : "bg-[var(--color-charcoal)]/10"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-[var(--color-oxblood)]/10 bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)] sm:p-8"
        >
          {/* Step 1: Personal */}
          {step === "personal" && (
            <div>
              <h2 className="text-xl font-black text-[var(--color-oxblood)]">Personal Details</h2>
              <p className="mb-5 mt-1 text-sm text-[var(--color-charcoal)]/50">
                Basic information we need to verify your identity.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Full name"
                  value={form.fullName}
                  onChange={(v) => update("fullName", v)}
                  autoComplete="name"
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(v) => update("email", v)}
                  autoComplete="email"
                  required
                />
                <Input
                  label="Phone"
                  value={form.phone}
                  onChange={(v) => update("phone", v)}
                  autoComplete="tel"
                  required
                />
                <Input label="City" value={form.city} onChange={(v) => update("city", v)} />
                <Input
                  label="ID / Passport number"
                  value={form.idNumber}
                  onChange={(v) => update("idNumber", v)}
                />
                <Input
                  label="Date of birth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(v) => update("dateOfBirth", v)}
                />
                <div>
                  <label className="block text-sm font-bold text-[var(--color-charcoal)]">
                    Nationality
                  </label>
                  <select
                    value={form.nationality}
                    onChange={(e) => update("nationality", e.target.value)}
                    className="mt-2 min-h-12 w-full rounded-2xl border border-[var(--color-oxblood)]/15 px-4 text-base outline-none focus:border-[var(--color-terracotta)]"
                  >
                    {NATIONALITIES.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Skills */}
          {step === "skills" && (
            <div>
              <h2 className="text-xl font-black text-[var(--color-oxblood)]">
                Experience & Skills
              </h2>
              <p className="mb-5 mt-1 text-sm text-[var(--color-charcoal)]/50">
                Tell us about your cooking background.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Years of experience"
                  type="number"
                  value={form.yearsOfExperience}
                  onChange={(v) => update("yearsOfExperience", v)}
                  min="0"
                />
                <Input
                  label="Culinary education"
                  value={form.culinaryEducation}
                  onChange={(v) => update("culinaryEducation", v)}
                  placeholder="Self-taught, culinary school..."
                />
              </div>
              <label className="mt-4 block text-sm font-bold text-[var(--color-charcoal)]">
                Cuisines you specialise in
                <input
                  value={form.cuisines}
                  onChange={(e) => update("cuisines", e.target.value)}
                  placeholder="South African, Italian, Asian..."
                  className="mt-2 min-h-12 w-full rounded-2xl border border-[var(--color-oxblood)]/15 px-4 text-base outline-none focus:border-[var(--color-terracotta)]"
                />
              </label>
              <p className="mt-1 text-xs text-[var(--color-charcoal)]/40">
                Suggestions: {CUISINE_SUGGESTIONS.join(", ")}
              </p>
              <Input
                label="Languages spoken"
                value={form.languages}
                onChange={(v) => update("languages", v)}
                placeholder="English, Zulu, Afrikaans..."
                outerClass="mt-4"
              />
            </div>
          )}

          {/* Step 3: Service */}
          {step === "service" && (
            <div>
              <h2 className="text-xl font-black text-[var(--color-oxblood)]">Service Area</h2>
              <p className="mb-5 mt-1 text-sm text-[var(--color-charcoal)]/50">
                Where and how you can work.
              </p>
              <Input
                label="Service areas (comma-separated)"
                value={form.serviceAreas}
                onChange={(v) => update("serviceAreas", v)}
                placeholder="Fourways, Sandton, Rosebank"
                required
              />
              <div className="mt-4 flex flex-wrap gap-6">
                <Checkbox
                  label="I have a food safety certificate"
                  checked={form.hasFoodSafetyCert}
                  onChange={(v) => update("hasFoodSafetyCert", v)}
                />
                <Checkbox
                  label="I have my own transport"
                  checked={form.hasOwnTransport}
                  onChange={(v) => update("hasOwnTransport", v)}
                />
              </div>
              <label className="mt-5 block text-sm font-bold text-[var(--color-charcoal)]">
                Cooking experience
                <textarea
                  value={form.experience}
                  onChange={(e) => update("experience", e.target.value)}
                  rows={5}
                  required
                  placeholder="Tell us about your professional experience, signature meals, event work, and why you want to cook with ChefMate."
                  className="mt-2 min-h-32 w-full rounded-2xl border border-[var(--color-oxblood)]/15 px-4 py-3 text-base outline-none focus:border-[var(--color-terracotta)] resize-y"
                />
              </label>
            </div>
          )}

          {/* Step 4: References */}
          {step === "references" && (
            <div>
              <h2 className="text-xl font-black text-[var(--color-oxblood)]">References</h2>
              <p className="mb-5 mt-1 text-sm text-[var(--color-charcoal)]/50">
                At least one reference helps us verify your experience.
              </p>
              <div className="rounded-2xl bg-[var(--color-warm-cream)] p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-charcoal)]/50">
                  Reference 1
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Name"
                    value={form.ref1Name}
                    onChange={(v) => update("ref1Name", v)}
                  />
                  <Input
                    label="Relationship"
                    value={form.ref1Relationship}
                    onChange={(v) => update("ref1Relationship", v)}
                    placeholder="Former employer..."
                  />
                  <Input
                    label="Phone"
                    value={form.ref1Phone}
                    onChange={(v) => update("ref1Phone", v)}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={form.ref1Email}
                    onChange={(v) => update("ref1Email", v)}
                  />
                </div>
              </div>
              <div className="mt-3 rounded-2xl bg-[var(--color-warm-cream)] p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-charcoal)]/50">
                  Reference 2 (optional)
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Name"
                    value={form.ref2Name}
                    onChange={(v) => update("ref2Name", v)}
                  />
                  <Input
                    label="Relationship"
                    value={form.ref2Relationship}
                    onChange={(v) => update("ref2Relationship", v)}
                    placeholder="Colleague, client..."
                  />
                  <Input
                    label="Phone"
                    value={form.ref2Phone}
                    onChange={(v) => update("ref2Phone", v)}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={form.ref2Email}
                    onChange={(v) => update("ref2Email", v)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {step === "review" && (
            <div>
              <h2 className="text-xl font-black text-[var(--color-oxblood)]">
                Review your application
              </h2>
              <p className="mb-5 mt-1 text-sm text-[var(--color-charcoal)]/50">
                Check everything looks right before submitting.
              </p>
              <div className="space-y-3 text-sm">
                <ReviewRow label="Name" value={form.fullName} />
                <ReviewRow label="Email" value={form.email} />
                <ReviewRow label="Phone" value={form.phone} />
                <ReviewRow label="City" value={form.city || "—"} />
                <ReviewRow label="ID Number" value={form.idNumber || "—"} />
                <ReviewRow label="Date of birth" value={form.dateOfBirth || "—"} />
                <ReviewRow label="Nationality" value={form.nationality} />
                <hr className="border-[var(--color-oxblood)]/10" />
                <ReviewRow label="Years experience" value={form.yearsOfExperience || "—"} />
                <ReviewRow label="Education" value={form.culinaryEducation || "—"} />
                <ReviewRow label="Cuisines" value={form.cuisines || "—"} />
                <ReviewRow label="Languages" value={form.languages || "—"} />
                <hr className="border-[var(--color-oxblood)]/10" />
                <ReviewRow label="Service areas" value={form.serviceAreas} />
                <ReviewRow label="Food safety cert" value={form.hasFoodSafetyCert ? "Yes" : "No"} />
                <ReviewRow label="Own transport" value={form.hasOwnTransport ? "Yes" : "No"} />
                <ReviewRow
                  label="Experience"
                  value={
                    form.experience.slice(0, 100) + (form.experience.length > 100 ? "..." : "")
                  }
                />
                <hr className="border-[var(--color-oxblood)]/10" />
                <ReviewRow label="Reference 1" value={form.ref1Name || "—"} />
                <ReviewRow label="Reference 2" value={form.ref2Name || "—"} />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-900">
              {error}
            </p>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between gap-3">
            {currentIndex > 0 ? (
              <button
                type="button"
                onClick={prev}
                className="min-h-12 rounded-2xl border border-[var(--color-oxblood)]/20 px-6 text-sm font-bold text-[var(--color-oxblood)]"
              >
                ← Back
              </button>
            ) : (
              <div />
            )}

            {step === "review" ? (
              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-12 rounded-2xl bg-[var(--color-oxblood)] px-8 text-sm font-bold text-white disabled:opacity-60"
              >
                {isSubmitting ? "Submitting..." : "Submit application"}
              </button>
            ) : (
              <button
                type="button"
                onClick={next}
                disabled={!canProgress()}
                className="min-h-12 rounded-2xl bg-[var(--color-oxblood)] px-8 text-sm font-bold text-white disabled:opacity-40"
              >
                Continue →
              </button>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-[var(--color-charcoal)]/30">
            Step {currentIndex + 1} of {STEPS.length}
          </p>
        </form>
      </div>
    </main>
  );
}

// ── Sub-components ─────────────────────────────────────────────
function Input({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  required,
  placeholder,
  min,
  outerClass = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
  min?: string;
  outerClass?: string;
}) {
  return (
    <label className={`block text-sm font-bold text-[var(--color-charcoal)] ${outerClass}`}>
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        placeholder={placeholder}
        min={min}
        className="mt-2 min-h-12 w-full rounded-2xl border border-[var(--color-oxblood)]/15 px-4 text-base outline-none transition focus:border-[var(--color-terracotta)]"
      />
    </label>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 text-sm font-bold text-[var(--color-charcoal)] cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 rounded accent-[var(--color-oxblood)]"
      />
      {label}
    </label>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="font-bold text-[var(--color-charcoal)]/50">{label}</span>
      <span className="text-right text-[var(--color-charcoal)]">{value}</span>
    </div>
  );
}

function splitCsv(v: string): string[] {
  return v
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

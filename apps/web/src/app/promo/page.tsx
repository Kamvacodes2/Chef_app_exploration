"use client";

import { useState } from "react";

const PAIN_POINTS = [
  { value: "not_enough_time", label: "Not enough time or energy" },
  { value: "deciding_what_to_cook", label: "Deciding what to cook" },
  { value: "grocery_shopping", label: "Grocery shopping and planning" },
  { value: "preparing_healthy_meals", label: "Preparing healthy meals" },
  { value: "cleaning_up", label: "Cleaning up afterwards" },
  { value: "different_preferences", label: "Different household preferences" },
  { value: "cooking_skills", label: "Cooking skills or confidence" },
  { value: "staying_consistent", label: "Staying consistent during busy weeks" },
];

const USE_CASES = [
  { value: "weeknight_dinners", label: "Weeknight dinners" },
  { value: "sunday_kos", label: "Sunday kos" },
  { value: "weekly_meal_prep", label: "Weekly meal preparation" },
  { value: "busy_work_periods", label: "Busy work periods" },
  { value: "post_partum", label: "After having a baby or post-partum support" },
  { value: "hosting", label: "Hosting family or friends" },
  { value: "special_occasions", label: "Special occasions" },
  { value: "need_a_break", label: "When I simply need a break" },
];

const PRIORITIES = [
  { value: "affordability", label: "Affordability" },
  { value: "convenience", label: "Convenience" },
  { value: "time_saved", label: "Time saved" },
  { value: "healthy_food", label: "Healthy food" },
  { value: "trusted_cook", label: "A trusted and vetted cook" },
  { value: "kitchen_cleaned", label: "The kitchen being cleaned afterwards" },
  { value: "flexible_bookings", label: "Flexible bookings" },
  { value: "home_cooked_food", label: "Familiar home-cooked food" },
];

export default function PromoPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Screen 1
  const [ageRange, setAgeRange] = useState("");
  const [suburb, setSuburb] = useState("");
  const [householdType, setHouseholdType] = useState("");
  const [lifestyle, setLifestyle] = useState("");
  const [cookingFreq, setCookingFreq] = useState("");

  // Screen 2
  const [painPoints, setPainPoints] = useState<string[]>([]);
  const [useCases, setUseCases] = useState<string[]>([]);
  const [bookingFreq, setBookingFreq] = useState("");
  const [priorities, setPriorities] = useState<string[]>([]);
  const [heardFrom, setHeardFrom] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [waOptIn, setWaOptIn] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(false);

  const toggle = (arr: string[], set: (v: string[]) => void, val: string) => {
    set(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  const handleSubmit = async () => {
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams(window.location.search);
      const res = await fetch("/api/v1/campaign/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignCode: "womens_month_2026",
          utmSource: params.get("utm_source") ?? null,
          utmMedium: params.get("utm_medium") ?? null,
          utmCampaign: params.get("utm_campaign") ?? null,
          utmContent: params.get("utm_content") ?? null,
          utmTerm: params.get("utm_term") ?? null,
          firstName: firstName || null,
          email: email || null,
          mobileNumber: mobile || null,
          ageRange: ageRange || null,
          suburb: suburb || null,
          householdType: householdType || null,
          lifestyle: lifestyle || null,
          cookingFrequency: cookingFreq || null,
          dinnerPainPoints: painPoints,
          expectedUseCases: useCases,
          intendedBookingFreq: bookingFreq || null,
          topPriorities: priorities,
          selfReportedSource: heardFrom || null,
          privacyNoticeVersion: "2026-08-09",
          marketingEmailOptIn: emailOptIn,
          marketingWhatsappOptIn: waOptIn,
          marketingSmsOptIn: smsOptIn,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      const data = await res.json();
      setToken(data.data.token);
      setSubmitted(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  if (submitted && token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-warm-cream)] px-4">
        <div className="max-w-md rounded-3xl bg-white p-10 text-center shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <span className="text-3xl">🎉</span>
          </div>
          <h2 className="mt-6 text-2xl font-black text-[var(--color-oxblood)]">
            Your offer is unlocked!
          </h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            Use this code for 15% off Chef Tonight:
          </p>
          <div className="mx-auto mt-4 w-fit rounded-2xl bg-[var(--color-oxblood)]/10 px-6 py-3">
            <span className="text-2xl font-black tracking-[0.15em] text-[var(--color-oxblood)]">
              CHEFMATE15
            </span>
          </div>
          <p className="mt-3 text-xs text-[var(--color-charcoal)]/40">
            Valid for one use · Expires 30 days from now
          </p>
          <button
            type="button"
            onClick={() => {
              try {
                sessionStorage.setItem("chefmate_promo_code", "CHEFMATE15");
              } catch {}
              window.location.href = "/#order-flow?plan=tonight";
            }}
            className="mt-6 inline-block rounded-2xl bg-[var(--color-oxblood)] px-8 py-4 font-bold text-white transition-transform hover:scale-105"
          >
            Book your session →
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-warm-cream)] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-xl">
        {/* Hero */}
        <div className="mb-8 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--color-terracotta)]">
            Women&apos;s Month 2026
          </p>
          <h1 className="mt-3 font-display-wide text-3xl text-[var(--color-oxblood)]">
            Unlock your Women&apos;s Month offer
          </h1>
          <p className="mt-3 text-[var(--color-charcoal)]/70">
            Answer a few quick questions so we can build ChefMate around real Johannesburg
            households.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6 flex items-center justify-center gap-4">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${
                s <= step
                  ? "bg-[var(--color-oxblood)] text-white"
                  : "bg-[var(--color-charcoal)]/10 text-[var(--color-charcoal)]/40"
              }`}
            >
              {s}
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-[var(--color-oxblood)]/10 bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)] sm:p-8">
          {step === 1 && (
            <div>
              <h2 className="text-lg font-black text-[var(--color-oxblood)]">
                About your household
              </h2>
              <div className="mt-5 grid gap-4">
                <SelectField
                  label="Age range"
                  value={ageRange}
                  onChange={setAgeRange}
                  options={["", "18–24", "25–34", "35–44", "45–54", "55+", "Prefer not to say"]}
                />
                <SearchableSuburbField
                  label="Area of residence"
                  value={suburb}
                  onChange={setSuburb}
                />
                <SelectField
                  label="Household type"
                  value={householdType}
                  onChange={setHouseholdType}
                  options={[
                    "",
                    "Live alone",
                    "Couple",
                    "Family with children",
                    "Multigenerational household",
                    "Shared household",
                  ]}
                />
                <SelectField
                  label="Primary lifestyle"
                  value={lifestyle}
                  onChange={setLifestyle}
                  options={[
                    "",
                    "Employed professional",
                    "Entrepreneur/self-employed",
                    "Stay-at-home parent/carer",
                    "Student",
                    "Retired",
                    "Other",
                  ]}
                />
                <SelectField
                  label="How often do you cook?"
                  value={cookingFreq}
                  onChange={setCookingFreq}
                  options={[
                    "",
                    "Daily",
                    "4–6 times a week",
                    "2–3 times a week",
                    "Once a week",
                    "Rarely or never",
                  ]}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-lg font-black text-[var(--color-oxblood)]">
                Your dinner routine
              </h2>

              <div className="mt-5">
                <p className="text-sm font-bold text-[var(--color-charcoal)]">
                  What are your biggest dinner pain points?
                </p>
                <p className="mb-3 text-xs text-[var(--color-charcoal)]/50">Choose up to two</p>
                <div className="space-y-2">
                  {PAIN_POINTS.map((pp) => (
                    <CheckboxChip
                      key={pp.value}
                      label={pp.label}
                      checked={painPoints.includes(pp.value)}
                      onChange={() =>
                        painPoints.includes(pp.value)
                          ? setPainPoints(painPoints.filter((p) => p !== pp.value))
                          : painPoints.length < 2 && setPainPoints([...painPoints, pp.value])
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <p className="text-sm font-bold text-[var(--color-charcoal)]">
                  When would you most likely use ChefMate?
                </p>
                <p className="mb-3 text-xs text-[var(--color-charcoal)]/50">
                  Select all that apply
                </p>
                <div className="space-y-2">
                  {USE_CASES.map((uc) => (
                    <CheckboxChip
                      key={uc.value}
                      label={uc.label}
                      checked={useCases.includes(uc.value)}
                      onChange={() => toggle(useCases, setUseCases, uc.value)}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <SelectField
                  label="How often would you realistically book?"
                  value={bookingFreq}
                  onChange={setBookingFreq}
                  options={[
                    "",
                    "Three or more times a week",
                    "Twice a week",
                    "Once a week",
                    "Every two weeks",
                    "Once a month",
                    "Occasionally when needed",
                  ]}
                />
              </div>

              <div className="mt-6">
                <p className="text-sm font-bold text-[var(--color-charcoal)]">
                  What matters most to you about ChefMate?
                </p>
                <p className="mb-3 text-xs text-[var(--color-charcoal)]/50">Choose up to three</p>
                <div className="space-y-2">
                  {PRIORITIES.map((pr) => (
                    <CheckboxChip
                      key={pr.value}
                      label={pr.label}
                      checked={priorities.includes(pr.value)}
                      onChange={() =>
                        priorities.includes(pr.value)
                          ? setPriorities(priorities.filter((p) => p !== pr.value))
                          : priorities.length < 3 && setPriorities([...priorities, pr.value])
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <SelectField
                  label="How did you hear about ChefMate?"
                  value={heardFrom}
                  onChange={setHeardFrom}
                  options={[
                    "",
                    "Instagram",
                    "TikTok",
                    "WhatsApp",
                    "Friend or family",
                    "Creator or influencer",
                    "Email",
                    "Google",
                    "Other",
                  ]}
                />
              </div>

              {/* Contact */}
              <div className="mt-6 grid gap-4 border-t border-[var(--color-oxblood)]/10 pt-6">
                <p className="text-sm font-bold text-[var(--color-charcoal)]">
                  Your details (optional — only if you want a follow-up)
                </p>
                <InputField label="First name" value={firstName} onChange={setFirstName} />
                <InputField label="Email" type="email" value={email} onChange={setEmail} />
                <InputField label="Mobile number" value={mobile} onChange={setMobile} />
              </div>

              {/* Consent */}
              <div className="mt-6 border-t border-[var(--color-oxblood)]/10 pt-6">
                <p className="text-xs text-[var(--color-charcoal)]/70">
                  I have read the ChefMate{" "}
                  <a
                    href="/legal/privacy"
                    target="_blank"
                    className="font-semibold text-[var(--color-oxblood)] underline"
                  >
                    Privacy Notice
                  </a>{" "}
                  and understand that ChefMate will use the information provided to administer this
                  promotion, apply the offer, analyse customer needs and manage my booking.
                </p>

                <div className="mt-4 space-y-3">
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={emailOptIn}
                      onChange={(e) => setEmailOptIn(e.target.checked)}
                      className="h-4 w-4 rounded accent-[var(--color-oxblood)]"
                    />
                    <span className="text-[var(--color-charcoal)]/70">
                      Send me ChefMate offers and updates by email.
                    </span>
                  </label>
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={waOptIn}
                      onChange={(e) => setWaOptIn(e.target.checked)}
                      className="h-4 w-4 rounded accent-[var(--color-oxblood)]"
                    />
                    <span className="text-[var(--color-charcoal)]/70">
                      Send me ChefMate offers and updates through WhatsApp.
                    </span>
                  </label>
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={smsOptIn}
                      onChange={(e) => setSmsOptIn(e.target.checked)}
                      className="h-4 w-4 rounded accent-[var(--color-oxblood)]"
                    />
                    <span className="text-[var(--color-charcoal)]/70">
                      Send me ChefMate offers and updates by SMS.
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-900">
              {error}
            </p>
          )}

          <div className="mt-8 flex justify-between gap-3">
            {step === 2 ? (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="min-h-12 rounded-2xl border border-[var(--color-oxblood)]/20 px-6 text-sm font-bold text-[var(--color-oxblood)]"
              >
                ← Back
              </button>
            ) : (
              <div />
            )}
            {step === 1 ? (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="min-h-12 rounded-2xl bg-[var(--color-oxblood)] px-8 text-sm font-bold text-white"
              >
                Continue →
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={handleSubmit}
                className="min-h-12 rounded-2xl bg-[var(--color-oxblood)] px-8 text-sm font-bold text-white disabled:opacity-60"
              >
                {busy ? "Submitting..." : "Unlock my offer"}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm font-bold text-[var(--color-charcoal)]">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 min-h-12 w-full rounded-2xl border border-[var(--color-oxblood)]/15 px-4 text-base outline-none focus:border-[var(--color-terracotta)]"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="block text-sm font-bold text-[var(--color-charcoal)]">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 min-h-12 w-full rounded-2xl border border-[var(--color-oxblood)]/15 px-4 text-base outline-none focus:border-[var(--color-terracotta)]"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o || "Select..."}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckboxChip({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
        checked
          ? "border-[var(--color-oxblood)] bg-[var(--color-oxblood)]/5 font-semibold text-[var(--color-oxblood)]"
          : "border-[var(--color-charcoal)]/10 text-[var(--color-charcoal)]/70 hover:border-[var(--color-oxblood)]/30"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded accent-[var(--color-oxblood)]"
      />
      {label}
    </label>
  );
}

const SERVICE_AREAS = [
  "Sandton Central",
  "Sandown",
  "Benmore Gardens",
  "Morningside",
  "Parkmore",
  "Bryanston",
  "Rivonia",
  "Illovo",
  "Hyde Park",
  "Sandhurst",
  "Atholl",
  "Hurlingham",
  "Gallo Manor",
  "Wendywood",
  "Woodmead",
  "Fourways",
  "Lonehill",
  "Douglasdale",
  "Beverley",
  "Craigavon",
  "Broadacres",
  "Dainfern",
  "Fourways Gardens",
  "Cedar Lakes",
  "Paulshof",
  "Petervale",
  "Magaliessig",
  "Sunninghill",
  "Rosebank",
  "Parkhurst",
  "Parktown North",
  "Parkview",
  "Parkwood",
  "Greenside",
  "Craighall Park",
  "Craighall",
  "Dunkeld",
  "Melrose",
  "Melrose Arch",
  "Saxonwold",
  "Houghton",
  "Norwood",
  "Killarney",
  "Randburg",
  "Ferndale",
  "Blairgowrie",
  "Linden",
  "Robindale",
  "Robin Hills",
  "Northcliff",
  "Fairland",
  "Cresta",
  "Blackheath",
  "Randpark Ridge",
  "Bromhof",
  "Boskruin",
  "North Riding",
  "Olivedale",
  "Midrand",
  "Waterfall",
  "Kyalami",
  "Carlswald",
  "Halfway Gardens",
  "Vorna Valley",
  "Noordwyk",
  "Barbeque Downs",
  "Crowthorne",
  "Blue Hills",
  "Kyalami Hills",
];

function SearchableSuburbField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);

  const filtered = query
    ? SERVICE_AREAS.filter((s) => s.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : SERVICE_AREAS.slice(0, 8);

  return (
    <div className="relative">
      <label className="block text-sm font-bold text-[var(--color-charcoal)]">{label}</label>
      <input
        type="text"
        value={query}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
        }}
        placeholder="Type your suburb..."
        className="mt-2 min-h-12 w-full rounded-2xl border border-[var(--color-oxblood)]/15 px-4 text-base outline-none focus:border-[var(--color-terracotta)]"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-2xl border border-[var(--color-oxblood)]/10 bg-white shadow-lg">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setQuery(s);
                onChange(s);
                setOpen(false);
              }}
              className={`w-full px-4 py-3 text-left text-sm transition hover:bg-[var(--color-oxblood)]/5 ${
                s === value
                  ? "bg-[var(--color-oxblood)]/10 font-semibold text-[var(--color-oxblood)]"
                  : "text-[var(--color-charcoal)]/70"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

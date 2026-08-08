"use client";

import { type ReactNode, useState } from "react";
import { acceptPolicy, type PolicyStatusItem } from "@/features/platform/api/platformClient";

interface PolicyAcceptanceModalProps {
  readonly policies: readonly PolicyStatusItem[];
  readonly onComplete: () => void;
  readonly onClose?: () => void;
}

export function PolicyAcceptanceModal({
  policies,
  onComplete,
  onClose,
}: PolicyAcceptanceModalProps) {
  const unaccepted = policies.filter((p) => !p.accepted);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (unaccepted.length === 0) {
    onComplete();
    return null;
  }

  const current = unaccepted[currentIndex];
  if (!current) {
    onComplete();
    return null;
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 30) {
      setScrolledToBottom(true);
    }
  };

  const handleAccept = async () => {
    setBusy(true);
    setError(null);
    try {
      await acceptPolicy(current.policyKey, "2026-08-09");
      if (currentIndex + 1 >= unaccepted.length) {
        onComplete();
      } else {
        setCurrentIndex(currentIndex + 1);
        setScrolledToBottom(false);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to accept policy");
    } finally {
      setBusy(false);
    }
  };

  const policyLabel = policyLabels[current.policyKey] ?? current.policyKey;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="shrink-0 border-b border-[var(--color-oxblood)]/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-[var(--color-oxblood)]">{policyLabel}</h2>
            {onClose ? (
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-[var(--color-charcoal)]/40 hover:text-[var(--color-charcoal)]"
                type="button"
              >
                ✕
              </button>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-[var(--color-charcoal)]/50">
            Please review and accept to continue · {currentIndex + 1} of {unaccepted.length}
          </p>
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto px-6 py-4 text-sm leading-relaxed text-[var(--color-charcoal)]/70"
          onScroll={handleScroll}
        >
          <PolicyContent policyKey={current.policyKey} />
        </div>

        {/* Error */}
        {error ? (
          <p className="shrink-0 bg-red-50 px-6 py-2 text-xs font-semibold text-red-800">{error}</p>
        ) : null}

        {/* Footer */}
        <div className="shrink-0 border-t border-[var(--color-oxblood)]/10 px-6 py-4">
          <p className="mb-3 text-xs text-[var(--color-charcoal)]/50">
            {scrolledToBottom
              ? "You have reviewed this document."
              : "Please scroll to the bottom to review the full document."}
          </p>
          <button
            className="w-full rounded-xl bg-[var(--color-oxblood)] py-3 text-sm font-bold text-white transition-opacity disabled:opacity-50"
            disabled={!scrolledToBottom || busy}
            onClick={handleAccept}
            type="button"
          >
            {busy ? "Accepting..." : "I Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}

const policyLabels: Record<string, string> = {
  chef_service_agreement: "Chef Service Provider Agreement",
  chef_code_of_conduct: "Chef Code of Conduct",
  customer_terms: "Customer Terms & Conditions",
  privacy_policy: "Privacy Policy",
  website_terms: "Website Terms of Use",
};

function PolicyContent({ policyKey }: { readonly policyKey: string }) {
  // Inline summaries — the full legal text is at /legal/*
  switch (policyKey) {
    case "chef_service_agreement":
      return (
        <div className="space-y-4">
          <section>
            <h3 className="font-bold text-[var(--color-charcoal)]">
              1. Independent Contractor Status
            </h3>
            <p>
              You operate as an independent contractor, not an employee. You are responsible for
              your own tax and compliance obligations. ChefMate does not deduct PAYE, UIF, or SDL.
            </p>
          </section>
          <section>
            <h3 className="font-bold text-[var(--color-charcoal)]">2. Booking Process</h3>
            <p>
              You may accept or decline bookings at your discretion. Once accepted, you are expected
              to perform. Avoidable cancellations after acceptance are tracked — 2 in 30 days
              triggers a warning, 3 triggers an account review.
            </p>
          </section>
          <section>
            <h3 className="font-bold text-[var(--color-charcoal)]">3. Pricing & Payment</h3>
            <p>
              ChefMate sets session prices. Your net payout is shown before you accept. Platform fee
              deducted. Payouts processed weekly. Tips are 100% yours.
            </p>
          </section>
          <section>
            <h3 className="font-bold text-[var(--color-charcoal)]">4. Service Standards</h3>
            <p>
              Punctuality, respectful conduct, safe food handling, following the confirmed menu,
              protecting customer property/privacy, and leaving the kitchen clean.
            </p>
          </section>
          <section>
            <h3 className="font-bold text-[var(--color-charcoal)]">5. Non-Circumvention</h3>
            <p>
              No off-platform payment for ChefMate-originated bookings. No direct solicitation of
              ChefMate-introduced customers for 12 months after last booking.
            </p>
          </section>
          <section>
            <h3 className="font-bold text-[var(--color-charcoal)]">6. Enforcement</h3>
            <p>
              Minor issues → warning/retraining. Repeated issues → suspension. Violence, fraud,
              discrimination, intoxication, or serious safety breaches → permanent removal. You may
              request review of any decision.
            </p>
          </section>
          <p className="text-xs text-[var(--color-charcoal)]/40">
            Full agreement:{" "}
            <a href="/legal/chef-agreement" className="underline" target="_blank" rel="noopener">
              /legal/chef-agreement
            </a>
          </p>
        </div>
      );
    case "chef_code_of_conduct":
      return (
        <div className="space-y-4">
          <section>
            <h3 className="font-bold text-[var(--color-charcoal)]">1. Brand Promise</h3>
            <p>
              Arrive prepared, cook safely, respect the home, clean up, leave without creating extra
              work. &ldquo;Dinner is handled.&rdquo;
            </p>
          </section>
          <section>
            <h3 className="font-bold text-[var(--color-charcoal)]">2. Hygiene & Food Safety</h3>
            <p>
              Wash hands, clean clothing, hair restraint. Do not attend if ill. Separate raw/cooked
              foods. Control allergens. Report incidents immediately.
            </p>
          </section>
          <section>
            <h3 className="font-bold text-[var(--color-charcoal)]">3. In the Home</h3>
            <p>
              Use only necessary areas. No unapproved guests. No smoking, vaping, alcohol, or drugs.
              Wash cookware, wipe surfaces, leave kitchen clean. Report breakages.
            </p>
          </section>
          <section>
            <h3 className="font-bold text-[var(--color-charcoal)]">4. Photography</h3>
            <p>
              No photos without explicit customer consent. No children/faces without separate
              consent. No house numbers, security systems, or personal documents.
            </p>
          </section>
          <section>
            <h3 className="font-bold text-[var(--color-charcoal)]">5. Prohibited Conduct</h3>
            <p>
              Violence, harassment, theft, fraud, serious discrimination, intoxication, identity
              sharing, deliberate property damage, or grave food-safety breaches → immediate access
              restriction.
            </p>
          </section>
          <p className="text-xs text-[var(--color-charcoal)]/40">
            Full code:{" "}
            <a href="/legal/code-of-conduct" className="underline" target="_blank" rel="noopener">
              /legal/code-of-conduct
            </a>
          </p>
        </div>
      );
    case "customer_terms":
      return (
        <div className="space-y-4">
          <section>
            <h3 className="font-bold text-[var(--color-charcoal)]">1. Platform Role</h3>
            <p>
              ChefMate connects you with independent chefs. We are not the chef, employer, or
              catering provider.
            </p>
          </section>
          <section>
            <h3 className="font-bold text-[var(--color-charcoal)]">2. Cancellation</h3>
            <p>
              Full refund &gt;24h before. 50% charge 6-24h before. 100% charge within 6h or no-show.
              Full refund if we cancel with no replacement.
            </p>
          </section>
          <section>
            <h3 className="font-bold text-[var(--color-charcoal)]">3. Your Obligations</h3>
            <p>
              Safe kitchen, working appliances, accurate allergy/dietary disclosures. An adult must
              be reachable during the session.
            </p>
          </section>
          <section>
            <h3 className="font-bold text-[var(--color-charcoal)]">4. Allergies</h3>
            <p>
              Disclose all allergies/intolerances before booking. The chef works in your kitchen
              with your ingredients — we cannot guarantee an allergen-free environment.
            </p>
          </section>
          <section>
            <h3 className="font-bold text-[var(--color-charcoal)]">5. Liability</h3>
            <p>
              ChefMate excludes liability for independent chef acts, customer
              ingredients/appliances, and indirect losses, to the extent permitted by law. Consumer
              and privacy rights are preserved.
            </p>
          </section>
          <p className="text-xs text-[var(--color-charcoal)]/40">
            Full terms:{" "}
            <a href="/legal/customer-terms" className="underline" target="_blank" rel="noopener">
              /legal/customer-terms
            </a>
          </p>
        </div>
      );
    case "privacy_policy":
      return (
        <div className="space-y-4">
          <section>
            <h3 className="font-bold text-[var(--color-charcoal)]">1. What We Collect</h3>
            <p>
              Identity, contact, address, payment, dietary/allergy info, booking history, and device
              data. For chefs: also qualifications, certifications, background check, and banking
              details.
            </p>
          </section>
          <section>
            <h3 className="font-bold text-[var(--color-charcoal)]">2. How We Use It</h3>
            <p>
              Account management, matching/bookings, payments, safety/fraud prevention, support,
              legal compliance. Not for unrelated purposes without consent.
            </p>
          </section>
          <section>
            <h3 className="font-bold text-[var(--color-charcoal)]">3. Sharing</h3>
            <p>
              Minimal sharing necessary for bookings. Customers see chef first name, photo, bio,
              ratings. Chefs see customer first name, address, dietary/access info after acceptance.
            </p>
          </section>
          <section>
            <h3 className="font-bold text-[var(--color-charcoal)]">4. Your Rights (POPIA)</h3>
            <p>
              Access, correct, delete, or object to processing of your data. Contact
              privacy@chefmate.co.za.
            </p>
          </section>
          <p className="text-xs text-[var(--color-charcoal)]/40">
            Full policy:{" "}
            <a href="/legal/privacy" className="underline" target="_blank" rel="noopener">
              /legal/privacy
            </a>
          </p>
        </div>
      );
    default:
      return (
        <div className="space-y-4">
          <section>
            <h3 className="font-bold text-[var(--color-charcoal)]">Website Terms</h3>
            <p>
              By using ChefMate, you agree to our platform terms including acceptable use,
              intellectual property, and limitation of liability provisions.
            </p>
          </section>
          <p className="text-xs text-[var(--color-charcoal)]/40">
            Full terms:{" "}
            <a href="/legal/terms" className="underline" target="_blank" rel="noopener">
              /legal/terms
            </a>
          </p>
        </div>
      );
  }
}

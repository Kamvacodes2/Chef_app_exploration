"use client";

import { type FormEvent, useState } from "react";
import {
  availabilityFromRecord,
  updateChefBankDetails,
  updateChefProfile,
  type AvailabilityWindow,
  type ChefProfile,
} from "./api/platformClient";
import { AvailabilityEditor } from "./AvailabilityEditor";
import { ServiceAreaPicker } from "./ServiceAreaPicker";

interface ChefProfileEditorProps {
  readonly profile: ChefProfile;
  readonly onSaved: (profile: ChefProfile) => void;
}

export function ChefProfileEditor({ profile, onSaved }: ChefProfileEditorProps) {
  const initial = availabilityFromRecord(profile.availability);
  const [isAvailable, setIsAvailable] = useState(profile.isAvailable);
  const [serviceAreas, setServiceAreas] = useState<readonly string[]>(profile.serviceAreas);
  const [primaryArea, setPrimaryArea] = useState(
    profile.serviceArea ?? profile.serviceAreas[0] ?? "",
  );
  const [maxTravelKm, setMaxTravelKm] = useState(profile.maxTravelKm || 30);
  const [windows, setWindows] = useState<readonly AvailabilityWindow[]>(initial.windows);
  const [notes, setNotes] = useState(initial.notes);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [busy, setBusy] = useState(false);
  const [bankBusy, setBankBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [bankError, setBankError] = useState<string | null>(null);
  const [bankNotice, setBankNotice] = useState<string | null>(null);

  const save = async (): Promise<void> => {
    setError(null);
    setNotice(null);
    if (serviceAreas.length === 0) {
      setError("Select at least one service area so we know where you can cook.");
      return;
    }
    const hasActiveDays = windows.some((w) => w.days.length > 0);
    if (!hasActiveDays && isAvailable) {
      setError(
        "Please select at least one day of the week in your availability schedule below so you can receive bookings.",
      );
      return;
    }
    setBusy(true);
    try {
      const primary = primaryArea.trim() || serviceAreas[0] || "";
      const updated = await updateChefProfile({
        isAvailable,
        serviceArea: primary || null,
        serviceAreas,
        bio: bio.trim() || null,
        latitude: null,
        longitude: null,
        maxTravelKm,
        availability: { notes, windows },
      });
      setNotice("✓ Profile and availability schedule saved successfully!");
      onSaved(updated);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Chefmate could not save your profile.");
    } finally {
      setBusy(false);
    }
  };

  const saveBank = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const form = event.currentTarget;
    setBankError(null);
    setBankNotice(null);
    setBankBusy(true);
    const formData = new FormData(form);
    try {
      const bankAccount = await updateChefBankDetails({
        accountHolder: text(formData, "accountHolder"),
        bankName: text(formData, "bankName"),
        branchCode: text(formData, "branchCode"),
        accountNumber: text(formData, "accountNumber"),
        accountType: text(formData, "accountType") || null,
      });
      setBankNotice("✓ Bank details updated successfully!");
      onSaved({ ...profile, bankAccount });
    } catch (caught) {
      setBankError(
        caught instanceof Error ? caught.message : "Chefmate could not save your bank details.",
      );
    } finally {
      setBankBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <h2 className="text-2xl font-black text-[var(--color-oxblood)]">Profile & Availability</h2>
        <label className="flex items-center gap-3 text-sm font-bold text-[var(--color-charcoal)]">
          <input
            checked={isAvailable}
            className="h-4 w-4 accent-[var(--color-oxblood)]"
            onChange={(event) => setIsAvailable(event.target.checked)}
            type="checkbox"
          />
          Available for new bookings
        </label>
        <div>
          <p className="mb-2 text-sm font-bold text-[var(--color-charcoal)]">Service areas</p>
          <ServiceAreaPicker error={null} onChange={setServiceAreas} selected={serviceAreas} />
          <label className="mt-3 grid gap-1 text-xs font-bold text-[var(--color-charcoal)]/70">
            Primary service area
            <input
              className="min-h-10 rounded-xl border border-[var(--color-oxblood)]/20 bg-white px-3 text-sm outline-none focus:border-[var(--color-oxblood)]"
              list="primary-area-suggestions"
              onChange={(event) => setPrimaryArea(event.target.value)}
              value={primaryArea}
            />
            <datalist id="primary-area-suggestions">
              {serviceAreas.map((area) => (
                <option key={area} value={area} />
              ))}
            </datalist>
          </label>
        </div>

        <div>
          <p className="mb-2 text-sm font-bold text-[var(--color-charcoal)]">Weekly availability</p>
          <AvailabilityEditor onChange={setWindows} windows={windows} />
          <label className="mt-3 grid gap-1 text-xs font-bold text-[var(--color-charcoal)]/70">
            Availability notes (optional)
            <textarea
              className="min-h-16 w-full rounded-xl border border-[var(--color-oxblood)]/20 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-oxblood)]"
              onChange={(event) => setNotes(event.target.value)}
              placeholder="e.g. Available for lunch sessions on weekends, notice preferred"
              value={notes}
            />
          </label>
        </div>

        <label className="grid gap-1 text-sm font-bold text-[var(--color-charcoal)]">
          Max travel distance (km)
          <input
            className="min-h-10 rounded-xl border border-[var(--color-oxblood)]/20 bg-white px-3 text-sm outline-none focus:border-[var(--color-oxblood)]"
            min={1}
            onChange={(event) => setMaxTravelKm(Math.max(1, Number(event.target.value) || 30))}
            type="number"
            value={maxTravelKm}
          />
        </label>

        <label className="grid gap-1 text-sm font-bold text-[var(--color-charcoal)]">
          Bio (shown to customers)
          <textarea
            className="min-h-20 w-full rounded-xl border border-[var(--color-oxblood)]/20 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-oxblood)]"
            onChange={(event) => setBio(event.target.value)}
            value={bio}
          />
        </label>

        {notice ? (
          <p
            className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900 shadow-sm"
            role="status"
          >
            {notice}
          </p>
        ) : null}

        {error ? (
          <p
            className="rounded-xl border border-[var(--color-terracotta)]/35 bg-[var(--color-terracotta)]/10 px-3 py-2 text-sm font-medium text-[var(--color-oxblood)]"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <button
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-oxblood)] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 transition hover:bg-[var(--color-oxblood)]/90"
          disabled={busy}
          type="submit"
        >
          {busy ? "Saving..." : "Save profile & availability"}
        </button>
      </form>

      <section className="rounded-2xl border border-[var(--color-oxblood)]/10 p-5">
        <h3 className="text-lg font-black text-[var(--color-oxblood)]">Bank details</h3>
        {profile.bankAccount ? (
          <p className="mt-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
            {profile.bankAccount.bankName} account ending {profile.bankAccount.accountNumberLast4}
          </p>
        ) : null}
        <form className="mt-4 grid gap-3" onSubmit={saveBank}>
          <label className="grid gap-1 text-sm font-bold text-[var(--color-charcoal)]">
            Account holder
            <input
              className="min-h-10 rounded-xl border border-[var(--color-oxblood)]/20 px-3 text-sm"
              defaultValue={profile.bankAccount?.accountHolder ?? ""}
              name="accountHolder"
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-bold text-[var(--color-charcoal)]">
            Bank name
            <input
              className="min-h-10 rounded-xl border border-[var(--color-oxblood)]/20 px-3 text-sm"
              defaultValue={profile.bankAccount?.bankName ?? ""}
              name="bankName"
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-bold text-[var(--color-charcoal)]">
            Branch code
            <input
              className="min-h-10 rounded-xl border border-[var(--color-oxblood)]/20 px-3 text-sm"
              defaultValue={profile.bankAccount?.branchCode ?? ""}
              name="branchCode"
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-bold text-[var(--color-charcoal)]">
            Account number
            <input
              className="min-h-10 rounded-xl border border-[var(--color-oxblood)]/20 px-3 text-sm"
              name="accountNumber"
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-bold text-[var(--color-charcoal)]">
            Account type
            <input
              className="min-h-10 rounded-xl border border-[var(--color-oxblood)]/20 px-3 text-sm"
              defaultValue={profile.bankAccount?.accountType ?? ""}
              name="accountType"
            />
          </label>
          {bankNotice ? (
            <p
              className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900 shadow-sm"
              role="status"
            >
              {bankNotice}
            </p>
          ) : null}
          {bankError ? (
            <p
              className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-900"
              role="alert"
            >
              {bankError}
            </p>
          ) : null}
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--color-oxblood)] px-4 text-sm font-bold text-[var(--color-oxblood)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={bankBusy}
            type="submit"
          >
            {bankBusy ? "Saving bank details..." : "Save bank details"}
          </button>
        </form>
      </section>
    </div>
  );
}

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

"use client";

import { type FormEvent, useEffect, useState } from "react";
import {
  fetchChefProfile,
  updateChefProfile,
  updateChefBankDetails,
  type ChefProfile,
} from "@/features/platform/api/platformClient";

export function ChefProfilePage() {
  const [profile, setProfile] = useState<ChefProfile | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setBusy("load");
    setError(null);
    try {
      const p = await fetchChefProfile();
      setProfile(p);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Load failed");
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const run = async (name: string, action: () => Promise<void>) => {
    setBusy(name);
    setNotice(null);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await run("profile", async () => {
      const updated = await updateChefProfile({
        isAvailable: formData.get("isAvailable") === "on",
        serviceArea: textOrNull(formData, "serviceArea"),
        serviceAreas: splitCsv(text(formData, "serviceAreas")),
        bio: textOrNull(formData, "bio"),
        latitude: null,
        longitude: null,
        maxTravelKm: Math.max(1, Number(formData.get("maxTravelKm") ?? 30)),
        availability: textOrNull(formData, "availabilityNotes")
          ? { notes: textOrNull(formData, "availabilityNotes") }
          : null,
      });
      setProfile(updated);
      setNotice("Profile saved.");
    });
  };

  const saveBank = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await run("bank", async () => {
      const bankAccount = await updateChefBankDetails({
        accountHolder: text(formData, "accountHolder"),
        bankName: text(formData, "bankName"),
        branchCode: text(formData, "branchCode"),
        accountNumber: text(formData, "accountNumber"),
        accountType: textOrNull(formData, "accountType"),
      });
      setProfile((prev) => (prev ? { ...prev, bankAccount } : prev));
      setNotice("Bank details saved.");
    });
  };

  if (busy === "load") {
    return (
      <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-[var(--color-charcoal)]/75">
        Loading profile...
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {notice ? (
        <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-900">{error}</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile form */}
        <section className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
          <h2 className="text-2xl font-black text-[var(--color-oxblood)]">
            Profile & Availability
          </h2>
          <form
            className="mt-5 grid gap-4"
            key={profile?.updatedAt ?? "profile"}
            onSubmit={saveProfile}
          >
            <label className="flex items-center gap-3 text-sm font-bold text-[var(--color-charcoal)]">
              <input
                defaultChecked={profile?.isAvailable ?? false}
                name="isAvailable"
                type="checkbox"
              />
              Available for new bookings
            </label>
            <label className="block text-sm font-bold text-[var(--color-charcoal)]">
              Primary service area
              <input
                className="mt-2 min-h-12 w-full rounded-2xl border border-[var(--color-oxblood)]/15 px-4 text-base"
                defaultValue={profile?.serviceArea ?? ""}
                name="serviceArea"
              />
            </label>
            <label className="block text-sm font-bold text-[var(--color-charcoal)]">
              Service areas (comma-separated)
              <input
                className="mt-2 min-h-12 w-full rounded-2xl border border-[var(--color-oxblood)]/15 px-4 text-base"
                defaultValue={(profile?.serviceAreas ?? []).join(", ")}
                name="serviceAreas"
              />
            </label>
            <label className="block text-sm font-bold text-[var(--color-charcoal)]">
              Max travel distance (km)
              <input
                className="mt-2 min-h-12 w-full rounded-2xl border border-[var(--color-oxblood)]/15 px-4 text-base"
                defaultValue={profile?.maxTravelKm ?? 30}
                min={1}
                name="maxTravelKm"
                type="number"
              />
            </label>
            <label className="block text-sm font-bold text-[var(--color-charcoal)]">
              Bio
              <textarea
                className="mt-2 min-h-28 w-full rounded-2xl border border-[var(--color-oxblood)]/15 px-4 py-3 text-base"
                defaultValue={profile?.bio ?? ""}
                name="bio"
              />
            </label>
            <label className="block text-sm font-bold text-[var(--color-charcoal)]">
              Availability notes
              <textarea
                className="mt-2 min-h-28 w-full rounded-2xl border border-[var(--color-oxblood)]/15 px-4 py-3 text-base"
                defaultValue={
                  profile?.availability
                    ? String((profile.availability as Record<string, unknown>).notes ?? "")
                    : ""
                }
                name="availabilityNotes"
              />
            </label>
            <button
              className="min-h-10 rounded-xl bg-[var(--color-oxblood)] px-4 text-sm font-bold text-white disabled:opacity-50"
              disabled={busy === "profile"}
              type="submit"
            >
              Save Profile
            </button>
          </form>
        </section>

        {/* Bank details form */}
        <section className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
          <h2 className="text-2xl font-black text-[var(--color-oxblood)]">Bank Details</h2>
          {profile?.bankAccount ? (
            <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
              Current payout account: {profile.bankAccount.bankName} ending{" "}
              {profile.bankAccount.accountNumberLast4}
            </p>
          ) : null}
          <form
            className="mt-5 grid gap-4"
            key={profile?.bankAccount?.updatedAt ?? "bank"}
            onSubmit={saveBank}
          >
            <label className="block text-sm font-bold text-[var(--color-charcoal)]">
              Account holder
              <input
                className="mt-2 min-h-12 w-full rounded-2xl border border-[var(--color-oxblood)]/15 px-4 text-base"
                defaultValue={profile?.bankAccount?.accountHolder ?? ""}
                name="accountHolder"
                required
              />
            </label>
            <label className="block text-sm font-bold text-[var(--color-charcoal)]">
              Bank name
              <input
                className="mt-2 min-h-12 w-full rounded-2xl border border-[var(--color-oxblood)]/15 px-4 text-base"
                defaultValue={profile?.bankAccount?.bankName ?? ""}
                name="bankName"
                required
              />
            </label>
            <label className="block text-sm font-bold text-[var(--color-charcoal)]">
              Branch code
              <input
                className="mt-2 min-h-12 w-full rounded-2xl border border-[var(--color-oxblood)]/15 px-4 text-base"
                defaultValue={profile?.bankAccount?.branchCode ?? ""}
                name="branchCode"
                required
              />
            </label>
            <label className="block text-sm font-bold text-[var(--color-charcoal)]">
              Account number
              <input
                className="mt-2 min-h-12 w-full rounded-2xl border border-[var(--color-oxblood)]/15 px-4 text-base"
                name="accountNumber"
                required
              />
            </label>
            <label className="block text-sm font-bold text-[var(--color-charcoal)]">
              Account type
              <input
                className="mt-2 min-h-12 w-full rounded-2xl border border-[var(--color-oxblood)]/15 px-4 text-base"
                defaultValue={profile?.bankAccount?.accountType ?? ""}
                name="accountType"
              />
            </label>
            <button
              className="min-h-10 rounded-xl bg-[var(--color-oxblood)] px-4 text-sm font-bold text-white disabled:opacity-50"
              disabled={busy === "bank"}
              type="submit"
            >
              Save Bank Details
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function textOrNull(formData: FormData, name: string): string | null {
  const value = text(formData, name);
  return value || null;
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

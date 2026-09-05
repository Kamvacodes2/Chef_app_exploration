"use client";

import { type FormEvent, useState } from "react";
import {
  availabilityFromRecord,
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
  const [error, setError] = useState<string | null>(null);

  const save = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    if (serviceAreas.length === 0) {
      setError("Select at least one service area so we know where you can cook.");
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
      onSaved(updated);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Chefmate could not save your profile.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="mt-5 grid gap-5" onSubmit={save}>
      <label className="flex items-center gap-3 rounded-2xl border border-[var(--color-oxblood)]/10 bg-[var(--color-warm-cream)] p-4 text-sm font-bold">
        <input
          checked={isAvailable}
          className="h-5 w-5 accent-[var(--color-oxblood)]"
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

      {error ? (
        <p
          className="rounded-xl border border-[var(--color-terracotta)]/35 bg-[var(--color-terracotta)]/10 px-3 py-2 text-sm font-medium text-[var(--color-oxblood)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <button
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-oxblood)] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={busy}
        type="submit"
      >
        {busy ? "Saving..." : "Save profile & availability"}
      </button>
    </form>
  );
}

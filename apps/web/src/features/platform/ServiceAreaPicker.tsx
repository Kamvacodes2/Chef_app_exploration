"use client";

import { useState } from "react";

/**
 * Seed catalogue of Greater Gauteng regions and their suburbs. Regions are
 * organizational: clicking a region toggles every suburb under it, and the
 * saved payload is the suburb list (plus one primary suburb).
 */
export const SERVICE_AREA_CATALOGUE: readonly {
  readonly region: string;
  readonly suburbs: readonly string[];
}[] = [
  {
    region: "Johannesburg North",
    suburbs: [
      "Fourways",
      "Sandton",
      "Randburg",
      "Craighall",
      "Hyde Park",
      "Dainfern",
      "Lonehill",
      "Bryanston",
      "Rivonia",
      "Sunninghill",
    ],
  },
  {
    region: "Johannesburg Central",
    suburbs: [
      "Rosebank",
      "Melville",
      "Parktown",
      "Houghton",
      "Norwood",
      "Orange Grove",
      "Kensington",
      "Maboneng",
    ],
  },
  {
    region: "Midrand",
    suburbs: ["Midrand", "Waterfall", "Polofields", "Kyalami", "Vorna Valley", "Halfway House"],
  },
  {
    region: "Greater Pretoria",
    suburbs: ["Centurion", "Menlyn", "Brooklyn", "Hatfield", "Pretoria East", "Pretoria CBD"],
  },
  {
    region: "East Rand",
    suburbs: ["Bedfordview", "Edenvale", "Boksburg", "Benoni", "Kempton Park"],
  },
  {
    region: "West Rand",
    suburbs: ["Roodepoort", "Krugersdorp", "Randfontein"],
  },
  {
    region: "Johannesburg South",
    suburbs: ["Soweto", "Alberton", "Germiston"],
  },
];

const REGION_LABELS: Record<string, string> = {
  "Johannesburg North": "JHB North",
  "Johannesburg Central": "JHB Central",
  "Johannesburg South": "JHB South",
};

interface ServiceAreaPickerProps {
  readonly selected: readonly string[];
  readonly onChange: (suburbs: readonly string[]) => void;
  readonly error?: string | null;
}

export function ServiceAreaPicker({ selected, onChange, error }: ServiceAreaPickerProps) {
  const [custom, setCustom] = useState("");
  const [expandedRegion, setExpandedRegion] = useState<string | null>(
    SERVICE_AREA_CATALOGUE[0]?.region ?? null,
  );

  const selectedSet = new Set(selected);

  const toggleSuburb = (suburb: string): void => {
    const next = new Set(selectedSet);
    if (next.has(suburb)) next.delete(suburb);
    else next.add(suburb);
    onChange([...next]);
  };

  const toggleRegion = (region: string): void => {
    const suburbs = SERVICE_AREA_CATALOGUE.find((entry) => entry.region === region)?.suburbs ?? [];
    const allPicked = suburbs.length > 0 && suburbs.every((suburb) => selectedSet.has(suburb));
    const next = new Set(selectedSet);
    for (const suburb of suburbs) {
      if (allPicked) next.delete(suburb);
      else next.add(suburb);
    }
    onChange([...next]);
  };

  const addCustom = (): void => {
    const value = custom.trim();
    if (!value || selectedSet.has(value)) {
      setCustom("");
      return;
    }
    onChange([...selected, value]);
    setCustom("");
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-[var(--color-charcoal)]/55">
        Tap a region to pick all its suburbs, or tap individual suburbs. Tap again to remove.
      </p>

      <div className="flex flex-wrap gap-2">
        {SERVICE_AREA_CATALOGUE.map((entry) => {
          const count = entry.suburbs.filter((suburb) => selectedSet.has(suburb)).length;
          const all = count === entry.suburbs.length && entry.suburbs.length > 0;
          return (
            <button
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                all
                  ? "border-[var(--color-oxblood)] bg-[var(--color-oxblood)] text-white"
                  : count > 0
                    ? "border-[var(--color-terracotta)] bg-[var(--color-terracotta)]/10 text-[var(--color-oxblood)]"
                    : "border-[var(--color-oxblood)]/20 text-[var(--color-charcoal)]/70 hover:border-[var(--color-oxblood)]/50"
              }`}
              key={entry.region}
              onClick={() => toggleRegion(entry.region)}
              type="button"
            >
              {(REGION_LABELS[entry.region] ?? entry.region).toUpperCase()}
              {count > 0 ? ` (${count})` : ""}
            </button>
          );
        })}
      </div>

      {expandedRegion ? (
        <div className="rounded-2xl border border-[var(--color-oxblood)]/10 bg-[var(--color-warm-cream)] p-3">
          <p className="text-xs font-bold text-[var(--color-oxblood)]">
            {expandedRegion} — tap suburbs
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SERVICE_AREA_CATALOGUE.find((entry) => entry.region === expandedRegion)?.suburbs.map(
              (suburb) => {
                const active = selectedSet.has(suburb);
                return (
                  <button
                    aria-pressed={active}
                    className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                      active
                        ? "border-[var(--color-oxblood)] bg-[var(--color-oxblood)] text-white"
                        : "border-[var(--color-oxblood)]/20 bg-white text-[var(--color-charcoal)]/80 hover:border-[var(--color-oxblood)]/50"
                    }`}
                    key={suburb}
                    onClick={() => toggleSuburb(suburb)}
                    type="button"
                  >
                    {suburb}
                  </button>
                );
              },
            )}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="block text-xs font-bold text-[var(--color-charcoal)]/70">
          Area not listed? Add your own
          <input
            className="mt-1 min-h-10 w-full rounded-xl border border-[var(--color-oxblood)]/20 bg-white px-3 text-sm outline-none focus:border-[var(--color-oxblood)]"
            onChange={(event) => setCustom(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addCustom();
              }
            }}
            placeholder="e.g. Muldersdrift"
            value={custom}
          />
        </label>
        <button
          className="self-end rounded-xl border border-[var(--color-oxblood)]/25 px-4 py-2 text-sm font-bold text-[var(--color-oxblood)] hover:bg-[var(--color-warm-cream)]"
          onClick={addCustom}
          type="button"
        >
          Add area
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {selected.map((suburb) => (
          <button
            aria-pressed
            className="inline-flex items-center gap-1 rounded-full bg-[var(--color-oxblood)] px-3 py-1.5 text-sm font-bold text-white"
            key={suburb}
            onClick={() => toggleSuburb(suburb)}
            type="button"
          >
            {suburb}
            <span aria-hidden="true">×</span>
          </button>
        ))}
        {selected.length === 0 ? (
          <p className="text-sm text-[var(--color-charcoal)]/60">No service areas selected yet.</p>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm font-medium text-[var(--color-oxblood)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

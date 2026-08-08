"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/ui/StatCard";

interface CampaignDashboard {
  totalLeads: number;
  completedForms: number;
  tokensIssued: number;
  bookingsLinked: number;
  offersRedeemed: number;
  leadsBySource: Record<string, number>;
  leadsByAgeRange: Record<string, number>;
  leadsBySuburb: Record<string, number>;
  leadsByHouseholdType: Record<string, number>;
  topPainPoints: Record<string, number>;
  topPriorities: Record<string, number>;
}

export function CampaignDashboardPage() {
  const [data, setData] = useState<CampaignDashboard | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(
          "/api/v1/operations/campaign/dashboard?campaignCode=womens_month_2026",
          { credentials: "include" },
        );
        if (!res.ok) throw new Error("Failed to load");
        const json = await res.json();
        setData(json.data);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Load failed");
      } finally {
        setBusy(false);
      }
    })();
  }, []);

  if (busy) {
    return (
      <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-[var(--color-charcoal)]/75">
        Loading campaign dashboard...
      </p>
    );
  }
  if (error) {
    return <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-900">{error}</p>;
  }
  if (!data) return null;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
        <h2 className="text-2xl font-black text-[var(--color-oxblood)]">
          Women&apos;s Month 2026 — Campaign Dashboard
        </h2>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard label="Total Leads" value={data.totalLeads} />
          <StatCard label="Forms Completed" value={data.completedForms} />
          <StatCard label="Tokens Issued" value={data.tokensIssued} />
          <StatCard label="Bookings" value={data.bookingsLinked} />
          <StatCard label="Redeemed" value={data.offersRedeemed} valueColor="text-emerald-700" />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <BarSection title="Leads by Source" data={data.leadsBySource} />
        <BarSection title="Leads by Age Range" data={data.leadsByAgeRange} />
        <BarSection title="Leads by Suburb" data={data.leadsBySuburb} />
        <BarSection title="Leads by Household Type" data={data.leadsByHouseholdType} />
        <BarSection title="Top Pain Points" data={data.topPainPoints} />
        <BarSection title="Top Priorities" data={data.topPriorities} />
      </div>
    </div>
  );
}

function BarSection({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
  const max = entries[0]?.[1] ?? 1;

  return (
    <section className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
      <h3 className="text-lg font-black text-[var(--color-oxblood)]">{title}</h3>
      <div className="mt-4 space-y-2">
        {entries.length === 0 ? (
          <p className="text-sm text-[var(--color-charcoal)]/50">No data yet</p>
        ) : (
          entries.map(([key, value]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="w-32 shrink-0 truncate text-xs text-[var(--color-charcoal)]/70">
                {key === "unknown" ? "Unknown" : key.replace(/_/g, " ")}
              </span>
              <div className="flex-1">
                <div className="h-5 rounded-full bg-[var(--color-oxblood)]/20">
                  <div
                    className="h-5 rounded-full bg-[var(--color-oxblood)] transition-all"
                    style={{
                      width: `${Math.max((value / max) * 100, 4)}%`,
                    }}
                  />
                </div>
              </div>
              <span className="w-8 text-right text-xs font-bold text-[var(--color-charcoal)]">
                {value}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

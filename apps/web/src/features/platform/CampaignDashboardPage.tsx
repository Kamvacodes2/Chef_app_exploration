"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/ui/StatCard";
import { fetchCampaignLeads, type CampaignLead } from "@/features/platform/api/platformClient";

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

const CAMPAIGN_CODE = "womens_month_2026";

function formatLabel(key: string): string {
  if (key === "unknown") return "Unknown";
  return key.replace(/_/g, " ");
}

export function CampaignDashboardPage() {
  const [data, setData] = useState<CampaignDashboard | null>(null);
  const [leads, setLeads] = useState<CampaignLead[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [dashRes, leadsRes] = await Promise.all([
          fetch(`/api/v1/operations/campaign/dashboard?campaignCode=${CAMPAIGN_CODE}`, {
            credentials: "include",
          }),
          fetchCampaignLeads(CAMPAIGN_CODE),
        ]);
        if (!dashRes.ok) throw new Error("Failed to load dashboard");
        const json = await dashRes.json();
        setData(json.data);
        setLeads(leadsRes);
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

      {/* Individual leads table */}
      <section className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
        <h3 className="text-lg font-black text-[var(--color-oxblood)]">
          All Leads ({leads.length})
        </h3>
        {leads.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--color-charcoal)]/50">No leads yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--color-oxblood)]/10">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--color-oxblood)]/10 bg-[var(--color-warm-cream)]/50 text-xs uppercase text-[var(--color-charcoal)]/50">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Contact</th>
                  <th className="px-3 py-2">Suburb</th>
                  <th className="px-3 py-2">Age</th>
                  <th className="px-3 py-2">Household</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Opt-ins</th>
                  <th className="px-3 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-[var(--color-oxblood)]/5 last:border-0 hover:bg-[var(--color-warm-cream)]/30"
                  >
                    <td className="px-3 py-2 font-semibold text-[var(--color-charcoal)]">
                      {lead.firstName ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-[var(--color-charcoal)]/70">
                      <div className="text-xs">
                        {lead.email && <div>{lead.email}</div>}
                        {lead.mobileNumber && <div>{lead.mobileNumber}</div>}
                        {!lead.email && !lead.mobileNumber && "—"}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-[var(--color-charcoal)]/70">
                      {lead.suburb ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-[var(--color-charcoal)]/70">
                      {lead.ageRange ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-[var(--color-charcoal)]/70">
                      {formatLabel(lead.householdType ?? "—")}
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-[var(--color-oxblood)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--color-oxblood)]">
                        {lead.utmSource ?? lead.selfReportedSource ?? "Unknown"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          lead.status === "OFFER_REDEEMED"
                            ? "bg-emerald-100 text-emerald-800"
                            : lead.status === "TOKEN_ISSUED"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {formatLabel(lead.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 text-[10px]">
                        {lead.marketingEmailOptIn && (
                          <span className="rounded bg-green-100 px-1 py-0.5 text-green-700">
                            Email
                          </span>
                        )}
                        {lead.marketingWhatsappOptIn && (
                          <span className="rounded bg-green-100 px-1 py-0.5 text-green-700">
                            WA
                          </span>
                        )}
                        {lead.marketingSmsOptIn && (
                          <span className="rounded bg-green-100 px-1 py-0.5 text-green-700">
                            SMS
                          </span>
                        )}
                        {!lead.marketingEmailOptIn &&
                          !lead.marketingWhatsappOptIn &&
                          !lead.marketingSmsOptIn &&
                          "—"}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-[var(--color-charcoal)]/50">
                      {new Date(lead.createdAt).toLocaleDateString("en-ZA", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
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
                {formatLabel(key)}
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

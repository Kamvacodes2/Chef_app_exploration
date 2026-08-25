"use client";

import { useEffect, useState } from "react";
import {
  fetchDiscountCampaignReport,
  type DiscountCampaignReportRow,
} from "@/features/platform/api/platformClient";

function formatZar(cents: number): string {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(cents / 100);
}

function campaignStatus(row: DiscountCampaignReportRow): string {
  if (!row.campaign.active) return "Inactive";
  const now = Date.now();
  if (row.campaign.startsAt && new Date(row.campaign.startsAt).getTime() > now) return "Scheduled";
  if (row.campaign.endsAt && new Date(row.campaign.endsAt).getTime() < now) return "Expired";
  return "Active";
}

function campaignDates(row: DiscountCampaignReportRow): string {
  const format = (iso: string | null): string =>
    iso ? new Date(iso).toLocaleDateString("en-ZA") : "—";
  return `${format(row.campaign.startsAt)} → ${format(row.campaign.endsAt)}`;
}

export function DiscountCampaignsPage() {
  const [rows, setRows] = useState<DiscountCampaignReportRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchDiscountCampaignReport()
      .then((report) => {
        if (!cancelled) setRows(report);
      })
      .catch((caught: unknown) => {
        if (!cancelled)
          setError(caught instanceof Error ? caught.message : "Could not load campaigns.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-900">{error}</p>;
  }
  if (!rows) {
    return <p className="text-sm text-[var(--color-charcoal)]/60">Loading campaigns…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black text-[var(--color-oxblood)]">
          Discount Campaigns
        </h1>
        <p className="mt-1 text-sm text-[var(--color-charcoal)]/60">
          Campaign-driven coupon codes. Redemption and revenue are computed from verified bookings.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-sm text-[var(--color-charcoal)]/60">
          No campaigns yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-oxblood)]/10 text-xs uppercase tracking-wide text-[var(--color-charcoal)]/50">
                <th className="px-4 py-3 font-bold">Campaign</th>
                <th className="px-4 py-3 font-bold">Code</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Active Dates</th>
                <th className="px-4 py-3 font-bold">Plans</th>
                <th className="px-4 py-3 font-bold">Redemptions</th>
                <th className="px-4 py-3 font-bold">Gross Revenue</th>
                <th className="px-4 py-3 font-bold">Discount Issued</th>
                <th className="px-4 py-3 font-bold">Net Collected</th>
                <th className="px-4 py-3 font-bold">Platform-Funded</th>
                <th className="px-4 py-3 font-bold">Avg Order</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.campaign.id} className="border-b border-[var(--color-oxblood)]/5">
                  <td className="px-4 py-3">
                    <p className="font-bold text-[var(--color-charcoal)]">{row.campaign.name}</p>
                    <p className="text-xs text-[var(--color-charcoal)]/50">
                      {row.campaign.discountType === "PERCENTAGE"
                        ? `${row.campaign.discountValue}%`
                        : formatZar(row.campaign.discountValue * 100)}
                      {row.campaign.firstPaymentOnly ? " · first payment only" : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-[var(--color-oxblood)]">
                    {row.campaign.code}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        campaignStatus(row) === "Active"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {campaignStatus(row)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-charcoal)]/70">
                    {campaignDates(row)}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-charcoal)]/70">
                    {row.campaign.planSlugs.join(", ") || "All plans"}
                  </td>
                  <td className="px-4 py-3 font-bold">{row.redemptionCount}</td>
                  <td className="px-4 py-3">{formatZar(row.grossRevenueCents)}</td>
                  <td className="px-4 py-3 text-[var(--color-oxblood)]">
                    −{formatZar(row.discountIssuedCents)}
                  </td>
                  <td className="px-4 py-3 font-bold">{formatZar(row.netRevenueCents)}</td>
                  <td className="px-4 py-3 text-[var(--color-oxblood)]">
                    {formatZar(row.platformDiscountCostCents)}
                  </td>
                  <td className="px-4 py-3">{formatZar(row.averageOrderValueCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

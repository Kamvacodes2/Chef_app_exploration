"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/ui/StatCard";
import { fetchChefEarnings, type ChefEarningsSummary } from "./api/platformClient";

function formatZar(cents: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(cents / 100);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(value));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ChefEarnings() {
  const [summary, setSummary] = useState<ChefEarningsSummary | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await fetchChefEarnings();
      setSummary(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load earnings summary");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (busy) {
    return (
      <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-[var(--color-charcoal)]/75">
        Loading earnings summary...
      </p>
    );
  }

  if (error || !summary) {
    return (
      <div className="rounded-2xl bg-red-50 p-6 text-sm text-red-900">
        <p className="font-bold">Could not load earnings</p>
        <p className="mt-1">{error ?? "Unknown error"}</p>
        <button
          className="mt-4 rounded-xl bg-[var(--color-oxblood)] px-4 py-2 text-xs font-bold text-white"
          onClick={() => void load()}
          type="button"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black text-[var(--color-oxblood)]">Chef Earnings</h2>
            <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">
              Your payout history and completed booking earnings.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3.5 py-1 text-xs font-bold text-amber-900">
            <span>🗓️</span> Payouts settled every Monday
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <StatCard
            label="Total Earned"
            value={formatZar(summary.totalEarnedCents)}
            valueColor="text-emerald-700"
          />
          <StatCard
            label="Pending Payout"
            value={formatZar(summary.pendingPayoutCents)}
            valueColor="text-amber-600"
          />
          <StatCard
            label="Paid Out"
            value={formatZar(summary.paidOutCents)}
            valueColor="text-[var(--color-charcoal)]"
          />
        </div>

        <div className="mt-6 rounded-2xl border border-[var(--color-oxblood)]/10 bg-[var(--color-warm-cream)]/50 p-4 text-xs text-[var(--color-charcoal)]/80 sm:text-sm">
          <p className="font-bold text-[var(--color-oxblood)]">💡 How Payouts Work</p>
          <p className="mt-1">
            Whenever you complete a visit, your earnings are credited immediately as{" "}
            <strong>Pending Payout</strong>. For subscription packages, earnings are paid per
            completed session visit rather than as an upfront lump sum. Every Monday, Chefmate
            settles all pending balances directly into your verified bank account via EFT.
          </p>
        </div>
      </section>

      {/* Earnings breakdown by booking */}
      <section className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
        <h3 className="text-lg font-black text-[var(--color-oxblood)]">Visit Earnings Ledger</h3>
        <p className="mt-1 text-xs text-[var(--color-charcoal)]/60">
          Itemized earnings from each booking visit you have completed.
        </p>

        {summary.items.length === 0 ? (
          <p className="mt-6 rounded-2xl bg-[var(--color-warm-cream)] p-4 text-sm text-[var(--color-charcoal)]/70">
            No completed earnings yet. Once you complete bookings, your earnings ledger will appear
            here.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-oxblood)]/10 text-xs uppercase tracking-wider text-[var(--color-charcoal)]/50">
                  <th className="py-3 px-2 font-bold">Booking</th>
                  <th className="py-3 px-2 font-bold">Meal / Area</th>
                  <th className="py-3 px-2 font-bold">Visit Date</th>
                  <th className="py-3 px-2 font-bold">Earnings</th>
                  <th className="py-3 px-2 font-bold">Status</th>
                  <th className="py-3 px-2 font-bold">Settlement Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-oxblood)]/5">
                {summary.items.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--color-warm-cream)]/20 transition">
                    <td className="py-3 px-2 font-mono text-xs font-bold text-[var(--color-charcoal)]">
                      <div>{item.bookingReference}</div>
                      {item.bookingType === "SUBSCRIPTION" ? (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-black text-purple-900 border border-purple-200">
                          🔄 First session of repeat
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 px-2">
                      <div className="font-bold text-[var(--color-charcoal)]">{item.mainName}</div>
                      <div className="text-xs text-[var(--color-charcoal)]/60">
                        {item.serviceArea ?? "Area pending"}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-xs text-[var(--color-charcoal)]/80">
                      {formatDate(item.scheduledDate)} ({item.timeSlot})
                    </td>
                    <td className="py-3 px-2">
                      <div className="font-black text-emerald-800">
                        {formatZar(item.chefPayoutCents)}
                      </div>
                      {item.bookingType === "SUBSCRIPTION" ? (
                        <div className="text-[10px] font-medium text-[var(--color-charcoal)]/60">
                          Per session visit
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 px-2">
                      {item.status === "PAID" ? (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-black text-emerald-800">
                          ✓ Paid
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-800">
                          Pending Monday Payout
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-xs text-[var(--color-charcoal)]/70">
                      {item.payoutReference ? (
                        <span className="font-mono">{item.payoutReference}</span>
                      ) : (
                        <span className="italic text-[var(--color-charcoal)]/40">
                          Scheduled {item.payoutProcessingDate}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Historical settled payouts */}
      {summary.payouts.length > 0 ? (
        <section className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
          <h3 className="text-lg font-black text-[var(--color-oxblood)]">Settled Payouts</h3>
          <p className="mt-1 text-xs text-[var(--color-charcoal)]/60">
            Bank transfers processed to your bank account.
          </p>

          <div className="mt-4 space-y-3">
            {summary.payouts.map((payout) => (
              <div
                key={payout.id}
                className="flex items-center justify-between rounded-2xl border border-[var(--color-oxblood)]/10 p-4"
              >
                <div>
                  <p className="font-mono text-xs font-bold uppercase text-[var(--color-charcoal)]/50">
                    Ref: {payout.payoutReference}
                  </p>
                  <p className="mt-1 text-sm font-bold text-[var(--color-charcoal)]">
                    Paid on {formatDateTime(payout.paidAt)} · {payout.earningCount} visit
                    {payout.earningCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <p className="text-base font-black text-emerald-800">
                  {formatZar(payout.totalCents)}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

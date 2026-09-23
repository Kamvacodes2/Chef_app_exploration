"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/ui/StatCard";
import {
  fetchFinanceSummary,
  fetchPendingChefPayouts,
  settleChefPayout,
  type FinanceSummary,
  type PendingChefPayout,
} from "./api/platformClient";

function formatZar(cents: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(cents / 100);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(value));
}

function defaultReference(chefName: string): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const cleanName = chefName
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 8);
  return `EFT-${dateStr}-${cleanName || "CHEF"}`;
}

export function AdminFinancePage() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [pendingPayouts, setPendingPayouts] = useState<readonly PendingChefPayout[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Settle modal/form state
  const [settlingChef, setSettlingChef] = useState<PendingChefPayout | null>(null);
  const [payoutReference, setPayoutReference] = useState("");
  const [settleBusy, setSettleBusy] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);

  const load = async () => {
    setBusy(true);
    setError(null);
    try {
      const [s, p] = await Promise.all([fetchFinanceSummary(), fetchPendingChefPayouts()]);
      setSummary(s);
      setPendingPayouts(p);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load finance data");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openSettle = (payout: PendingChefPayout) => {
    setSettlingChef(payout);
    setPayoutReference(defaultReference(payout.cookDisplayName));
    setSettleError(null);
  };

  const handleConfirmSettle = async () => {
    if (!settlingChef) return;
    if (!payoutReference.trim()) {
      setSettleError(
        "Please provide a bank payout reference (e.g. EFT batch or transfer reference).",
      );
      return;
    }
    setSettleBusy(true);
    setSettleError(null);
    try {
      const settled = await settleChefPayout(settlingChef.cookUserId, {
        payoutReference: payoutReference.trim(),
      });
      setNotice(
        `Successfully confirmed payout of ${formatZar(settled.totalCents)} to ${settlingChef.cookDisplayName} (Ref: ${settled.payoutReference}).`,
      );
      setSettlingChef(null);
      await load();
    } catch (caught) {
      setSettleError(
        caught instanceof Error ? caught.message : "Failed to confirm chef payout settlement.",
      );
    } finally {
      setSettleBusy(false);
    }
  };

  if (busy && !summary) {
    return (
      <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-[var(--color-charcoal)]/75">
        Loading finance & payouts...
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {notice ? (
        <div
          className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 shadow-sm"
          role="status"
        >
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-900" role="alert">
          {error}
        </div>
      ) : null}

      {/* Header & KPI Summary */}
      <section className="rounded-3xl bg-white p-4 sm:p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-[var(--color-oxblood)] sm:text-2xl">
              Finance & Chef Payouts
            </h2>
            <p className="mt-1 text-xs text-[var(--color-charcoal)]/70 sm:text-sm">
              Weekly Monday payouts ledger, customer collections, and platform revenue.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-900">
            <span>🏦</span> Monday Payout Cycle Active
          </span>
        </div>

        {summary ? (
          <div className="mt-6 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-5">
            <StatCard
              label="Pending Chef Payable"
              value={formatZar(summary.chefPayableCents)}
              valueColor="text-amber-600"
            />
            <StatCard
              label="Chef Paid Out"
              value={formatZar(summary.chefPaidCents)}
              valueColor="text-emerald-700"
            />
            <StatCard
              label="Customer Collections"
              value={formatZar(summary.customerCollectedCents)}
              valueColor="text-[var(--color-oxblood)]"
            />
            <StatCard
              label="Pending Collections"
              value={formatZar(summary.customerOutstandingCents)}
            />
            <div className="col-span-2 sm:col-span-1">
              <StatCard
                label="Platform Revenue"
                value={formatZar(summary.platformRevenueCents)}
                valueColor="text-emerald-800"
              />
            </div>
          </div>
        ) : null}
      </section>

      {/* Pending Monday Chef Payouts */}
      <section className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-[var(--color-oxblood)]">
              Pending Monday Chef Payouts
            </h3>
            <p className="mt-1 text-xs text-[var(--color-charcoal)]/60">
              Completed bookings awaiting bank transfer settlement this Monday.
            </p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
            {pendingPayouts.length} chef{pendingPayouts.length !== 1 ? "s" : ""} pending
          </span>
        </div>

        {pendingPayouts.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-[var(--color-warm-cream)] p-6 text-center text-sm text-[var(--color-charcoal)]/70">
            <p className="text-2xl">🎉</p>
            <p className="mt-2 font-bold text-[var(--color-oxblood)]">
              All chef payouts are settled!
            </p>
            <p className="mt-1 text-xs text-[var(--color-charcoal)]/60">
              When chefs complete visits, their payable balance will appear here for Monday
              confirmation.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {pendingPayouts.map((payout) => (
              <article
                key={payout.cookUserId}
                className="rounded-2xl border border-[var(--color-oxblood)]/15 bg-white p-5 shadow-sm transition hover:border-[var(--color-oxblood)]/30"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-black text-[var(--color-charcoal)]">
                        {payout.cookDisplayName}
                      </h4>
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                        Pending Payout
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-charcoal)]/60">{payout.cookEmail}</p>

                    {/* Bank Account Details */}
                    {payout.bankAccount ? (
                      <div className="mt-3 inline-flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-[var(--color-warm-cream)]/70 px-3 py-2 text-xs text-[var(--color-charcoal)]">
                        <div>
                          <span className="text-[var(--color-charcoal)]/50">Bank: </span>
                          <strong>{payout.bankAccount.bankName}</strong>
                        </div>
                        <div>
                          <span className="text-[var(--color-charcoal)]/50">Account Holder: </span>
                          <strong>{payout.bankAccount.accountHolder}</strong>
                        </div>
                        <div>
                          <span className="text-[var(--color-charcoal)]/50">Account ending: </span>
                          <strong className="font-mono">
                            ••••{payout.bankAccount.accountNumberLast4}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[var(--color-charcoal)]/50">Branch: </span>
                          <strong className="font-mono">{payout.bankAccount.branchCode}</strong>
                        </div>
                        {payout.bankAccount.accountType ? (
                          <div>
                            <span className="text-[var(--color-charcoal)]/50">Type: </span>
                            <span>{payout.bankAccount.accountType}</span>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs font-semibold text-amber-700">
                        ⚠️ No bank details configured on file yet.
                      </p>
                    )}

                    {/* Visits Included */}
                    <div className="mt-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-charcoal)]/50">
                        Visits included ({payout.earnings.length}):
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {payout.earnings.map((e) => (
                          <span
                            key={e.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-oxblood)]/10 bg-zinc-50 px-2.5 py-1 font-mono text-xs text-[var(--color-charcoal)]"
                          >
                            <span>{e.bookingReference}</span>
                            {e.bookingType === "SUBSCRIPTION" ? (
                              <span className="rounded bg-purple-100 px-1.5 py-0.5 font-sans text-[10px] font-bold text-purple-800">
                                🔄 Session Visit
                              </span>
                            ) : null}
                            <span className="font-semibold text-emerald-800">
                              · {formatZar(e.chefPayoutCents)}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Payout Action */}
                  <div className="flex shrink-0 flex-col items-start gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
                    <div className="text-left lg:text-right">
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-charcoal)]/50">
                        Total Amount Due
                      </p>
                      <p className="text-2xl font-black text-emerald-800">
                        {formatZar(payout.totalCents)}
                      </p>
                    </div>

                    <button
                      className="min-h-11 rounded-xl bg-emerald-700 px-5 text-sm font-black text-white shadow-sm transition hover:bg-emerald-800 active:scale-95"
                      onClick={() => openSettle(payout)}
                      type="button"
                    >
                      ✓ Confirm as Paid
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Confirmation Modal */}
      {settlingChef ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-black text-[var(--color-oxblood)]">
              Confirm Monday Chef Payout
            </h3>
            <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">
              Confirm that you have completed the EFT bank transfer for{" "}
              <strong>{settlingChef.cookDisplayName}</strong>.
            </p>

            <div className="mt-4 rounded-2xl bg-[var(--color-warm-cream)] p-4 text-sm">
              <div className="flex justify-between font-bold">
                <span>Total Amount:</span>
                <span className="text-emerald-800 font-black">
                  {formatZar(settlingChef.totalCents)}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--color-charcoal)]/70">
                Covers {settlingChef.earnings.length} completed visit
                {settlingChef.earnings.length !== 1 ? "s" : ""}
                {settlingChef.earnings.some((e) => e.bookingType === "SUBSCRIPTION")
                  ? " (includes subscription session visits)"
                  : ""}
              </p>
              {settlingChef.bankAccount ? (
                <div className="mt-2 text-xs text-[var(--color-charcoal)]/80 space-y-0.5">
                  <p>
                    Bank: <strong>{settlingChef.bankAccount.bankName}</strong>
                  </p>
                  <p>
                    Account Holder: <strong>{settlingChef.bankAccount.accountHolder}</strong>
                  </p>
                  <p>
                    Account:{" "}
                    <strong className="font-mono">
                      ••••{settlingChef.bankAccount.accountNumberLast4}
                    </strong>
                  </p>
                  <p>
                    Branch Code:{" "}
                    <strong className="font-mono">{settlingChef.bankAccount.branchCode}</strong>
                  </p>
                </div>
              ) : null}
            </div>

            <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-[var(--color-charcoal)]/70">
              Bank Transfer / Payout Reference
              <input
                className="mt-1.5 min-h-11 w-full rounded-xl border border-[var(--color-oxblood)]/20 bg-white px-3 font-mono text-sm outline-none focus:border-[var(--color-oxblood)]"
                onChange={(e) => setPayoutReference(e.target.value)}
                placeholder="e.g. EFT-20260915-CHEFNAME"
                value={payoutReference}
              />
            </label>

            {settleError ? (
              <p className="mt-3 rounded-xl bg-red-50 p-2.5 text-xs font-bold text-red-900">
                {settleError}
              </p>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                className="min-h-11 rounded-xl border border-[var(--color-oxblood)]/20 px-4 text-sm font-bold text-[var(--color-charcoal)]/75 hover:bg-zinc-50"
                disabled={settleBusy}
                onClick={() => setSettlingChef(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="min-h-11 rounded-xl bg-emerald-700 px-5 text-sm font-black text-white hover:bg-emerald-800 disabled:opacity-50"
                disabled={settleBusy}
                onClick={() => void handleConfirmSettle()}
                type="button"
              >
                {settleBusy ? "Confirming..." : "Confirm Payment Sent"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

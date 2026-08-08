"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fetchChefs, type ChefSummary } from "@/features/platform/api/platformClient";

export function AdminChefs() {
  const [chefs, setChefs] = useState<ChefSummary[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchChefs();
        if (!cancelled) setChefs(data);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Load failed");
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (busy) {
    return (
      <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-[var(--color-charcoal)]/75">
        Loading chefs...
      </p>
    );
  }

  if (error) {
    return <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-900">{error}</p>;
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
      <h2 className="text-2xl font-black text-[var(--color-oxblood)]">Chefs</h2>
      <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">
        {chefs.length} chef{chefs.length !== 1 ? "s" : ""} registered
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-oxblood)]/10 bg-[var(--color-warm-cream)]">
            <tr>
              {["Name", "Email", "Service Area", "Available", "Bank Details"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-charcoal)]/50"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-oxblood)]/5">
            {chefs.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-[var(--color-charcoal)]/50"
                >
                  No chefs yet.
                </td>
              </tr>
            ) : (
              chefs.map((chef) => (
                <tr key={chef.id}>
                  <td className="px-4 py-3 font-medium text-[var(--color-charcoal)]">
                    {chef.displayName}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-charcoal)]/70">{chef.email}</td>
                  <td className="px-4 py-3 text-[var(--color-charcoal)]/70">
                    {chef.profile?.serviceArea ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={chef.profile?.isAvailable ? "active" : "pending"}
                      label={chef.profile?.isAvailable ? "Available" : "Unavailable"}
                    />
                  </td>
                  <td className="px-4 py-3 text-[var(--color-charcoal)]/70">
                    {chef.bankAccount
                      ? `${chef.bankAccount.bankName} ending ${chef.bankAccount.accountNumberLast4}`
                      : "Pending"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

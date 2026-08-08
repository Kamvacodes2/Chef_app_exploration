"use client";

import { useEffect, useState } from "react";
import { fetchChefBookings, type ChefBooking } from "@/features/platform/api/platformClient";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function Page() {
  const [bookings, setBookings] = useState<ChefBooking[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchChefBookings();
        setBookings(data);
      } catch {
        // OK if no bookings exist
      } finally {
        setBusy(false);
      }
    })();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-black text-[var(--color-oxblood)]">Bookings</h1>
      <p className="mt-1 text-sm text-[var(--color-charcoal)]/60">
        All bookings across the platform.
      </p>

      {busy ? (
        <p className="mt-10 text-sm text-[var(--color-charcoal)]/50">Loading bookings...</p>
      ) : bookings.length === 0 ? (
        <p className="mt-10 text-sm text-[var(--color-charcoal)]/50">No bookings yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-[var(--color-oxblood)]/10 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--color-oxblood)]/10 bg-[var(--color-warm-cream)]/50 text-xs uppercase text-[var(--color-charcoal)]/50">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Meal</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-[var(--color-oxblood)]/5 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-[var(--color-charcoal)]">
                    {b.reference}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-charcoal)]/70">
                    {new Date(b.scheduledDate).toLocaleDateString("en-ZA", {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    {b.timeSlot}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-charcoal)]/70">{b.mainName}</td>
                  <td className="px-4 py-3 text-[var(--color-charcoal)]/70">
                    {b.contactName ?? b.contactEmail ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

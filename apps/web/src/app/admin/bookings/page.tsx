"use client";

import { useEffect, useState, useMemo } from "react";
import {
  fetchOperationsBookings,
  verifyBookingPayment,
  type OperationsBooking,
} from "@/features/platform/api/platformClient";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { IconCheck, IconSearch, IconSparkles } from "@/components/ui/icons";

type FilterTab = "all" | "unassigned" | "awaiting_chef" | "assigned" | "completed";

export default function Page() {
  const [bookings, setBookings] = useState<OperationsBooking[]>([]);
  const [busy, setBusy] = useState(true);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function loadBookings() {
    try {
      const data = await fetchOperationsBookings();
      setBookings(data);
    } catch {
      // OK if error or empty
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void loadBookings();
  }, []);

  async function handleMarkAsPaid(booking: OperationsBooking) {
    const confirmText = `Approve booking ${booking.reference} and mark as Paid?\n\nThis will:\n1. Transition the booking to Awaiting Chef\n2. Broadcast the session to all chefs immediately on a first-come, first-served basis\n3. Email the customer their grocery & ingredient list PDF`;
    if (!window.confirm(confirmText)) {
      return;
    }

    setProcessingId(booking.id);
    setAlert(null);
    try {
      await verifyBookingPayment(booking.id, "Approved and marked paid by admin");
      setAlert({
        type: "success",
        message: `Booking ${booking.reference} marked as paid! Broadcasted to all chefs on the platform and ingredient list PDF emailed to customer.`,
      });
      await loadBookings();
    } catch (err) {
      setAlert({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to mark booking as paid.",
      });
    } finally {
      setProcessingId(null);
    }
  }

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Filter by tab
      if (filterTab === "unassigned") {
        if (b.cook || b.status === "CANCELLED" || b.status === "COMPLETED") return false;
        if (
          b.payment?.status === "VERIFIED" &&
          b.status !== "REQUESTED" &&
          b.status !== "NEEDS_REVIEW"
        )
          return false;
      } else if (filterTab === "awaiting_chef") {
        if (
          b.status !== "AWAITING_CHEF" &&
          !(
            b.payment?.status === "VERIFIED" &&
            !b.cook &&
            b.status !== "CANCELLED" &&
            b.status !== "COMPLETED"
          )
        )
          return false;
      } else if (filterTab === "assigned") {
        if (!b.cook || b.status === "CANCELLED" || b.status === "COMPLETED") return false;
      } else if (filterTab === "completed") {
        if (b.status !== "COMPLETED" && b.status !== "CANCELLED") return false;
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const refMatch = b.reference.toLowerCase().includes(q);
        const mealMatch = b.mainName.toLowerCase().includes(q);
        const contactMatch =
          (b.contactName ?? "").toLowerCase().includes(q) ||
          (b.contactEmail ?? "").toLowerCase().includes(q);
        const chefMatch = (b.cook?.displayName ?? "").toLowerCase().includes(q);
        if (!refMatch && !mealMatch && !contactMatch && !chefMatch) return false;
      }

      return true;
    });
  }, [bookings, filterTab, searchQuery]);

  const unassignedCount = useMemo(() => {
    return bookings.filter(
      (b) =>
        !b.cook &&
        b.status !== "CANCELLED" &&
        b.status !== "COMPLETED" &&
        (b.payment?.status !== "VERIFIED" ||
          b.status === "REQUESTED" ||
          b.status === "NEEDS_REVIEW"),
    ).length;
  }, [bookings]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-[var(--color-oxblood)]">Bookings</h1>
          <p className="mt-1 text-sm text-[var(--color-charcoal)]/60">
            Manage orders, approve unassigned requests, verify payments, and broadcast to chefs.
          </p>
        </div>
      </div>

      {/* Notification banner */}
      {alert && (
        <div
          className={`flex items-start justify-between rounded-xl p-4 text-sm ${
            alert.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {alert.type === "success" ? (
              <IconCheck width={18} height={18} className="text-emerald-700 shrink-0" />
            ) : null}
            <span>{alert.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlert(null)}
            className="ml-4 font-bold opacity-60 hover:opacity-100"
          >
            &times;
          </button>
        </div>
      )}

      {/* Filter tabs & search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors ${
              filterTab === "all"
                ? "bg-[var(--color-oxblood)] text-white"
                : "bg-white text-[var(--color-charcoal)]/70 hover:bg-[var(--color-warm-cream)]"
            }`}
          >
            All Bookings ({bookings.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("unassigned")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors ${
              filterTab === "unassigned"
                ? "bg-amber-600 text-white"
                : "bg-amber-50 text-amber-900 hover:bg-amber-100"
            }`}
          >
            <span>Needs Payment / Action</span>
            {unassignedCount > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                  filterTab === "unassigned" ? "bg-white text-amber-700" : "bg-amber-600 text-white"
                }`}
              >
                {unassignedCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("awaiting_chef")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors ${
              filterTab === "awaiting_chef"
                ? "bg-[var(--color-oxblood)] text-white"
                : "bg-white text-[var(--color-charcoal)]/70 hover:bg-[var(--color-warm-cream)]"
            }`}
          >
            Awaiting Chef
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("assigned")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors ${
              filterTab === "assigned"
                ? "bg-[var(--color-oxblood)] text-white"
                : "bg-white text-[var(--color-charcoal)]/70 hover:bg-[var(--color-warm-cream)]"
            }`}
          >
            Chef Assigned
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("completed")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors ${
              filterTab === "completed"
                ? "bg-[var(--color-oxblood)] text-white"
                : "bg-white text-[var(--color-charcoal)]/70 hover:bg-[var(--color-warm-cream)]"
            }`}
          >
            Completed / Cancelled
          </button>
        </div>

        <div className="relative min-w-[220px]">
          <IconSearch
            width={14}
            height={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-charcoal)]/40"
          />
          <input
            type="text"
            placeholder="Search ref, customer, chef..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-oxblood)]/15 bg-white py-1.5 pl-8 pr-3 text-xs text-[var(--color-charcoal)] placeholder:text-[var(--color-charcoal)]/40 focus:border-[var(--color-oxblood)] focus:outline-none"
          />
        </div>
      </div>

      {busy ? (
        <p className="mt-10 text-sm text-[var(--color-charcoal)]/50">Loading bookings...</p>
      ) : filteredBookings.length === 0 ? (
        <p className="mt-10 text-sm text-[var(--color-charcoal)]/50">
          No bookings match the selected filter.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--color-oxblood)]/10 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--color-oxblood)]/10 bg-[var(--color-warm-cream)]/50 text-xs uppercase text-[var(--color-charcoal)]/50">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3">Meal</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Chef</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((b) => {
                const isPaid = b.payment?.status === "VERIFIED";
                const isPending = b.payment?.status === "PENDING" || !b.payment;
                const isSubmitted = b.payment?.status === "SUBMITTED";
                const isDeclined = b.payment?.status === "DECLINED";

                const canMarkPaid =
                  !b.cook &&
                  b.status !== "CANCELLED" &&
                  b.status !== "COMPLETED" &&
                  (!isPaid || b.status === "REQUESTED" || b.status === "NEEDS_REVIEW");

                return (
                  <tr
                    key={b.id}
                    className="border-b border-[var(--color-oxblood)]/5 last:border-0 hover:bg-[var(--color-warm-cream)]/20"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-[var(--color-charcoal)]">
                      {b.reference}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-charcoal)]/70">
                      <span
                        className={
                          b.type === "SUBSCRIPTION"
                            ? "rounded-md bg-amber-100 px-2 py-0.5 text-amber-800"
                            : ""
                        }
                      >
                        {b.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-charcoal)]/70 whitespace-nowrap">
                      {new Date(b.scheduledDate).toLocaleDateString("en-ZA", {
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      {b.timeSlot}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-charcoal)]/80 max-w-[200px] truncate">
                      {b.mainName}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-charcoal)]/70">
                      <div className="font-medium text-[var(--color-charcoal)]">
                        {b.contactName ?? "—"}
                      </div>
                      <div className="text-[11px] text-[var(--color-charcoal)]/50">
                        {b.contactEmail ?? ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-charcoal)]/70">
                      {b.cook?.displayName ? (
                        <span className="font-semibold text-emerald-800">{b.cook.displayName}</span>
                      ) : (
                        <span className="inline-block rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                          <IconCheck width={12} height={12} />
                          Paid
                        </span>
                      ) : isSubmitted ? (
                        <span className="inline-block rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800">
                          Submitted
                        </span>
                      ) : isDeclined ? (
                        <span className="inline-block rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                          Declined
                        </span>
                      ) : (
                        <span className="inline-block rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                          Unpaid
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canMarkPaid ? (
                        <button
                          type="button"
                          disabled={processingId === b.id}
                          onClick={() => void handleMarkAsPaid(b)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-oxblood)] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          <IconSparkles width={13} height={13} />
                          {processingId === b.id ? "Approving..." : "Mark as Paid"}
                        </button>
                      ) : b.status === "AWAITING_CHEF" ? (
                        <span className="inline-block rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                          Broadcasted
                        </span>
                      ) : (
                        <span className="text-[11px] text-[var(--color-charcoal)]/40">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

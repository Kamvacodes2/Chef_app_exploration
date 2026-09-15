"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchChefs,
  fetchOperationsBookings,
  verifyBookingPayment,
  type ChefSummary,
  type OperationsBooking,
} from "@/features/platform/api/platformClient";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  IconCalendar,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconSearch,
  IconSparkles,
  IconUser,
  IconUsers,
  IconX,
} from "@/components/ui/icons";

export type CalendarStatusFilter =
  "all" | "completed" | "in_progress" | "awaiting_chef" | "needs_action" | "cancelled";

export type CalendarViewMode = "grid" | "columns";

const TIME_SLOTS = [
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
] as const;

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

function formatIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatZar(cents: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(cents / 100);
}

function normalizeDateString(raw: string): string {
  if (!raw) return "";
  return raw.slice(0, 10);
}

function getBookingCardStyle(status: string): {
  border: string;
  bg: string;
  badgeBg: string;
  badgeText: string;
  badgeLabel: string;
} {
  switch (status) {
    case "COMPLETED":
      return {
        border: "border-l-emerald-600 bg-emerald-50/40 hover:bg-emerald-50/70",
        bg: "border-emerald-200",
        badgeBg: "bg-emerald-100",
        badgeText: "text-emerald-800",
        badgeLabel: "✓ Fulfilled",
      };
    case "CHEF_MATCHED":
    case "EN_ROUTE":
    case "CONFIRMED":
      return {
        border: "border-l-sky-600 bg-sky-50/40 hover:bg-sky-50/70",
        bg: "border-sky-200",
        badgeBg: "bg-sky-100",
        badgeText: "text-sky-800",
        badgeLabel: status === "EN_ROUTE" ? "🚗 En Route" : "👨‍🍳 Matched",
      };
    case "AWAITING_CHEF":
    case "MATCHING":
      return {
        border: "border-l-amber-500 bg-amber-50/40 hover:bg-amber-50/70",
        bg: "border-amber-200",
        badgeBg: "bg-amber-100",
        badgeText: "text-amber-900",
        badgeLabel: "⏳ Awaiting Chef",
      };
    case "REQUESTED":
    case "NEEDS_REVIEW":
      return {
        border: "border-l-orange-500 bg-orange-50/40 hover:bg-orange-50/70",
        bg: "border-orange-200",
        badgeBg: "bg-orange-100",
        badgeText: "text-orange-900",
        badgeLabel: "💳 Needs Payment",
      };
    case "CANCELLED":
      return {
        border: "border-l-zinc-400 bg-zinc-50/50 hover:bg-zinc-100/70",
        bg: "border-zinc-200",
        badgeBg: "bg-zinc-100",
        badgeText: "text-zinc-600",
        badgeLabel: "Cancelled",
      };
    default:
      return {
        border: "border-l-[var(--color-oxblood)] bg-white hover:bg-[var(--color-warm-cream)]/30",
        bg: "border-[var(--color-oxblood)]/15",
        badgeBg: "bg-[var(--color-warm-cream)]",
        badgeText: "text-[var(--color-charcoal)]",
        badgeLabel: status,
      };
  }
}

export function AdminCalendarPage() {
  const [bookings, setBookings] = useState<OperationsBooking[]>([]);
  const [chefs, setChefs] = useState<ChefSummary[]>([]);
  const [busy, setBusy] = useState(true);
  const [selectedMonday, setSelectedMonday] = useState<Date>(() => getMonday(new Date()));
  const [selectedChefId, setSelectedChefId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<CalendarStatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<CalendarViewMode>("grid");
  const [selectedBooking, setSelectedBooking] = useState<OperationsBooking | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [b, c] = await Promise.all([fetchOperationsBookings(), fetchChefs()]);
      setBookings(b);
      setChefs(c);
    } catch {
      // Ok if error or empty
    } finally {
      setBusy(false);
    }
  };

  const handleModalMarkPaid = async (booking: OperationsBooking) => {
    const confirmText = `Approve booking ${booking.reference} and mark as Paid?\n\nThis will:\n1. Transition the booking to Awaiting Chef\n2. Broadcast the session to all chefs immediately\n3. Email the customer their grocery & ingredient list PDF`;
    if (!window.confirm(confirmText)) return;

    setProcessingId(booking.id);
    try {
      await verifyBookingPayment(booking.id, "Approved and marked paid by admin from calendar");
      await loadData();
      setSelectedBooking((prev) =>
        prev?.id === booking.id
          ? {
              ...prev,
              status: "AWAITING_CHEF",
              payment: prev.payment
                ? { ...prev.payment, status: "VERIFIED" }
                : {
                    id: "new",
                    status: "VERIFIED",
                    method: "BANK_TRANSFER",
                    amountCents: 0,
                    verifiedAt: new Date().toISOString(),
                  },
            }
          : prev,
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to mark booking as paid.");
    } finally {
      setProcessingId(null);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Generate 7 days for the selected week: Monday to Sunday
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(selectedMonday, i);
      const iso = formatIsoDate(date);
      const isToday = iso === formatIsoDate(new Date());
      const dayName = new Intl.DateTimeFormat("en-ZA", { weekday: "short" }).format(date);
      const fullDayName = new Intl.DateTimeFormat("en-ZA", { weekday: "long" }).format(date);
      const dayNumber = date.getDate();
      const monthName = new Intl.DateTimeFormat("en-ZA", { month: "short" }).format(date);
      return {
        date,
        iso,
        isToday,
        dayName,
        fullDayName,
        dayNumber,
        monthName,
      };
    });
  }, [selectedMonday]);

  const weekRangeLabel = useMemo(() => {
    const monday = weekDays[0]?.date ?? selectedMonday;
    const sunday = weekDays[6]?.date ?? addDays(selectedMonday, 6);
    const startStr = new Intl.DateTimeFormat("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(monday);
    const endStr = new Intl.DateTimeFormat("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(sunday);
    return `${startStr} – ${endStr}`;
  }, [weekDays, selectedMonday]);

  // Filter bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Chef filter
      if (selectedChefId === "unassigned") {
        if (b.cook) return false;
      } else if (selectedChefId !== "all") {
        if (b.cook?.id !== selectedChefId) return false;
      }

      // Status filter
      if (statusFilter === "completed") {
        if (b.status !== "COMPLETED") return false;
      } else if (statusFilter === "in_progress") {
        if (!["CONFIRMED", "CHEF_MATCHED", "EN_ROUTE"].includes(b.status)) return false;
      } else if (statusFilter === "awaiting_chef") {
        if (!["AWAITING_CHEF", "MATCHING"].includes(b.status)) return false;
      } else if (statusFilter === "needs_action") {
        if (!["REQUESTED", "NEEDS_REVIEW"].includes(b.status) && b.payment?.status === "VERIFIED")
          return false;
      } else if (statusFilter === "cancelled") {
        if (b.status !== "CANCELLED") return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const searchable = [
          b.reference,
          b.mainName,
          b.contactName,
          b.contactEmail,
          b.contactPhone,
          b.cook?.displayName,
          b.serviceArea,
          b.street,
        ];
        if (!searchable.some((v) => v?.toLowerCase().includes(q))) return false;
      }

      return true;
    });
  }, [bookings, selectedChefId, statusFilter, searchQuery]);

  // Group filtered bookings by day iso date
  const bookingsByDay = useMemo(() => {
    const map = new Map<string, OperationsBooking[]>();
    for (const day of weekDays) {
      map.set(day.iso, []);
    }
    for (const b of filteredBookings) {
      const dateKey = normalizeDateString(b.scheduledDate);
      if (map.has(dateKey)) {
        map.get(dateKey)!.push(b);
      }
    }
    // Sort each day's bookings by timeSlot
    for (const [key, list] of map.entries()) {
      list.sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
    }
    return map;
  }, [filteredBookings, weekDays]);

  // Stats for the active week
  const weekStats = useMemo(() => {
    let total = 0;
    let completed = 0;
    let inProgress = 0;
    let awaitingChef = 0;
    let needsAction = 0;

    for (const day of weekDays) {
      const list = bookingsByDay.get(day.iso) ?? [];
      for (const b of list) {
        total += 1;
        if (b.status === "COMPLETED") completed += 1;
        else if (["CONFIRMED", "CHEF_MATCHED", "EN_ROUTE"].includes(b.status)) inProgress += 1;
        else if (["AWAITING_CHEF", "MATCHING"].includes(b.status)) awaitingChef += 1;
        else if (b.status === "CANCELLED") {
          // cancelled
        } else {
          needsAction += 1;
        }
      }
    }

    return { total, completed, inProgress, awaitingChef, needsAction };
  }, [bookingsByDay, weekDays]);

  const handlePrevWeek = () => {
    setSelectedMonday((current) => addDays(current, -7));
  };

  const handleNextWeek = () => {
    setSelectedMonday((current) => addDays(current, 7));
  };

  const handleToday = () => {
    setSelectedMonday(getMonday(new Date()));
  };

  const handleDateChange = (isoDate: string) => {
    if (!isoDate) return;
    const date = new Date(`${isoDate}T00:00:00`);
    if (!isNaN(date.getTime())) {
      setSelectedMonday(getMonday(date));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="rounded-3xl bg-[var(--color-oxblood)] p-6 text-white sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-white/70">
                Operations Schedule
              </span>
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold text-white">
                Teams Calendar View
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">Weekly Chef Bookings Schedule</h1>
            <p className="mt-1 text-sm text-white/80">
              Visual weekly board of all chef assignments, fulfilled orders, and scheduled services.
            </p>
          </div>

          {/* Quick links & View toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/bookings"
              className="rounded-xl border border-white/25 bg-white/10 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-white/20"
            >
              ← Table View
            </Link>
            <div className="flex rounded-xl bg-black/20 p-1">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  viewMode === "grid"
                    ? "bg-white text-[var(--color-oxblood)] shadow-sm"
                    : "text-white/80 hover:text-white"
                }`}
              >
                Time Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode("columns")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  viewMode === "columns"
                    ? "bg-white text-[var(--color-oxblood)] shadow-sm"
                    : "text-white/80 hover:text-white"
                }`}
              >
                Day Columns
              </button>
            </div>
          </div>
        </div>

        {/* Weekly Stats Counters */}
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
          <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">
              This Week
            </p>
            <p className="mt-1 text-xl font-black text-white">{weekStats.total} orders</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              ✓ Fulfilled
            </p>
            <p className="mt-1 text-xl font-black text-emerald-300">{weekStats.completed}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-sky-300">
              👨‍🍳 In Progress
            </p>
            <p className="mt-1 text-xl font-black text-sky-300">{weekStats.inProgress}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
              ⏳ Awaiting Chef
            </p>
            <p className="mt-1 text-xl font-black text-amber-300">{weekStats.awaitingChef}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-xs col-span-2 sm:col-span-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-orange-300">
              💳 Needs Action
            </p>
            <p className="mt-1 text-xl font-black text-orange-300">{weekStats.needsAction}</p>
          </div>
        </div>
      </div>

      {/* Week Navigation Controls & Filters */}
      <section className="rounded-3xl bg-white p-5 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Week Date Navigator */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-2xl border border-[var(--color-oxblood)]/15 bg-white p-1 shadow-xs">
              <button
                type="button"
                onClick={handlePrevWeek}
                title="Previous Week"
                className="rounded-xl p-2 text-[var(--color-oxblood)] hover:bg-[var(--color-warm-cream)] transition"
              >
                <IconChevronLeft width={18} height={18} />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="rounded-xl px-3 py-1.5 text-xs font-bold text-[var(--color-oxblood)] hover:bg-[var(--color-warm-cream)] transition"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleNextWeek}
                title="Next Week"
                className="rounded-xl p-2 text-[var(--color-oxblood)] hover:bg-[var(--color-warm-cream)] transition"
              >
                <IconChevronRight width={18} height={18} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-base font-black text-[var(--color-oxblood)] sm:text-lg">
                📅 {weekRangeLabel}
              </span>
              <input
                type="date"
                value={formatIsoDate(selectedMonday)}
                onChange={(e) => handleDateChange(e.target.value)}
                className="rounded-xl border border-[var(--color-oxblood)]/15 px-2.5 py-1 text-xs text-[var(--color-charcoal)] focus:outline-none focus:border-[var(--color-oxblood)]"
                title="Jump to date"
              />
            </div>
          </div>

          {/* Search bar */}
          <div className="relative min-w-[240px]">
            <IconSearch
              width={14}
              height={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-charcoal)]/40"
            />
            <input
              type="text"
              placeholder="Search chef, customer, meal, ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-oxblood)]/15 bg-white py-2 pl-9 pr-3 text-xs text-[var(--color-charcoal)] placeholder:text-[var(--color-charcoal)]/40 focus:border-[var(--color-oxblood)] focus:outline-none"
            />
          </div>
        </div>

        {/* Filter Badges Bar */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--color-oxblood)]/10 pt-4">
          {/* Chef Dropdown Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[var(--color-charcoal)]/60">Chef:</span>
            <select
              value={selectedChefId}
              onChange={(e) => setSelectedChefId(e.target.value)}
              className="rounded-xl border border-[var(--color-oxblood)]/15 bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-charcoal)] focus:outline-none focus:border-[var(--color-oxblood)]"
            >
              <option value="all">All Chefs ({chefs.length})</option>
              <option value="unassigned">⚠️ Unassigned Only</option>
              {chefs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Status Pills */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "all", label: "All Orders" },
              { id: "completed", label: "✓ Fulfilled" },
              { id: "in_progress", label: "👨‍🍳 In Progress" },
              { id: "awaiting_chef", label: "⏳ Awaiting Chef" },
              { id: "needs_action", label: "💳 Needs Action" },
              { id: "cancelled", label: "Cancelled" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as CalendarStatusFilter)}
                className={`rounded-xl px-3 py-1 text-xs font-bold transition ${
                  statusFilter === tab.id
                    ? "bg-[var(--color-oxblood)] text-white shadow-xs"
                    : "bg-[var(--color-warm-cream)]/70 text-[var(--color-charcoal)]/70 hover:bg-[var(--color-warm-cream)] hover:text-[var(--color-charcoal)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Calendar View Body */}
      {busy ? (
        <div className="rounded-3xl bg-white p-12 text-center text-sm font-semibold text-[var(--color-charcoal)]/60">
          Loading calendar bookings...
        </div>
      ) : viewMode === "grid" ? (
        /* ================= TIME GRID (Teams Schedule Grid) ================= */
        <section className="overflow-x-auto rounded-3xl border border-[var(--color-oxblood)]/10 bg-white p-4 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
          <div className="min-w-[980px]">
            {/* Header: 7 Days Column */}
            <div className="grid grid-cols-8 border-b border-[var(--color-oxblood)]/10 pb-3">
              <div className="text-center font-bold text-xs uppercase text-[var(--color-charcoal)]/40 self-center">
                Time
              </div>
              {weekDays.map((day) => {
                const dayBookings = bookingsByDay.get(day.iso) ?? [];
                return (
                  <div
                    key={day.iso}
                    className={`text-center px-1 py-1 rounded-2xl transition ${
                      day.isToday
                        ? "bg-[var(--color-oxblood)]/5 border border-[var(--color-oxblood)]/20"
                        : ""
                    }`}
                  >
                    <p
                      className={`text-xs font-bold uppercase tracking-wider ${
                        day.isToday
                          ? "text-[var(--color-oxblood)] font-black"
                          : "text-[var(--color-charcoal)]/60"
                      }`}
                    >
                      {day.dayName}
                    </p>
                    <div className="mt-0.5 flex items-center justify-center gap-1">
                      <span
                        className={`text-lg font-black ${
                          day.isToday
                            ? "text-[var(--color-oxblood)]"
                            : "text-[var(--color-charcoal)]"
                        }`}
                      >
                        {day.dayNumber}
                      </span>
                      <span className="text-xs text-[var(--color-charcoal)]/50">
                        {day.monthName}
                      </span>
                    </div>
                    {day.isToday && (
                      <span className="inline-block rounded-full bg-[var(--color-oxblood)] px-2 py-0.2 text-[10px] font-bold text-white">
                        Today
                      </span>
                    )}
                    <p className="mt-1 text-[11px] font-semibold text-[var(--color-charcoal)]/50">
                      {dayBookings.length} {dayBookings.length === 1 ? "order" : "orders"}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Time Grid Rows */}
            <div className="divide-y divide-[var(--color-oxblood)]/5">
              {TIME_SLOTS.map((timeSlot) => {
                return (
                  <div key={timeSlot} className="grid grid-cols-8 min-h-[90px] py-2">
                    {/* Time Label Column */}
                    <div className="pr-2 text-center text-xs font-bold text-[var(--color-charcoal)]/50 self-start pt-1 font-mono">
                      {timeSlot}
                    </div>

                    {/* 7 Days Slots */}
                    {weekDays.map((day) => {
                      const dayBookings = bookingsByDay.get(day.iso) ?? [];
                      const slotBookings = dayBookings.filter(
                        (b) =>
                          b.timeSlot === timeSlot || b.timeSlot.startsWith(timeSlot.slice(0, 2)),
                      );

                      return (
                        <div
                          key={day.iso}
                          className={`border-l border-[var(--color-oxblood)]/5 px-1.5 py-1 ${
                            day.isToday ? "bg-[var(--color-oxblood)]/[0.02]" : ""
                          }`}
                        >
                          {slotBookings.length === 0 ? (
                            <div className="h-full min-h-[60px] rounded-xl border border-dashed border-zinc-100 p-1 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                              <span className="text-[10px] text-zinc-300 font-mono">
                                {timeSlot}
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {slotBookings.map((booking) => {
                                const cardStyle = getBookingCardStyle(booking.status);
                                return (
                                  <div
                                    key={booking.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setSelectedBooking(booking)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        setSelectedBooking(booking);
                                      }
                                    }}
                                    className={`cursor-pointer rounded-xl border border-l-4 p-2.5 text-left shadow-2xs transition hover:shadow-md hover:scale-[1.01] ${cardStyle.border} ${cardStyle.bg}`}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-mono text-[10px] font-bold text-[var(--color-charcoal)]/60">
                                        {booking.reference}
                                      </span>
                                      <span
                                        className={`rounded-md px-1.5 py-0.2 text-[9px] font-bold ${cardStyle.badgeBg} ${cardStyle.badgeText}`}
                                      >
                                        {cardStyle.badgeLabel}
                                      </span>
                                    </div>

                                    <h4 className="mt-1 line-clamp-2 text-xs font-black text-[var(--color-charcoal)] leading-snug">
                                      {booking.mainName}
                                    </h4>

                                    <div className="mt-1.5 space-y-0.5 text-[11px] text-[var(--color-charcoal)]/80">
                                      <div className="flex items-center gap-1 font-semibold">
                                        {booking.cook ? (
                                          <span className="truncate text-emerald-900">
                                            👨‍🍳 {booking.cook.displayName}
                                          </span>
                                        ) : (
                                          <span className="truncate text-amber-800 italic">
                                            ⚠️ Unassigned
                                          </span>
                                        )}
                                      </div>
                                      <div className="truncate text-[10px] text-[var(--color-charcoal)]/60">
                                        👤 {booking.contactName ?? "Customer"}
                                      </div>
                                      {booking.serviceArea && (
                                        <div className="truncate text-[10px] text-[var(--color-charcoal)]/50">
                                          📍 {booking.serviceArea}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : (
        /* ================= DAY COLUMNS (Agenda View) ================= */
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          {weekDays.map((day) => {
            const dayBookings = bookingsByDay.get(day.iso) ?? [];
            return (
              <div
                key={day.iso}
                className={`flex flex-col rounded-3xl border bg-white p-4 shadow-sm transition ${
                  day.isToday
                    ? "border-[var(--color-oxblood)] ring-2 ring-[var(--color-oxblood)]/15"
                    : "border-[var(--color-oxblood)]/10"
                }`}
              >
                {/* Column Header */}
                <div className="border-b border-[var(--color-oxblood)]/10 pb-3 text-center">
                  <p
                    className={`text-xs font-bold uppercase tracking-wider ${
                      day.isToday
                        ? "text-[var(--color-oxblood)] font-black"
                        : "text-[var(--color-charcoal)]/60"
                    }`}
                  >
                    {day.fullDayName}
                  </p>
                  <p className="mt-0.5 text-xl font-black text-[var(--color-oxblood)]">
                    {day.dayNumber} {day.monthName}
                  </p>
                  <div className="mt-1 flex items-center justify-center gap-1.5">
                    {day.isToday && (
                      <span className="rounded-full bg-[var(--color-oxblood)] px-2 py-0.2 text-[10px] font-bold text-white">
                        Today
                      </span>
                    )}
                    <span className="rounded-full bg-[var(--color-warm-cream)] px-2 py-0.2 text-[10px] font-bold text-[var(--color-charcoal)]/70">
                      {dayBookings.length} {dayBookings.length === 1 ? "order" : "orders"}
                    </span>
                  </div>
                </div>

                {/* Day Bookings List */}
                <div className="mt-3 flex-1 space-y-2.5">
                  {dayBookings.length === 0 ? (
                    <div className="flex h-32 flex-col items-center justify-center rounded-2xl bg-[var(--color-warm-cream)]/30 p-4 text-center">
                      <IconCalendar
                        width={20}
                        height={20}
                        className="text-[var(--color-charcoal)]/20"
                      />
                      <p className="mt-2 text-xs font-semibold text-[var(--color-charcoal)]/40">
                        No orders
                      </p>
                    </div>
                  ) : (
                    dayBookings.map((booking) => {
                      const cardStyle = getBookingCardStyle(booking.status);
                      return (
                        <div
                          key={booking.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedBooking(booking)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedBooking(booking);
                            }
                          }}
                          className={`cursor-pointer rounded-2xl border border-l-4 p-3 text-left shadow-2xs transition hover:shadow-md hover:scale-[1.02] ${cardStyle.border} ${cardStyle.bg}`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-xs font-bold text-[var(--color-oxblood)]">
                              {booking.timeSlot}
                            </span>
                            <span
                              className={`rounded-md px-1.5 py-0.2 text-[9px] font-bold ${cardStyle.badgeBg} ${cardStyle.badgeText}`}
                            >
                              {cardStyle.badgeLabel}
                            </span>
                          </div>

                          <p className="mt-0.5 font-mono text-[10px] text-[var(--color-charcoal)]/50">
                            {booking.reference}
                          </p>

                          <h4 className="mt-1 line-clamp-2 text-xs font-black text-[var(--color-charcoal)]">
                            {booking.mainName}
                          </h4>

                          <div className="mt-2 border-t border-[var(--color-oxblood)]/5 pt-1.5 space-y-0.5 text-[11px]">
                            <p className="font-semibold truncate">
                              {booking.cook ? (
                                <span className="text-emerald-900">
                                  👨‍🍳 {booking.cook.displayName}
                                </span>
                              ) : (
                                <span className="text-amber-800 italic">⚠️ Unassigned</span>
                              )}
                            </p>
                            <p className="truncate text-[10px] text-[var(--color-charcoal)]/60">
                              👤 {booking.contactName ?? "—"}
                            </p>
                            {booking.serviceArea && (
                              <p className="truncate text-[10px] text-[var(--color-charcoal)]/50">
                                📍 {booking.serviceArea}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* ================= BOOKING DETAIL MODAL ================= */}
      {selectedBooking && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedBooking(null);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-[0_25px_70px_rgba(70,33,24,0.25)] sm:p-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[var(--color-oxblood)]/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-black uppercase text-[var(--color-charcoal)]/50">
                    {selectedBooking.reference}
                  </span>
                  <StatusBadge status={selectedBooking.status} />
                  {selectedBooking.payment?.status === "VERIFIED" ? (
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                      ✓ Paid
                    </span>
                  ) : (
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                      Payment Pending
                    </span>
                  )}
                </div>
                <h2 className="mt-2 text-2xl font-black text-[var(--color-oxblood)]">
                  {selectedBooking.mainName}
                </h2>
                <p className="mt-1 text-xs text-[var(--color-charcoal)]/60">
                  Scheduled for{" "}
                  <strong>
                    {new Date(selectedBooking.scheduledDate).toLocaleDateString("en-ZA", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </strong>{" "}
                  at <strong>{selectedBooking.timeSlot}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="rounded-xl p-2 text-[var(--color-charcoal)]/50 hover:bg-[var(--color-warm-cream)] hover:text-[var(--color-charcoal)] transition"
              >
                <IconX width={20} height={20} />
              </button>
            </div>

            {/* Modal Content Sections */}
            <div className="mt-6 space-y-6 text-sm">
              {/* Chef Assignment */}
              <div className="rounded-2xl border border-[var(--color-oxblood)]/10 bg-[var(--color-warm-cream)]/30 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-oxblood)]">
                  👨‍🍳 Chef Assignment
                </h3>
                {selectedBooking.cook ? (
                  <div className="mt-2 flex items-center justify-between">
                    <div>
                      <p className="text-base font-black text-[var(--color-charcoal)]">
                        {selectedBooking.cook.displayName}
                      </p>
                      <p className="text-xs text-[var(--color-charcoal)]/60">
                        {selectedBooking.cook.email}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                      Active Assigned Chef
                    </span>
                  </div>
                ) : (
                  <div className="mt-2">
                    <p className="font-semibold text-amber-900">No chef currently assigned.</p>
                    {selectedBooking.alignedChefs && selectedBooking.alignedChefs.length > 0 && (
                      <p className="mt-1 text-xs text-[var(--color-charcoal)]/70">
                        <strong>Aligned Chefs:</strong>{" "}
                        {selectedBooking.alignedChefs.map((c) => c.displayName).join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Customer & Location */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--color-oxblood)]/10 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-charcoal)]/50">
                    👤 Customer Details
                  </h3>
                  <p className="mt-2 text-base font-black text-[var(--color-charcoal)]">
                    {selectedBooking.contactName ?? "Not provided"}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-charcoal)]/70">
                    📧 {selectedBooking.contactEmail ?? "—"}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--color-charcoal)]/70">
                    📞 {selectedBooking.contactPhone ?? "—"}
                  </p>
                </div>

                <div className="rounded-2xl border border-[var(--color-oxblood)]/10 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-charcoal)]/50">
                    📍 Service Address
                  </h3>
                  <p className="mt-2 text-sm font-semibold text-[var(--color-charcoal)]">
                    {[
                      selectedBooking.unit,
                      selectedBooking.estate,
                      selectedBooking.street,
                      selectedBooking.serviceArea,
                    ]
                      .filter(Boolean)
                      .join(", ") || "Address not provided"}
                  </p>
                </div>
              </div>

              {/* Order Notes & Customizations */}
              {selectedBooking.customRequest && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    📝 Special Requests / Notes
                  </h3>
                  <p className="mt-1 text-xs text-amber-950">{selectedBooking.customRequest}</p>
                </div>
              )}

              {/* Payment Details */}
              <div className="rounded-2xl border border-[var(--color-oxblood)]/10 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-charcoal)]/50">
                  💳 Payment & Financials
                </h3>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-[var(--color-charcoal)]/70">Payment Status:</span>
                  <span className="font-bold">{selectedBooking.payment?.status ?? "PENDING"}</span>
                </div>
                {selectedBooking.payment?.amountCents != null && (
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-[var(--color-charcoal)]/70">Amount:</span>
                    <span className="font-black text-emerald-800">
                      {formatZar(selectedBooking.payment.amountCents)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-oxblood)]/10 pt-4">
              <Link
                href={`/admin/bookings`}
                className="rounded-xl border border-[var(--color-oxblood)]/20 px-4 py-2 text-xs font-bold text-[var(--color-oxblood)] hover:bg-[var(--color-warm-cream)] transition"
              >
                Open in Table View →
              </Link>
              <div className="flex items-center gap-2">
                {!selectedBooking.cook &&
                  selectedBooking.status !== "CANCELLED" &&
                  selectedBooking.status !== "COMPLETED" &&
                  (selectedBooking.payment?.status !== "VERIFIED" ||
                    selectedBooking.status === "REQUESTED" ||
                    selectedBooking.status === "NEEDS_REVIEW") && (
                    <button
                      type="button"
                      disabled={processingId === selectedBooking.id}
                      onClick={() => void handleModalMarkPaid(selectedBooking)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"
                    >
                      <IconSparkles width={13} height={13} />
                      {processingId === selectedBooking.id ? "Approving..." : "Mark as Paid"}
                    </button>
                  )}
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="rounded-xl bg-[var(--color-oxblood)] px-5 py-2 text-xs font-bold text-white transition hover:opacity-90"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

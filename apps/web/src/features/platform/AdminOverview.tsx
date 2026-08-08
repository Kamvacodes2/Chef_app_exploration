"use client";

import { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { IconChevronRight } from "@/components/ui/icons";
import { fetchAdminDashboard, type AdminDashboard } from "@/features/platform/api/platformClient";

function formatZar(cents: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(cents / 100);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(value));
}

export function AdminOverview() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchAdminDashboard();
        if (!cancelled) setDashboard(data);
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
        Loading admin dashboard...
      </p>
    );
  }

  if (error) {
    return <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-900">{error}</p>;
  }

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="rounded-3xl bg-[var(--color-oxblood)] p-8 text-white">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/70">
          Admin Dashboard
        </p>
        <h2 className="mt-3 text-3xl font-black">ChefMate operating room.</h2>
        <p className="mt-3 max-w-3xl text-white/75">
          See customers, chefs, applications, bookings, and revenue — all in one place.
        </p>
      </div>

      {/* Action required banner */}
      {(dashboard?.chefApplicationsCount ?? 0) > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border-l-4 border-amber-600 bg-amber-50 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
              Action Required
            </p>
            <p className="font-semibold text-[var(--color-charcoal)]">
              {dashboard?.chefApplicationsCount} pending chef application
              {dashboard?.chefApplicationsCount !== 1 ? "s" : ""}
            </p>
            <p className="text-sm text-[var(--color-charcoal)]/70">
              New chefs are awaiting verification and approval.
            </p>
          </div>
          <Link
            href="/admin/applications"
            className="whitespace-nowrap rounded-xl bg-amber-600 px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
          >
            Review Now
          </Link>
        </div>
      ) : null}

      {/* Stat cards — row 1 */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Customers" value={dashboard?.customersCount ?? 0} />
        <StatCard label="Chefs" value={dashboard?.chefsCount ?? 0} />
        <StatCard
          label="Applications"
          value={dashboard?.chefApplicationsCount ?? 0}
          valueColor={(dashboard?.chefApplicationsCount ?? 0) > 0 ? "text-amber-600" : undefined}
        />
        <StatCard label="Bookings This Month" value={dashboard?.bookingsThisMonthCount ?? 0} />
      </div>

      {/* Stat cards — row 2 */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Collected This Month"
          value={formatZar(dashboard?.collectedThisMonthCents ?? 0)}
          valueColor="text-emerald-700"
        />
        <StatCard label="Chef Payable" value={formatZar(dashboard?.chefPayableCents ?? 0)} />
        <StatCard
          label="Platform Revenue"
          value={formatZar(dashboard?.platformRevenueCents ?? 0)}
          valueColor="text-[var(--color-oxblood)]"
        />
        <StatCard
          label="Comms Queued / Sent"
          value={`${dashboard?.communicationsQueuedCount ?? 0}/${dashboard?.communicationsSentCount ?? 0}`}
        />
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="mb-4 font-semibold text-[var(--color-charcoal)]">Quick Actions</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Manage Chefs",
              desc: `${dashboard?.chefsCount ?? 0} chefs`,
              path: "/admin/chefs",
            },
            {
              label: "View Customers",
              desc: `${dashboard?.customersCount ?? 0} registered`,
              path: "/admin/customers",
            },
            {
              label: "All Bookings",
              desc: `${dashboard?.bookingsThisMonthCount ?? 0} this month`,
              path: "/admin/bookings",
            },
            {
              label: "Featured Meals",
              desc: "Manage popular picks",
              path: "/admin/featured-meals",
            },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.path}
              className="flex items-center justify-between rounded-xl border border-[var(--color-oxblood)]/10 bg-white p-4 text-left transition-colors hover:border-[var(--color-oxblood)]/50"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--color-oxblood)]">{action.label}</p>
                <p className="text-xs text-[var(--color-charcoal)]/50">{action.desc}</p>
              </div>
              <IconChevronRight
                width={16}
                height={16}
                className="text-[var(--color-charcoal)]/30"
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

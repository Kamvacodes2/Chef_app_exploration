"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fetchChefs, type ChefSummary } from "@/features/platform/api/platformClient";

export function AdminEnforcement() {
  const [chefs, setChefs] = useState<ChefSummary[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChefId, setSelectedChefId] = useState<string | null>(null);
  const [infractions, setInfractions] = useState<
    Array<{
      id: string;
      severity: string;
      category: string;
      reason: string;
      createdAt: string;
      resolvedAt: string | null;
      resolution: string | null;
    }>
  >([]);
  const [issueBusy, setIssueBusy] = useState(false);
  const [issueNotice, setIssueNotice] = useState<string | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);

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

  const loadInfractions = async (chefId: string) => {
    setSelectedChefId(chefId);
    try {
      const res = await fetch(
        `${getApiBase()}/api/v1/operations/chefs/${encodeURIComponent(chefId)}/infractions`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Failed to load infractions");
      const json = await res.json();
      setInfractions(json.data?.items ?? []);
    } catch {
      setInfractions([]);
    }
  };

  const issueInfraction = async (
    chefId: string,
    severity: string,
    category: string,
    reason: string,
  ) => {
    setIssueBusy(true);
    setIssueNotice(null);
    setIssueError(null);
    try {
      const res = await fetch(
        `${getApiBase()}/api/v1/operations/chefs/${encodeURIComponent(chefId)}/infractions`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ severity, category, reason }),
        },
      );
      if (!res.ok) throw new Error("Failed to issue infraction");
      setIssueNotice(
        `${severity} issued for ${chefs.find((c) => c.id === chefId)?.displayName ?? chefId}`,
      );
      void loadInfractions(chefId);
    } catch (caught) {
      setIssueError(caught instanceof Error ? caught.message : "Action failed");
    } finally {
      setIssueBusy(false);
    }
  };

  const resolveInfraction = async (infractionId: string) => {
    try {
      const res = await fetch(
        `${getApiBase()}/api/v1/operations/infractions/${encodeURIComponent(infractionId)}/resolve`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resolution: "Resolved by admin" }),
        },
      );
      if (res.ok && selectedChefId) void loadInfractions(selectedChefId);
    } catch {
      // ignore
    }
  };

  if (busy) {
    return (
      <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-[var(--color-charcoal)]/75">
        Loading...
      </p>
    );
  }

  if (error) {
    return <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-900">{error}</p>;
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
      <h2 className="text-2xl font-black text-[var(--color-oxblood)]">Chef Enforcement</h2>
      <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">
        Issue warnings, suspensions, and deactivations.
      </p>

      {issueNotice ? (
        <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
          {issueNotice}
        </p>
      ) : null}
      {issueError ? (
        <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-900">
          {issueError}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Chef list */}
        <div>
          <h3 className="mb-3 font-semibold text-[var(--color-charcoal)]">Select Chef</h3>
          <div className="max-h-96 space-y-1 overflow-y-auto">
            {chefs.map((chef) => (
              <button
                key={chef.id}
                onClick={() => loadInfractions(chef.id)}
                className={`w-full rounded-xl px-4 py-3 text-left text-sm transition-colors ${
                  selectedChefId === chef.id
                    ? "bg-[var(--color-oxblood)] text-white"
                    : "bg-[var(--color-warm-cream)] text-[var(--color-charcoal)] hover:bg-[var(--color-oxblood)]/10"
                }`}
                type="button"
              >
                <span className="font-semibold">{chef.displayName}</span>
                <span className="ml-2 text-xs opacity-60">{chef.email}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Infractions + issue form */}
        <div>
          {selectedChefId ? (
            <>
              <h3 className="mb-3 font-semibold text-[var(--color-charcoal)]">
                Infraction History
              </h3>
              {infractions.length === 0 ? (
                <p className="rounded-2xl bg-[var(--color-warm-cream)] p-4 text-sm text-[var(--color-charcoal)]/70">
                  No infractions recorded.
                </p>
              ) : (
                <div className="mb-4 max-h-64 space-y-2 overflow-y-auto">
                  {infractions.map((inf) => (
                    <div
                      key={inf.id}
                      className="rounded-xl border border-[var(--color-oxblood)]/10 p-3 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <StatusBadge status={inf.severity} />
                        <span className="text-xs text-[var(--color-charcoal)]/50">
                          {inf.category.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="mt-1 text-[var(--color-charcoal)]/70">{inf.reason}</p>
                      <p className="mt-1 text-xs text-[var(--color-charcoal)]/50">
                        {new Date(inf.createdAt).toLocaleDateString("en-ZA")}
                      </p>
                      {inf.resolvedAt ? (
                        <p className="text-xs text-emerald-600">Resolved: {inf.resolution}</p>
                      ) : (
                        <button
                          onClick={() => resolveInfraction(inf.id)}
                          className="mt-1 text-xs font-semibold text-[var(--color-oxblood)] hover:underline"
                          type="button"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Issue form */}
              <h3 className="mb-3 mt-6 font-semibold text-[var(--color-charcoal)]">
                Issue New Infraction
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  issueInfraction(
                    selectedChefId,
                    String(form.get("severity") ?? "WARNING"),
                    String(form.get("category") ?? "OTHER"),
                    String(form.get("reason") ?? ""),
                  );
                }}
                className="space-y-3"
              >
                <label className="block text-sm font-bold text-[var(--color-charcoal)]">
                  Severity
                  <select
                    name="severity"
                    className="mt-1 min-h-10 w-full rounded-xl border border-[var(--color-oxblood)]/15 px-3 text-sm"
                  >
                    <option value="WARNING">Warning</option>
                    <option value="SUSPENSION">Suspension</option>
                    <option value="DEACTIVATION">Deactivation</option>
                  </select>
                </label>
                <label className="block text-sm font-bold text-[var(--color-charcoal)]">
                  Category
                  <select
                    name="category"
                    className="mt-1 min-h-10 w-full rounded-xl border border-[var(--color-oxblood)]/15 px-3 text-sm"
                  >
                    <option value="CANCELLATION_PATTERN">Cancellation Pattern</option>
                    <option value="LOW_RATING">Low Rating</option>
                    <option value="FOOD_SAFETY">Food Safety</option>
                    <option value="CONDUCT">Conduct</option>
                    <option value="NO_SHOW">No Show</option>
                    <option value="FRAUD">Fraud</option>
                    <option value="DOCUMENT_EXPIRED">Document Expired</option>
                    <option value="OTHER">Other</option>
                  </select>
                </label>
                <label className="block text-sm font-bold text-[var(--color-charcoal)]">
                  Reason
                  <input
                    name="reason"
                    required
                    className="mt-1 min-h-10 w-full rounded-xl border border-[var(--color-oxblood)]/15 px-3 text-sm"
                    placeholder="Describe the infraction..."
                  />
                </label>
                <button
                  className="w-full rounded-xl bg-[var(--color-oxblood)] py-2.5 text-sm font-bold text-white transition-opacity disabled:opacity-50"
                  disabled={issueBusy}
                  type="submit"
                >
                  {issueBusy ? "Issuing..." : "Issue Infraction"}
                </button>
              </form>
            </>
          ) : (
            <p className="rounded-2xl bg-[var(--color-warm-cream)] p-4 text-sm text-[var(--color-charcoal)]/70">
              Select a chef to view their infraction history and issue new enforcement actions.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function getApiBase(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

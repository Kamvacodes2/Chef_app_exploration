"use client";

import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  fetchChefs,
  requestChefDocReupload,
  type ChefSummary,
  type DocReuploadStatus,
} from "@/features/platform/api/platformClient";

type ReuploadDocType = DocReuploadStatus["requiredDocuments"][number];

const DOC_LABELS: Record<ReuploadDocType, string> = {
  ID_DOC: "ID",
  BACKGROUND_CHECK: "Background check",
  CV: "CV",
  QUALIFICATION: "Qualification",
  FOOD_SAFETY: "Food safety",
};

export function AdminChefs() {
  const [chefs, setChefs] = useState<ChefSummary[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setChefs(await fetchChefs());
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function initial() {
      try {
        const items = await fetchChefs();
        if (!cancelled) setChefs(items);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Load failed");
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
    void initial();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSendAccess = async (chef: ChefSummary): Promise<void> => {
    setSending(chef.id);
    setError(null);
    setNotice(null);
    try {
      await requestChefDocReupload(chef.id);
      setNotice(`Re-upload access email sent to ${chef.email}.`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send the re-upload request.");
    } finally {
      setSending(null);
    }
  };

  if (busy) {
    return (
      <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-[var(--color-charcoal)]/75">
        Loading chefs...
      </p>
    );
  }

  if (error && chefs.length === 0) {
    return <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-900">{error}</p>;
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
      <h2 className="text-2xl font-black text-[var(--color-oxblood)]">Chefs</h2>
      <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">
        {chefs.length} chef{chefs.length !== 1 ? "s" : ""} registered
      </p>

      {error ? (
        <p
          className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-900"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {notice ? (
        <p
          className="mt-4 rounded-2xl bg-green-50 p-3 text-sm font-semibold text-green-900"
          role="status"
        >
          {notice}
        </p>
      ) : null}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-oxblood)]/10 bg-[var(--color-warm-cream)]">
            <tr>
              {["Name", "Email", "Service Area", "Available", "Bank Details", "Docs & Terms"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-charcoal)]/50"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-oxblood)]/5">
            {chefs.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
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
                  <td className="px-4 py-3">
                    <DocReuploadCell
                      chef={chef}
                      busySending={sending === chef.id}
                      onSend={() => void handleSendAccess(chef)}
                    />
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

function DocReuploadCell({
  chef,
  busySending,
  onSend,
}: {
  readonly chef: ChefSummary;
  readonly busySending: boolean;
  readonly onSend: () => void;
}) {
  const status = chef.docReupload;
  if (!status) {
    return (
      <button
        type="button"
        onClick={onSend}
        disabled={busySending}
        className="min-h-9 rounded-xl border border-[var(--color-oxblood)]/20 px-3 text-sm font-bold text-[var(--color-oxblood)] disabled:opacity-40"
      >
        {busySending ? "Sending…" : "Send re-upload access"}
      </button>
    );
  }
  const completed = status.completedDocuments.length;
  const total = status.requiredDocuments.length;
  return (
    <div className="flex flex-col items-start gap-2">
      {status.termsAccepted ? (
        <StatusBadge status="active" label="Terms accepted" />
      ) : status.documentsCompletedAt ? (
        <StatusBadge status="active" label="Docs uploaded — awaiting terms" />
      ) : (
        <StatusBadge status="pending" label={`Docs ${completed}/${total}`} />
      )}
      <p className="text-xs text-[var(--color-charcoal)]/60">
        {status.completedDocuments.length > 0
          ? `Missing: ${
              status.requiredDocuments
                .filter((docType) => !status.completedDocuments.includes(docType))
                .map((docType) => DOC_LABELS[docType])
                .join(", ") || "none"
            }`
          : `Required: ${status.requiredDocuments.map((docType) => DOC_LABELS[docType]).join(", ")}`}
      </p>
      {!status.termsAccepted ? (
        <button
          type="button"
          onClick={onSend}
          disabled={busySending}
          className="min-h-9 rounded-xl border border-[var(--color-oxblood)]/20 px-3 text-sm font-bold text-[var(--color-oxblood)] disabled:opacity-40"
        >
          {busySending ? "Sending…" : "Re-send access"}
        </button>
      ) : null}
    </div>
  );
}

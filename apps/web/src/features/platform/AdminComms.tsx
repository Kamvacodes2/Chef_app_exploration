"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  fetchCommunicationLogs,
  type CommunicationLog,
} from "@/features/platform/api/platformClient";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminComms() {
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchCommunicationLogs();
        if (!cancelled) setLogs(data);
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
        Loading communication logs...
      </p>
    );
  }

  if (error) {
    return <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-900">{error}</p>;
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
      <h2 className="text-2xl font-black text-[var(--color-oxblood)]">Communication Logs</h2>
      <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">
        {logs.length} log entry recorded
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-oxblood)]/10 bg-[var(--color-warm-cream)]">
            <tr>
              {["Channel", "Status", "Recipient", "Template", "Sent"].map((h) => (
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
            {logs.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-[var(--color-charcoal)]/50"
                >
                  No communication logs yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 font-medium text-[var(--color-charcoal)]">
                    {log.channel}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={log.status} />
                  </td>
                  <td className="px-4 py-3 text-[var(--color-charcoal)]/70">{log.recipient}</td>
                  <td className="px-4 py-3 text-[var(--color-charcoal)]/70">{log.templateKey}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-[var(--color-charcoal)]/70">
                    {log.sentAt ? formatDate(log.sentAt) : "—"}
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

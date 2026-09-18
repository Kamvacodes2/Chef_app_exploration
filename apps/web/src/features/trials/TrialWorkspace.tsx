"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getChefmateApiUrl } from "@/lib/env";

type Role = "CUSTOMER" | "CHEF";
interface Trial {
  readonly id: string;
  readonly status: string;
  readonly amountCents: number;
  readonly chefPayoutCents: number;
  readonly platformShareCents: number;
  readonly sessionsTotal: number;
  readonly sessionsUsed: number;
  readonly startsAt: string;
  readonly addressReady: boolean;
  readonly chef?: { readonly displayName: string; readonly email: string };
  readonly customer?: {
    readonly displayName: string;
    readonly email: string;
    readonly phone: string | null;
  };
}
interface Proposal {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly status: string;
  readonly author: { readonly displayName: string };
  readonly attachments: readonly {
    readonly id: string;
    readonly originalName: string;
    readonly mimeType: string;
  }[];
  readonly comments: readonly {
    readonly id: string;
    readonly body: string;
    readonly author: { readonly displayName: string };
  }[];
}

async function api(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(`${getChefmateApiUrl()}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return ((await response.json()) as { data: unknown }).data;
}

export function TrialWorkspace({ role }: { readonly role: Role }): React.ReactElement | null {
  const [trial, setTrial] = useState<Trial | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [comment, setComment] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async (): Promise<void> => {
    const data = (await api(role === "CHEF" ? "/api/v1/chef/trials" : "/api/v1/trials/mine")) as {
      items: Trial[];
    };
    const next = data.items[0] ?? null;
    setTrial(next);
    if (next) {
      const proposalData = (await api(`/api/v1/trials/${next.id}/proposals`)) as {
        items: Proposal[];
      };
      setProposals(proposalData.items);
    }
  };

  useEffect(() => {
    void load().catch(() => undefined);
  }, [role]);

  const createProposal = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!trial) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api(`/api/v1/trials/${trial.id}/proposals`, {
        method: "POST",
        body: JSON.stringify({ title, body }),
      });
      setTitle("");
      setBody("");
      setMessage("Menu proposal sent to the customer.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send proposal.");
    } finally {
      setBusy(false);
    }
  };

  const decide = async (
    proposalId: string,
    decision: "APPROVED" | "CHANGES_REQUESTED",
  ): Promise<void> => {
    if (!trial) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/v1/trials/${trial.id}/proposals/${proposalId}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update proposal.");
    } finally {
      setBusy(false);
    }
  };

  const addComment = async (proposalId: string): Promise<void> => {
    if (!trial || !comment[proposalId]?.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/v1/trials/${trial.id}/proposals/${proposalId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: comment[proposalId] }),
      });
      setComment((previous) => ({ ...previous, [proposalId]: "" }));
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add comment.");
    } finally {
      setBusy(false);
    }
  };

  if (!trial) return null;
  return (
    <section className="space-y-4 rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-terracotta)]">
            Chefmate 4-day trial
          </p>
          <h3 className="mt-1 text-xl font-black text-[var(--color-oxblood)]">
            {role === "CHEF" ? trial.customer?.displayName : trial.chef?.displayName}
          </h3>
          <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">
            {trial.sessionsUsed} of {trial.sessionsTotal} sessions complete · starts{" "}
            {new Date(trial.startsAt).toLocaleString("en-ZA")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-black text-[var(--color-oxblood)]">
            R{(trial.amountCents / 100).toFixed(2)}
          </p>
          <p className="text-xs text-[var(--color-charcoal)]/60">Paid · {trial.status}</p>
        </div>
      </div>
      {role === "CHEF" && !trial.addressReady ? (
        <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          The customer has not supplied a visit address yet. The address will appear here once
          entered.
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-900">{error}</p>
      ) : null}
      {role === "CHEF" ? (
        <form
          className="space-y-3 rounded-2xl bg-[var(--color-warm-cream)] p-4"
          onSubmit={(event) => void createProposal(event)}
        >
          <h4 className="font-black text-[var(--color-oxblood)]">Send a menu proposal</h4>
          <input
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Proposal title"
            className="min-h-11 w-full rounded-xl border border-[var(--color-oxblood)]/15 px-3"
          />
          <textarea
            required
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write the proposed menu and guidance..."
            rows={5}
            className="w-full rounded-xl border border-[var(--color-oxblood)]/15 p-3"
          />
          <button
            disabled={busy}
            className="rounded-xl bg-[var(--color-oxblood)] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            type="submit"
          >
            Send proposal
          </button>
        </form>
      ) : null}
      <div className="space-y-4">
        <h4 className="font-black text-[var(--color-oxblood)]">Menu proposals</h4>
        {proposals.length === 0 ? (
          <p className="text-sm text-[var(--color-charcoal)]/60">No menu proposals yet.</p>
        ) : (
          proposals.map((proposal) => (
            <article
              key={proposal.id}
              className="rounded-2xl border border-[var(--color-oxblood)]/10 p-4"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <h5 className="font-black">{proposal.title}</h5>
                <span className="rounded-full bg-[var(--color-warm-cream)] px-2 py-1 text-xs font-bold">
                  {proposal.status}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--color-charcoal)]/80">
                {proposal.body}
              </p>
              {proposal.attachments.map((attachment) => (
                <p
                  key={attachment.id}
                  className="mt-2 text-xs font-semibold text-[var(--color-terracotta)]"
                >
                  Attachment: {attachment.originalName}
                </p>
              ))}
              <div className="mt-4 space-y-2 border-t border-[var(--color-oxblood)]/10 pt-3">
                {proposal.comments.map((item) => (
                  <p key={item.id} className="text-sm">
                    <strong>{item.author.displayName}:</strong> {item.body}
                  </p>
                ))}
                <div className="flex gap-2">
                  <input
                    value={comment[proposal.id] ?? ""}
                    onChange={(event) =>
                      setComment((previous) => ({ ...previous, [proposal.id]: event.target.value }))
                    }
                    placeholder="Write a comment or change request"
                    className="min-h-10 min-w-0 flex-1 rounded-xl border border-[var(--color-oxblood)]/15 px-3 text-sm"
                  />
                  <button
                    disabled={busy}
                    onClick={() => void addComment(proposal.id)}
                    className="rounded-xl border border-[var(--color-oxblood)]/20 px-3 text-sm font-bold text-[var(--color-oxblood)]"
                    type="button"
                  >
                    Comment
                  </button>
                </div>
              </div>
              {role === "CUSTOMER" && proposal.status !== "APPROVED" ? (
                <div className="mt-3 flex gap-2">
                  <button
                    disabled={busy}
                    onClick={() => void decide(proposal.id, "APPROVED")}
                    className="rounded-xl bg-emerald-700 px-3 py-2 text-sm font-bold text-white"
                    type="button"
                  >
                    Approve menu
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => void decide(proposal.id, "CHANGES_REQUESTED")}
                    className="rounded-xl border border-amber-600 px-3 py-2 text-sm font-bold text-amber-800"
                    type="button"
                  >
                    Request changes
                  </button>
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

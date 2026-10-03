"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cancelCustomerSubscription,
  fetchCustomerSubscriptions,
  fetchSubscriptionManageLink,
  formatSubscriptionAmount,
  formatSubscriptionDate,
  type CustomerSubscription,
  type CustomerSubscriptionOverview,
  type CustomerSubscriptionStatus,
} from "./api/subscriptionsClient";

const cardClass = "rounded-2xl border border-[var(--color-oxblood)]/15 bg-white p-6 shadow-sm";
const primaryButton =
  "rounded-xl bg-[var(--color-oxblood)] px-4 py-2 font-bold text-white disabled:opacity-50";
const secondaryButton =
  "rounded-xl border border-[var(--color-oxblood)]/30 px-4 py-2 font-bold text-[var(--color-oxblood)] disabled:opacity-50";

/** Wording per status. `ATTENTION` is the grace period, not a lockout. */
const STATUS_COPY: Readonly<
  Record<
    CustomerSubscriptionStatus,
    { readonly label: string; readonly tone: string; readonly detail: string }
  >
> = {
  ACTIVE: {
    label: "Active",
    tone: "text-emerald-700",
    detail:
      "Your card will be charged each month. Cancel any time and you keep every session you have paid for.",
  },
  ATTENTION: {
    label: "Payment problem",
    tone: "text-amber-700",
    detail:
      "We could not take your last payment. Your sessions are unaffected - update your card to avoid any delay.",
  },
  NON_RENEWING: {
    label: "Not renewing",
    tone: "text-slate-700",
    detail:
      "You will not be charged again. Your sessions remain available until you have used them.",
  },
  COMPLETED: {
    label: "Finished",
    tone: "text-slate-700",
    detail: "Every paid session has been used. Thank you.",
  },
  CANCELLED: {
    label: "Cancelled",
    tone: "text-slate-700",
    detail: "This subscription was cancelled. Any sessions you had paid for were kept.",
  },
};

export function SubscriptionsPage() {
  const [data, setData] = useState<CustomerSubscriptionOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback(async () => {
    setData(await fetchCustomerSubscriptions());
  }, []);

  useEffect(() => {
    void load()
      .catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : "Could not load your subscription."),
      )
      .finally(() => setLoading(false));
  }, [load]);

  const run = async (action: () => Promise<void>, message: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      await load();
      setNotice(message);
      setConfirming(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const openManageLink = async (code: string) => {
    setBusy(true);
    setError(null);
    try {
      const url = await fetchSubscriptionManageLink(code);
      window.location.assign(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not open your billing page.");
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="p-6 text-sm text-slate-600">Loading your subscription…</p>;
  }

  const subscriptions = data?.subscriptions ?? [];

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-[var(--color-oxblood)]">My subscription</h1>
        <p className="mt-1 text-sm text-slate-600">
          Your monthly plan, the card we charge, and how to stop.
        </p>
      </header>

      {error ? (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </p>
      ) : null}

      {data?.enabled === false ? (
        <div className={cardClass}>
          <p className="text-sm text-slate-700">
            Monthly plans are not switched on yet. Your sessions are managed as a package for now.
          </p>
        </div>
      ) : null}

      {data?.enabled === true && subscriptions.length === 0 ? (
        <div className={cardClass}>
          <p className="text-sm text-slate-700">You do not have a monthly subscription.</p>
        </div>
      ) : null}

      {subscriptions.map((subscription) => (
        <SubscriptionCard
          key={subscription.paystackSubscriptionCode}
          subscription={subscription}
          busy={busy}
          confirming={confirming === subscription.paystackSubscriptionCode}
          onConfirm={() => setConfirming(subscription.paystackSubscriptionCode)}
          onDismissConfirm={() => setConfirming(null)}
          onManage={() => void openManageLink(subscription.paystackSubscriptionCode)}
          onCancel={() =>
            void run(
              () => cancelCustomerSubscription(subscription.paystackSubscriptionCode),
              "Your subscription is cancelled. You keep every session you have paid for.",
            )
          }
        />
      ))}
    </div>
  );
}

function SubscriptionCard({
  subscription,
  busy,
  confirming,
  onConfirm,
  onDismissConfirm,
  onManage,
  onCancel,
}: {
  readonly subscription: CustomerSubscription;
  readonly busy: boolean;
  readonly confirming: boolean;
  readonly onConfirm: () => void;
  readonly onDismissConfirm: () => void;
  readonly onManage: () => void;
  readonly onCancel: () => void;
}) {
  const copy = STATUS_COPY[subscription.status];
  const nextPayment = formatSubscriptionDate(subscription.nextPaymentAt);
  const card = [
    subscription.cardBrand,
    subscription.cardLast4 ? `•••• ${subscription.cardLast4}` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const ended =
    subscription.status === "CANCELLED" ||
    subscription.status === "COMPLETED" ||
    subscription.status === "NON_RENEWING";

  return (
    <section className={cardClass}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold capitalize">{subscription.planId}</h2>
          <p className={`text-sm font-bold ${copy.tone}`}>{copy.label}</p>
        </div>
        <p className="text-xl font-bold">
          {formatSubscriptionAmount(subscription.amountCents, subscription.currency)}
          <span className="text-sm font-normal text-slate-600"> / month</span>
        </p>
      </div>

      <p className="mt-3 text-sm text-slate-700">{copy.detail}</p>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Sessions paid for</dt>
          <dd className="font-bold">{subscription.sessionsGranted}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Card</dt>
          <dd className="font-bold capitalize">{card || "None on file"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">{ended ? "Access until" : "Next payment"}</dt>
          <dd className="font-bold">{nextPayment ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Started</dt>
          <dd className="font-bold">{formatSubscriptionDate(subscription.createdAt) ?? "—"}</dd>
        </div>
      </dl>

      {subscription.cardReusable === false ? (
        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          This card cannot be charged again, so your subscription will not renew. Update your card
          to keep it going.
        </p>
      ) : null}

      {!ended ? (
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" className={secondaryButton} onClick={onManage} disabled={busy}>
            Update card
          </button>
          {confirming ? (
            <>
              <button type="button" className={primaryButton} onClick={onCancel} disabled={busy}>
                Yes, cancel my subscription
              </button>
              <button
                type="button"
                className={secondaryButton}
                onClick={onDismissConfirm}
                disabled={busy}
              >
                Keep it
              </button>
            </>
          ) : (
            <button type="button" className={secondaryButton} onClick={onConfirm} disabled={busy}>
              Cancel subscription
            </button>
          )}
        </div>
      ) : null}

      {confirming ? (
        <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          You will not be charged again, and every session you have already paid for stays on your
          account.
        </p>
      ) : null}
    </section>
  );
}

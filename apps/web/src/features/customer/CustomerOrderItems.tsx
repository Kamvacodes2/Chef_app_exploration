"use client";

import { useState } from "react";
import {
  downloadCustomerIngredientsPdf,
  type CustomerOrderItem,
} from "@/features/customer/api/customerBookingsClient";

export function CustomerOrderItems({
  bookingId,
  items,
}: {
  readonly bookingId: string;
  readonly items: readonly CustomerOrderItem[];
}) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const downloadPdf = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      const blob = await downloadCustomerIngredientsPdf(bookingId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Chefmate-ingredients.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError("Could not download the ingredients list. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  if (items.length === 0) return null;
  return (
    <details className="mt-3 rounded-xl border border-[var(--color-oxblood)]/10 bg-[var(--color-warm-cream)]/45 p-3">
      <summary className="cursor-pointer text-sm font-bold text-[var(--color-oxblood)]">
        View all meals, ingredients &amp; shopping links ({items.length})
      </summary>
      <ul className="mt-3 space-y-3">
        {items.map((item, index) => (
          <li
            className="border-t border-[var(--color-oxblood)]/10 pt-3 first:border-0 first:pt-0"
            key={`${item.groupLabel}-${item.slug ?? item.externalUrl ?? item.name}-${index}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-charcoal)]/60">
              {item.groupLabel}
            </p>
            <p className="mt-0.5 text-sm font-bold text-[var(--color-charcoal)]">{item.name}</p>
            {item.ingredients.length > 0 ? (
              <p className="mt-1 text-xs leading-relaxed text-[var(--color-charcoal)]/75">
                Ingredients: {item.ingredients.join(", ")}
              </p>
            ) : item.kind !== "link" ? (
              <p className="mt-1 text-xs text-[var(--color-charcoal)]/60">
                Ingredients will be confirmed before your session.
              </p>
            ) : null}
            {item.shoppingListUrl ? (
              <a
                className="mt-1 inline-block text-xs font-bold text-[var(--color-oxblood)] underline"
                href={item.shoppingListUrl}
                rel="noreferrer"
                target="_blank"
              >
                Open Checkers Sixty60 list
              </a>
            ) : null}
            {item.externalUrl ? (
              <a
                className="mt-1 inline-block text-xs font-bold text-[var(--color-oxblood)] underline"
                href={item.externalUrl}
                rel="noreferrer"
                target="_blank"
              >
                Open recipe link
              </a>
            ) : null}
          </li>
        ))}
      </ul>
      <button
        className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-[var(--color-oxblood)] px-4 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60"
        disabled={downloading}
        onClick={() => void downloadPdf()}
        type="button"
      >
        {downloading ? "Preparing PDF…" : "Download ingredients PDF"}
      </button>
      {downloadError ? (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {downloadError}
        </p>
      ) : null}
    </details>
  );
}

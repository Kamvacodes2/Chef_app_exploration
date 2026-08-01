"use client";

import type { FormEvent, ReactElement } from "react";
import { useOrder } from "../state/OrderContext";

const GIFT_CODE_INPUT_ID = "gift-code-input";

export function GiftCodeForm(): ReactElement {
  const { state, setGiftInput, applyGift, removeGift } = useOrder();
  const { appliedGift, giftCodeInput, giftMessage } = state;

  if (appliedGift) {
    return (
      <div className="flex flex-col gap-2 rounded-3xl bg-white/[0.04] p-4 ring-1 ring-white/10">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-bone)]/60">
          Discount code
        </p>
        <div className="flex items-center justify-between gap-4">
          <p role="status" className="text-sm text-[var(--color-bone)]">
            {appliedGift.code} — {giftMessage}
          </p>
          <button
            type="button"
            onClick={removeGift}
            className="shrink-0 text-xs font-bold uppercase tracking-wider text-[var(--color-maize)] underline-offset-2 hover:underline"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    applyGift();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-3xl bg-white/[0.04] p-4 ring-1 ring-white/10"
    >
      <label
        htmlFor={GIFT_CODE_INPUT_ID}
        className="text-xs font-bold uppercase tracking-wider text-[var(--color-bone)]/60"
      >
        Discount code
      </label>
      <div className="flex items-center gap-2">
        <input
          id={GIFT_CODE_INPUT_ID}
          type="text"
          value={giftCodeInput}
          onChange={(event) => setGiftInput(event.target.value)}
          placeholder="e.g. CHILL10"
          className="w-full rounded-2xl bg-white/90 p-3.5 text-sm text-[var(--color-oxblood)] placeholder:text-[var(--color-oxblood)]/40 focus:outline focus:outline-2 focus:outline-[var(--color-bone)]"
        />
        <button
          type="submit"
          className="shrink-0 rounded-2xl bg-[var(--color-maize)] px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--color-oxblood)]"
        >
          Apply
        </button>
      </div>
      {giftMessage ? (
        <p role="status" className="text-xs text-[var(--color-bone)]/80">
          {giftMessage}
        </p>
      ) : null}
    </form>
  );
}

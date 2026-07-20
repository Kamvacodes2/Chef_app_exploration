"use client";

import Image from "next/image";
import type { ReactElement } from "react";
import { useOrder } from "../state/OrderContext";

function formatZAR(amount: number): string {
  return `R${amount}`;
}

function friendlyDateTime(iso: string | null, time: string | null): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T${time ?? "18:30"}`);
  return d.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" }) + (time ? ` · ${time}` : "");
}

/**
 * Review the full order before confirming: dishes, schedule, address, gift
 * code, and the running total. Confirming places the order.
 */
export function ReviewStep(): ReactElement {
  const { state, subtotal, discount, total, setGiftInput, applyGift, removeGift } = useOrder();

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-3xl font-semibold text-[#F3E3B2] sm:text-4xl">Your order</h2>
        <p className="text-sm text-[#F3E3B2]/70">Give it a once-over before we fire up the stove.</p>
      </div>

      <div className="grid w-full gap-4 lg:grid-cols-[1fr_320px]">
        {/* Items */}
        <div className="flex flex-col gap-3">
          {state.main && (
            <div className="flex items-center gap-3 rounded-3xl bg-white/[0.06] p-3 ring-1 ring-white/10">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[#2A2F18]">
                <Image src={state.main.imageSrc} alt={state.main.imageAlt} fill sizes="64px" className="object-cover" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#F3E3B2]">{state.main.name}</p>
                {state.customRequest && (
                  <p className="line-clamp-2 text-xs italic text-[#F3E3B2]/70">&ldquo;{state.customRequest}&rdquo; — the kitchen will confirm</p>
                )}
              </div>
              <span className="text-sm font-bold text-[#F3E3B2]">{state.main.priceDisplay}</span>
            </div>
          )}

          {state.sides.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-3xl bg-white/[0.04] p-3 ring-1 ring-white/10">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#2A2F18]">
                <Image src={s.imageSrc} alt={s.imageAlt} fill sizes="48px" className="object-cover" />
              </div>
              <p className="flex-1 text-sm text-[#F3E3B2]/90">{s.name} <span className="text-xs text-[#F3E3B2]/50">(side)</span></p>
              <span className="text-sm font-semibold text-[#F3E3B2]">{s.priceDisplay}</span>
            </div>
          ))}

          {state.dessert && (
            <div className="flex items-center gap-3 rounded-3xl bg-white/[0.04] p-3 ring-1 ring-white/10">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#2A2F18]">
                <Image src={state.dessert.imageSrc} alt={state.dessert.imageAlt} fill sizes="48px" className="object-cover" />
              </div>
              <p className="flex-1 text-sm text-[#F3E3B2]/90">{state.dessert.name} <span className="text-xs text-[#F3E3B2]/50">(dessert)</span></p>
              <span className="text-sm font-semibold text-[#F3E3B2]">{state.dessert.priceDisplay}</span>
            </div>
          )}

          {/* Delivery details */}
          <div className="mt-2 flex flex-col gap-1 rounded-3xl bg-white/[0.04] p-4 ring-1 ring-white/10">
            <p className="text-xs font-bold uppercase tracking-wider text-[#F3E3B2]/60">Delivery</p>
            <p className="text-sm text-[#F3E3B2]">{friendlyDateTime(state.date, state.time)}</p>
            <p className="text-sm text-[#F3E3B2]/80">
              {[state.address.unit, state.address.street].filter(Boolean).join(", ")}
              {state.address.estate ? ` · ${state.address.estate}` : ""}
            </p>
          </div>
        </div>

        {/* Summary + gift */}
        <div className="flex h-fit flex-col gap-4 rounded-3xl bg-white p-5 text-[#1A1208] lg:sticky lg:top-4">
          <h3 className="font-display text-lg font-semibold">Summary</h3>

          {/* Gift code */}
          {state.appliedGift ? (
            <div className="flex items-center justify-between rounded-2xl bg-[#2A2F18]/5 p-3">
              <div>
                <p className="text-sm font-bold text-[#2A2F18]">{state.appliedGift.code}</p>
                <p className="text-xs text-[#2A2F18]/60">{state.giftMessage}</p>
              </div>
              <button type="button" onClick={removeGift} className="text-xs font-semibold text-[#74070D] underline underline-offset-2">
                Remove
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <label htmlFor="gift-code" className="text-xs font-bold uppercase tracking-wider text-[#1A1208]/60">
                Gift code
              </label>
              <div className="flex gap-2">
                <input
                  id="gift-code"
                  type="text"
                  value={state.giftCodeInput}
                  onChange={(e) => setGiftInput(e.target.value)}
                  placeholder="CHILL10"
                  className="w-full flex-1 rounded-xl border border-[#1A1208]/15 p-2.5 text-sm uppercase placeholder:normal-case focus:outline focus:outline-2 focus:outline-[#2A2F18]"
                />
                <button
                  type="button"
                  onClick={applyGift}
                  disabled={state.giftCodeInput.trim().length === 0}
                  className="rounded-xl bg-[#2A2F18] px-4 text-sm font-bold text-[#F3E3B2] transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                >
                  Apply
                </button>
              </div>
              {state.giftMessage && <p className="text-xs text-[#74070D]">{state.giftMessage}</p>}
            </div>
          )}

          <div className="flex flex-col gap-1.5 border-t border-[#1A1208]/10 pt-3 text-sm">
            <div className="flex justify-between text-[#1A1208]/70">
              <span>Subtotal</span>
              <span>{formatZAR(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-[#2A2F18]">
                <span>Discount</span>
                <span>-{formatZAR(discount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-[#1A1208]/10 pt-2 text-base font-bold">
              <span>Total</span>
              <span>{formatZAR(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import type { ReactElement } from "react";
import { findChefmatePlan, PREFERRED_DAYS } from "@/features/plans/planCatalog";
import { INCLUDED_SIDE_COUNT } from "../constants/menu";
import { findItem } from "../state/orderReducer";
import { useOrder } from "../state/OrderContext";
import { GiftCodeForm } from "./GiftCodeForm";
import type { OrderMenuItem } from "../types";

function friendlyDateTime(iso: string | null, time: string | null): string {
  if (!iso) return "Not selected yet";
  const date = new Date(iso + "T" + (time ?? "18:30"));
  const day = date.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" });
  return time ? day + " - " + time : day;
}

export function formatZarCents(amountCents: number): string {
  const fractionDigits = amountCents % 100 === 0 ? 0 : 2;
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amountCents / 100);
}

export function pricingLineLabel(priceCents: number | undefined): string {
  if (priceCents === undefined) return "Pending";
  if (priceCents === 0) return "Included";
  return formatZarCents(priceCents);
}

function SelectionRow({
  item,
  kind,
  priceCents,
}: {
  readonly item: OrderMenuItem;
  readonly kind: "main" | "side" | "dessert";
  readonly priceCents: number | undefined;
}): ReactElement {
  const imageSize = kind === "main" ? "h-16 w-16 rounded-2xl" : "h-12 w-12 rounded-xl";

  return (
    <div className="flex items-center gap-3 rounded-3xl bg-white/[0.04] p-3 ring-1 ring-white/10">
      {kind !== "dessert" ? (
        <div className={"relative shrink-0 overflow-hidden bg-[var(--color-oxblood)] " + imageSize}>
          <Image
            src={item.imageSrc}
            alt={item.imageAlt}
            fill
            sizes={kind === "main" ? "64px" : "48px"}
            className="object-cover"
          />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--color-bone)]">{item.name}</p>
        {kind !== "main" ? <p className="text-xs text-[var(--color-bone)]/50">({kind})</p> : null}
      </div>
      <p className="shrink-0 text-sm font-semibold text-[var(--color-bone)]">
        {kind === "main" ? "Included in your session" : pricingLineLabel(priceCents)}
      </p>
    </div>
  );
}

export function ReviewStep(): ReactElement {
  const { state, pricingQuote, isPricingLoading, authenticatedUser, subtotal, discount, total } =
    useOrder();
  const address = [state.address.unit, state.address.street, state.address.area]
    .filter(Boolean)
    .join(", ");
  const contactName = authenticatedUser?.displayName ?? state.contact.name;
  const contactEmail = authenticatedUser?.email ?? state.contact.email;
  const hasPricingQuote = pricingQuote != null;
  const pricesBySlug = new Map(pricingQuote?.items.map((item) => [item.slug, item.priceCents]));
  const fallbackPriceFor = (
    item: OrderMenuItem,
    kind: "main" | "side" | "dessert",
    index = 0,
  ): number => {
    if (kind === "main") return 0;
    if (kind === "side" && index < INCLUDED_SIDE_COUNT) return 0;
    return Math.round(item.price * 100);
  };
  const priceFor = (
    item: OrderMenuItem,
    kind: "main" | "side" | "dessert",
    index = 0,
  ): number | undefined => {
    const quotedPrice = pricesBySlug.get(item.id);
    if (quotedPrice !== undefined) return quotedPrice;
    return hasPricingQuote ? undefined : fallbackPriceFor(item, kind, index);
  };
  const catalogPlan = findChefmatePlan(state.planId);
  const plan =
    pricingQuote?.plan ??
    (catalogPlan
      ? {
          id: catalogPlan.id,
          name: catalogPlan.name,
          sessions: catalogPlan.sessions,
          recurring: catalogPlan.recurring,
          priceCents: catalogPlan.priceCents,
        }
      : null);
  const subtotalCents = state.appliedGift
    ? Math.round(subtotal * 100)
    : (pricingQuote?.subtotalCents ?? Math.round(subtotal * 100));
  const discountCents = state.appliedGift
    ? Math.round(discount * 100)
    : (pricingQuote?.discountCents ?? Math.round(discount * 100));
  const totalCents = state.appliedGift
    ? Math.round(total * 100)
    : (pricingQuote?.totalCents ?? Math.round(total * 100));
  const isCustomRequest = state.main?.id === "custom-request";
  const isPlanRequest = Boolean(plan?.recurring);
  const isEstimatedPricing = !isCustomRequest && !hasPricingQuote;
  const totalLabel = isCustomRequest
    ? "Custom quote"
    : isEstimatedPricing
      ? isPlanRequest
        ? "Estimated monthly plan"
        : plan
          ? "Estimated package total"
          : "Estimated order total"
      : isPlanRequest
        ? "Monthly plan"
        : isPricingLoading
          ? "Updating total"
          : plan
            ? "Session total"
            : "Order total";
  const subtotalLabel = isCustomRequest
    ? "Recipe details"
    : isEstimatedPricing
      ? plan
        ? "Estimated package price"
        : "Estimated items"
      : plan
        ? "Package price"
        : "Items";
  const nextStepCopy = isCustomRequest
    ? "Send your request and Chefmate will review the recipe, confirm your tailored price, then send payment details before matching a chef."
    : isEstimatedPricing
      ? isPlanRequest
        ? "Estimated from your plan choices while Chefmate confirms the latest server price. You can send the plan request once the confirmed quote is ready."
        : "Estimated from your selections while Chefmate confirms the latest server price. Checkout will unlock once the confirmed quote is ready."
      : isPlanRequest
        ? "Send your plan request. Chefmate will confirm your recurring session schedule and email payment details before activating the plan."
        : plan
          ? "Once payment is confirmed, we confirm your first session and keep these package preferences with your booking."
          : "Once payment is confirmed, we match you with an available Chefmate.";
  // The favourite is a live-catalog slug, so its display name comes from the
  // item the plan step stored; `findItem` only still resolves legacy ids.
  const favourite = state.favoriteMealId
    ? state.main?.id === state.favoriteMealId
      ? state.main.name
      : (findItem(state.favoriteMealId)?.name ?? "Your selected favourite")
    : state.favoriteMealLink
      ? `Your linked meal (${state.favoriteMealLink.source.toLowerCase()})`
      : null;
  const secondFavourite = state.secondFavoriteMealId
    ? (findItem(state.secondFavoriteMealId)?.name ?? "Your selected second meal")
    : state.secondFavoriteMealLink
      ? `Your linked meal (${state.secondFavoriteMealLink.source.toLowerCase()})`
      : null;
  const preferredDays = state.preferredDays.flatMap((dayId) => {
    const day = PREFERRED_DAYS.find((candidate) => candidate.id === dayId);
    return day ? [day.label] : [];
  });

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-3xl font-semibold text-[var(--color-bone)] sm:text-4xl">
          Review your session
        </h2>
        <p className="text-sm text-[var(--color-bone)]/70">
          Give your meal choices and visit details one last look.
        </p>
      </div>

      <div className="grid w-full gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          {state.main ? (
            <SelectionRow item={state.main} kind="main" priceCents={priceFor(state.main, "main")} />
          ) : null}
          {state.sides.map((side, index) => (
            <SelectionRow
              key={side.id}
              item={side}
              kind="side"
              priceCents={priceFor(side, "side", index)}
            />
          ))}
          {state.dessert ? (
            <SelectionRow
              item={state.dessert}
              kind="dessert"
              priceCents={priceFor(state.dessert, "dessert")}
            />
          ) : null}

          {plan ? (
            <div className="flex flex-col gap-1 rounded-3xl bg-white/[0.04] p-4 ring-1 ring-white/10">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-bone)]/60">
                Package preferences
              </p>
              <p className="text-sm font-semibold text-[var(--color-bone)]">
                {plan.name} - {plan.sessions}
              </p>
              {plan.recurring ? (
                <p className="text-sm text-[var(--color-bone)]/80">
                  {state.planScheduleDeferred || preferredDays.length === 0
                    ? "Schedule: We will settle on a routine with you."
                    : "Preferred days: " + preferredDays.join(", ")}
                </p>
              ) : null}
              <p className="text-sm text-[var(--color-bone)]/80">
                Favourite meal: {favourite ?? "Choose each visit as you go."}
                {state.favoriteMealLink ? (
                  <a
                    href={state.favoriteMealLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 underline decoration-[var(--color-bone)]/40 underline-offset-2"
                  >
                    view link
                  </a>
                ) : null}
              </p>
              {secondFavourite ? (
                <p className="text-sm text-[var(--color-bone)]/80">
                  Meal-prep option 2: {secondFavourite}
                  {state.secondFavoriteMealLink ? (
                    <a
                      href={state.secondFavoriteMealLink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 underline decoration-[var(--color-bone)]/40 underline-offset-2"
                    >
                      view link
                    </a>
                  ) : null}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-2 flex flex-col gap-1 rounded-3xl bg-white/[0.04] p-4 ring-1 ring-white/10">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-bone)]/60">
              Visit details
            </p>
            <p className="text-sm text-[var(--color-bone)]">
              {friendlyDateTime(state.date, state.time)}
            </p>
            <p className="text-sm text-[var(--color-bone)]/80">{address}</p>
            {state.address.estate ? (
              <p className="text-sm text-[var(--color-bone)]/80">{state.address.estate}</p>
            ) : null}
            {contactName || state.contact.phone ? (
              <p className="mt-1 text-sm text-[var(--color-bone)]/80">
                {[contactName, state.contact.phone].filter(Boolean).join(" | ")}
              </p>
            ) : null}
            {contactEmail ? (
              <p className="text-sm text-[var(--color-bone)]/80">{contactEmail}</p>
            ) : null}
          </div>

          <GiftCodeForm />
        </div>

        <aside className="flex h-fit flex-col gap-4 rounded-3xl bg-[var(--color-bone)] p-5 text-[var(--color-oxblood)] lg:sticky lg:top-4">
          <h3 className="font-display text-2xl font-semibold">
            {isCustomRequest || isPlanRequest
              ? "What happens next"
              : plan
                ? "Your package"
                : "What happens next"}
          </h3>
          <div className="flex flex-col gap-2 border-b border-[var(--color-oxblood)]/15 pb-3">
            {plan ? (
              <p className="text-sm font-semibold text-[var(--color-oxblood)]/78">
                {plan.name} - {plan.sessions}
              </p>
            ) : null}
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm text-[var(--color-charcoal)]/75">{totalLabel}</span>
              <span className="font-display text-2xl font-semibold">
                {isCustomRequest
                  ? "To be confirmed"
                  : totalCents === undefined
                    ? "--"
                    : formatZarCents(totalCents)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-xs text-[var(--color-charcoal)]/65">
              <span>{subtotalLabel}</span>
              <span>
                {isCustomRequest
                  ? "Chefmate will confirm"
                  : subtotalCents === undefined
                    ? "--"
                    : formatZarCents(subtotalCents)}
              </span>
            </div>
            {discountCents > 0 ? (
              <div className="flex items-center justify-between gap-4 text-xs text-[var(--color-charcoal)]/65">
                <span>Discount</span>
                <span>-{formatZarCents(discountCents)}</span>
              </div>
            ) : null}
          </div>
          <p className="text-sm leading-6 text-[var(--color-charcoal)]/75">{nextStepCopy}</p>
        </aside>
      </div>
    </div>
  );
}

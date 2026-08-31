"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import type { ReactElement, ReactNode } from "react";
import { findChefmatePlan } from "@/features/plans/planCatalog";
import { useOrder } from "../state/OrderContext";

function customerAccountType(accountType: string): string {
  return accountType.trim().toUpperCase() === "MYMOBIZ CURRENT ACCOUNT"
    ? "CURRENT ACCOUNT"
    : accountType;
}

function formatZar(cents: number): string {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(cents / 100);
}

function DetailRow({
  label,
  children,
  inverted = false,
}: {
  readonly label: string;
  readonly children: ReactNode;
  readonly inverted?: boolean;
}): ReactElement {
  const border = inverted ? "border-[var(--color-oxblood)]/10" : "border-white/10";
  const labelColor = inverted ? "text-[var(--color-oxblood)]/60" : "text-[var(--color-bone)]/60";
  const valueColor = inverted ? "text-[var(--color-oxblood)]" : "text-[var(--color-bone)]";

  return (
    <div
      className={"flex items-start justify-between gap-4 border-b py-2 last:border-b-0 " + border}
    >
      <span className={"shrink-0 text-xs " + labelColor}>{label}</span>
      <span className={"text-right text-sm font-semibold " + valueColor}>{children}</span>
    </div>
  );
}

export function Confirmation(): ReactElement {
  const { state, bookingConfirmation, reset } = useOrder();
  const payment = bookingConfirmation?.payment;
  const bankTransfer = payment?.method === "BANK_TRANSFER" ? payment.bankTransfer : null;
  const paystack = payment?.method === "PAYSTACK" ? payment.paystack : null;
  const isReviewRequest = bookingConfirmation?.status === "NEEDS_REVIEW";
  const isPlanRequest = isReviewRequest && Boolean(findChefmatePlan(state.planId)?.recurring);
  const milestones = isPlanRequest
    ? ["Plan request received", "Schedule review", "Payment details", "Plan activation"]
    : isReviewRequest
      ? ["Request received", "Chefmate review", "Price confirmation", "Chef matching"]
      : ["Order received", "Payment review", "Chef matching", "Visit complete"];

  return (
    <div className="flex w-full flex-col items-center gap-6 py-8 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 14 }}
        className="flex items-center justify-center rounded-3xl bg-[var(--color-bone)] px-6 py-4"
        aria-hidden="true"
      >
        <Image
          src="/images/brand/logo.webp"
          alt=""
          width={965}
          height={393}
          className="h-10 w-auto"
        />
      </motion.div>

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-4xl font-semibold text-[var(--color-bone)]">
          {isPlanRequest
            ? "Thank you. Your plan request is received."
            : isReviewRequest
              ? "Thank you. Your request is received."
              : "Thank you for your order."}
        </h2>
        <p className="mx-auto max-w-md text-sm text-[var(--color-bone)]/70">
          {isPlanRequest
            ? "We will confirm your recurring routine and monthly payment details before activating your plan."
            : isReviewRequest
              ? "Our team will review your recipe and email a tailored price before payment."
              : `Thank you for ordering ${state.main?.name ?? "your meal"} for ${state.date ?? ""}${state.time ? " at " + state.time : ""}.`}
        </p>
        {bankTransfer && (
          <p className="mx-auto max-w-md text-sm text-[var(--color-bone)]/70">
            Please use the reference below when making your bank transfer. Once payment is verified,
            we will invite the nearest available chefs.
          </p>
        )}
      </div>

      <div className="flex w-full max-w-lg flex-col rounded-3xl bg-white/[0.06] p-5 text-left ring-1 ring-white/10">
        <DetailRow label="Order reference">{bookingConfirmation?.reference ?? "Pending"}</DetailRow>
        <DetailRow label="Main">{state.main?.name ?? "Not selected"}</DetailRow>
        <DetailRow label="Visit">
          {state.date ?? "Not selected"}
          {state.time ? " - " + state.time : ""}
        </DetailRow>
        <DetailRow label={isPlanRequest ? "Monthly plan" : isReviewRequest ? "Price" : "Amount"}>
          {bookingConfirmation
            ? isReviewRequest && !isPlanRequest
              ? "To be confirmed"
              : formatZar(bookingConfirmation.totalCents)
            : "Pending"}
        </DetailRow>
      </div>

      {bankTransfer ? (
        <div className="w-full max-w-lg rounded-3xl bg-[var(--color-bone)] p-5 text-left text-[var(--color-oxblood)]">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h3 className="font-display text-2xl font-semibold">Bank transfer</h3>
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-oxblood)]/60">
              {payment?.status}
            </span>
          </div>
          <dl className="divide-y divide-[var(--color-oxblood)]/10">
            <DetailRow label="Bank" inverted>
              {bankTransfer.bankName}
            </DetailRow>
            <DetailRow label="Branch" inverted>
              {bankTransfer.branchName} ({bankTransfer.branchCode})
            </DetailRow>
            {bankTransfer.electronicBranchCode ? (
              <DetailRow label="Electronic branch code" inverted>
                {bankTransfer.electronicBranchCode}
              </DetailRow>
            ) : null}
            {bankTransfer.swiftCode ? (
              <DetailRow label="SWIFT" inverted>
                {bankTransfer.swiftCode}
              </DetailRow>
            ) : null}
            <DetailRow label="Account holder" inverted>
              {bankTransfer.accountHolder}
            </DetailRow>
            <DetailRow label="Account number" inverted>
              {bankTransfer.accountNumber}
            </DetailRow>
            <DetailRow label="Account type" inverted>
              {customerAccountType(bankTransfer.accountType)}
            </DetailRow>
            <DetailRow label="Payment reference" inverted>
              {bankTransfer.paymentReference}
            </DetailRow>
          </dl>
        </div>
      ) : paystack ? (
        <div className="w-full max-w-lg rounded-3xl bg-[var(--color-bone)] p-5 text-left text-[var(--color-oxblood)]">
          <div className="mb-2 flex items-baseline justify-between gap-4">
            <h3 className="font-display text-2xl font-semibold">Payment details</h3>
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-oxblood)]/60">
              {payment?.status}
            </span>
          </div>
          <p className="text-sm leading-6 text-[var(--color-charcoal)]/75">
            A confirmation of your order and payment details has been sent to your email.
          </p>
        </div>
      ) : (
        <p className="max-w-md text-sm text-[var(--color-bone)]/70">
          {isPlanRequest
            ? "Chefmate will email your confirmed recurring schedule and payment details before the plan is activated."
            : isReviewRequest
              ? "Chefmate will email your tailored quote and payment details once the request is approved."
              : "Chefmate will prepare the secure payment link for this order."}
        </p>
      )}

      <ol className="grid w-full max-w-lg grid-cols-2 gap-x-4 gap-y-3 text-left sm:grid-cols-4">
        {milestones.map((label, index) => (
          <li
            key={label}
            className="flex items-center gap-2 text-xs font-semibold text-[var(--color-bone)]/70"
          >
            <span
              className={
                "flex h-5 w-5 items-center justify-center rounded-full text-[10px] " +
                (index === 0
                  ? "bg-[var(--color-bone)] text-[var(--color-oxblood)]"
                  : "bg-white/10 text-[var(--color-bone)]/70")
              }
            >
              {index + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={reset}
        className="rounded-2xl bg-[var(--color-bone)] px-8 py-3 font-display text-base text-[var(--color-oxblood)] shadow-lg transition-transform hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-bone)]"
      >
        Start another request
      </button>
    </div>
  );
}

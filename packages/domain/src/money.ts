/**
 * Money primitives (blueprint invariant 4.1.7, ADR-0004).
 *
 * Every monetary value in the system is an **integer number of cents** in
 * `ZAR`. Floating-point money is forbidden. This module owns only the type and
 * the guards; the pricing formula, allocation and journal templates belong to
 * S04 and S13 and are deliberately not implemented here.
 */

export const SUPPORTED_CURRENCY = "ZAR" as const;
export type Currency = typeof SUPPORTED_CURRENCY;

declare const centsBrand: unique symbol;
/** Branded integer cents. Construct with {@link cents}. */
export type Cents = number & { readonly [centsBrand]: true };

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyError";
  }
}

export function isCents(value: unknown): value is Cents {
  return typeof value === "number" && Number.isSafeInteger(value);
}

/** Narrows an arbitrary number to {@link Cents}, throwing if it is not exact. */
export function cents(value: number): Cents {
  if (!Number.isFinite(value)) {
    throw new MoneyError("Money must be a finite value");
  }
  if (!Number.isInteger(value)) {
    throw new MoneyError(`Money must be an integer number of cents, received ${value}`);
  }
  if (!Number.isSafeInteger(value)) {
    throw new MoneyError("Money exceeds the safe integer range");
  }
  return value as Cents;
}

export function nonNegativeCents(value: number): Cents {
  const amount = cents(value);
  if (amount < 0) {
    throw new MoneyError(`Money must not be negative, received ${value}`);
  }
  return amount;
}

export function addCents(...amounts: readonly Cents[]): Cents {
  return cents(amounts.reduce<number>((total, amount) => total + amount, 0));
}

export function subtractCents(minuend: Cents, subtrahend: Cents): Cents {
  return cents(minuend - subtrahend);
}

/**
 * Formats cents for display only. Never use the output as an input to another
 * calculation.
 */
export function formatZar(amount: Cents): string {
  const negative = amount < 0;
  const absolute = Math.abs(amount);
  const rands = Math.trunc(absolute / 100);
  const remainder = String(absolute % 100).padStart(2, "0");
  const grouped = String(rands).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${negative ? "-" : ""}R${grouped}.${remainder}`;
}

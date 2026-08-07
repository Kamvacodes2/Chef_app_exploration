import type { GiftCodeResult } from "../types";

/**
 * Demo gift codes. In production this would call the backend; here we keep a
 * small local map so the flow is fully functional end-to-end.
 */
const GIFT_CODES: Readonly<Record<string, { discountFraction: number; label: string }>> =
  Object.freeze({
    CHILL10: Object.freeze({ discountFraction: 0.1, label: "10% off applied" }),
    WINTER15: Object.freeze({
      discountFraction: 0.15,
      label: "15% winter warmer discount applied",
    }),
    FIRSTMEAL: Object.freeze({ discountFraction: 0.2, label: "20% off your first meal applied" }),
    CHEFMATE50: Object.freeze({
      discountFraction: 0.5,
      label: "50% off applied — thank you for waiting!",
    }),
    CHEFMATE15: Object.freeze({
      discountFraction: 0.15,
      label: "15% off applied — welcome to ChefMate!",
    }),
  });

/** Normalize a code (trim + uppercase) so entry is forgiving. */
export function normalizeGiftCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function validateGiftCode(raw: string): GiftCodeResult {
  const code = normalizeGiftCode(raw);
  if (code.length === 0) {
    return { valid: false, message: "", discountFraction: 0 };
  }
  const match = GIFT_CODES[code];
  if (match) {
    return { valid: true, message: match.label, discountFraction: match.discountFraction };
  }
  return {
    valid: false,
    message: "That code doesn't look right — try CHILL10.",
    discountFraction: 0,
  };
}

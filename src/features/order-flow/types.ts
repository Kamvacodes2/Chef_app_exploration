import type { PaletteId } from "@/data/types/Palette";

/**
 * A body/lifestyle goal the guest can onboard with. Each goal maps to a set of
 * meal "goal tags" so the menu can be filtered to suit. Purely presentational
 * + filtering — no medical claims.
 */
export type GoalId =
  | "lose-weight"
  | "build-muscle"
  | "anti-inflammatory"
  | "post-partum"
  | "mediterranean"
  | "just-good-food";

export interface Goal {
  readonly id: GoalId;
  readonly title: string;
  readonly tagline: string;
  /** Playful emoji for the fun onboarding cards. */
  readonly emoji: string;
  /** Meal `goalTags` that satisfy this goal. */
  readonly matchTags: readonly string[];
  readonly paletteId: PaletteId;
}

/**
 * A selectable course in the order flow. "mains" is required; the rest are
 * optional add-ons.
 */
export type CourseKind = "main" | "side" | "dessert";

/** A single selectable menu item in the order flow (main, side, or dessert). */
export interface OrderMenuItem {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly priceDisplay: string;
  /** Numeric price in ZAR for running-total math. */
  readonly price: number;
  readonly course: CourseKind;
  readonly imageSrc: string;
  readonly imageAlt: string;
  readonly paletteId: PaletteId;
  /** Goal tags used to filter the menu for the chosen onboarding goal. */
  readonly goalTags: readonly string[];
  /** True when this item is a Traditional SA / seasonal favourite. */
  readonly isSignature?: boolean;
}

export interface Address {
  readonly estate: string;
  readonly unit: string;
  readonly street: string;
}

export interface GiftCodeResult {
  readonly valid: boolean;
  /** Human-readable feedback shown under the input. */
  readonly message: string;
  /** Discount fraction (0..1) applied to the subtotal when valid. */
  readonly discountFraction: number;
}

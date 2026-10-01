/**
 * Fixed-price meal options for a custom-dish request. A custom request has no
 * catalog price, so the meal structure carries the price instead: one main is
 * the flat "chefmate tonight" base, two mains add the fixed second-main
 * supplement, and three courses are a fixed price. These labels mirror the
 * server-side tiers (see backend pricing.constants); the charged total always
 * comes from the server quote, never from these display strings.
 */
export type CustomMealTier = "one-main" | "two-mains" | "three-course" | "two-mains-980";

export interface CustomMealTierOption {
  readonly id: CustomMealTier;
  readonly title: string;
  readonly description: string;
  /** Fixed base price in cents, before sides/dessert add-ons. */
  readonly basePriceCents: number;
}

export const CUSTOM_MEAL_TIER_OPTIONS: readonly CustomMealTierOption[] = Object.freeze([
  {
    id: "one-main",
    title: "One main",
    description: "One custom main dish, cooked in your kitchen.",
    basePriceCents: 52785,
  },
  {
    id: "two-mains",
    title: "Two mains",
    description: "Two custom mains — cook once, eat twice.",
    basePriceCents: 72785,
  },
  {
    id: "three-course",
    title: "Three courses",
    description: "Starter, main and dessert — chef's recommendation or your own.",
    basePriceCents: 97900,
  },
  {
    id: "two-mains-980",
    title: "Two mains — bespoke R980",
    description: "Bespoke two-main session (Lindi custom order) at a fixed R980.",
    basePriceCents: 98000,
  },
]);

export function customMealTierOption(tier: CustomMealTier): CustomMealTierOption {
  const option = CUSTOM_MEAL_TIER_OPTIONS.find((candidate) => candidate.id === tier);
  if (!option) throw new Error(`Unknown custom meal tier: ${tier}`);
  return option;
}

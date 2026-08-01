export const CHEFMATE_PLANS = [
  {
    id: "tonight",
    name: "chefmate tonight",
    sessions: "Once-off",
    tier: "Bronze",
    savings: null,
    price: "From R527.85 / session",
    priceCents: 52785,
    description: "A once-off session for busy weeknights, family dinners, or when you need a break.",
    image: "/images/pricing-plans/chefmate_tonight.jpg",
    alt: "Two people enjoying a freshly cooked meal together at home",
    overlay: "linear-gradient(180deg, rgba(86, 27, 24, 0.08) 0%, rgba(86, 27, 24, 0.2) 34%, rgba(86, 27, 24, 0.78) 58%, rgba(86, 27, 24, 0.98) 100%)",
    featured: false,
    recurring: false,
  },
  {
    id: "rhythm",
    name: "chefmate rhythm",
    sessions: "4 sessions",
    tier: "Silver",
    savings: null,
    price: "R1,999 / month",
    priceCents: 199900,
    description: "Four sessions a month for a little more breathing room during the week.",
    image: "/images/pricing-plans/chefmate_rhythm.jpg",
    alt: "A customer enjoying a quiet meal at home",
    overlay: "linear-gradient(180deg, rgba(86, 27, 24, 0.08) 0%, rgba(125, 44, 39, 0.22) 34%, rgba(111, 39, 33, 0.8) 58%, rgba(86, 27, 24, 0.98) 100%)",
    featured: true,
    recurring: true,
  },
  {
    id: "family",
    name: "chefmate family",
    sessions: "8 sessions",
    tier: "Gold",
    savings: "Save R424/month",
    price: "R3,799 / month",
    priceCents: 379900,
    description: "Eight sessions a month for households that want dinner covered more often.",
    image: "/images/pricing-plans/chefmate_family.jpg",
    alt: "A family sharing a relaxed dinner together at home",
    overlay: "linear-gradient(180deg, rgba(86, 27, 24, 0.08) 0%, rgba(122, 82, 39, 0.22) 34%, rgba(121, 75, 35, 0.76) 58%, rgba(86, 27, 24, 0.98) 100%)",
    featured: false,
    recurring: true,
  },
  {
    id: "premium",
    name: "chefmate premium",
    sessions: "12 sessions",
    tier: "Platinum",
    savings: "Save R1,279/month",
    price: "R5,055 / month",
    priceCents: 505500,
    description: "Twelve sessions a month for regular dinner help, easy evenings, and leftovers.",
    image: "/images/pricing-plans/chefmate_full_house.jpg",
    alt: "A family enjoying a generous home-cooked meal together",
    overlay: "linear-gradient(180deg, rgba(86, 27, 24, 0.08) 0%, rgba(151, 70, 45, 0.22) 34%, rgba(132, 50, 34, 0.78) 58%, rgba(86, 27, 24, 0.98) 100%)",
    featured: false,
    recurring: true,
  },
] as const;

export type ChefmatePlan = (typeof CHEFMATE_PLANS)[number];
export type ChefmatePlanId = ChefmatePlan["id"];
export type ChefmatePlanAliasId = "full-house";

const CHEFMATE_PLAN_ALIASES: Readonly<Record<ChefmatePlanAliasId, ChefmatePlanId>> = {
  "full-house": "premium",
};

export const PREFERRED_DAYS = [
  { id: "monday", label: "Monday", shortLabel: "Mon" },
  { id: "tuesday", label: "Tuesday", shortLabel: "Tue" },
  { id: "wednesday", label: "Wednesday", shortLabel: "Wed" },
  { id: "thursday", label: "Thursday", shortLabel: "Thu" },
  { id: "friday", label: "Friday", shortLabel: "Fri" },
  { id: "saturday", label: "Saturday", shortLabel: "Sat" },
  { id: "sunday", label: "Sunday", shortLabel: "Sun" },
] as const;

export type PreferredDayId = (typeof PREFERRED_DAYS)[number]["id"];

export type PlanSchedulePreference = "SELECTED_DAYS" | "DECIDE_LATER" | "NOT_APPLICABLE";

/**
 * The durable package-selection contract sent with a package booking.
 * It deliberately describes preferences, not confirmed recurring dates.
 */
export interface ChefmatePlanSelection {
  readonly planId: ChefmatePlanId;
  readonly preferredDays: readonly PreferredDayId[];
  readonly schedulePreference: PlanSchedulePreference;
  readonly favoriteMealSlug: string | null;
}

export function isChefmatePlanId(value: string): value is ChefmatePlanId {
  return CHEFMATE_PLANS.some((plan) => plan.id === value);
}

export function normalizeChefmatePlanId(value: string | null | undefined): ChefmatePlanId | null {
  if (!value) return null;
  if (isChefmatePlanId(value)) return value;
  return CHEFMATE_PLAN_ALIASES[value as ChefmatePlanAliasId] ?? null;
}

export function findChefmatePlan(planId: ChefmatePlanId | null | undefined): ChefmatePlan | null {
  return CHEFMATE_PLANS.find((plan) => plan.id === planId) ?? null;
}

export function isRecurringChefmatePlan(planId: ChefmatePlanId): boolean {
  return findChefmatePlan(planId)?.recurring ?? false;
}
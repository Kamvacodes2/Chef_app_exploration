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

/** Time windows a customer can prefer per weekday (their chef lands in the window). */
export const DAY_TIME_WINDOWS = [
  {
    id: "morning",
    label: "Morning",
    range: "7 am – 11 am",
    slots: Object.freeze(["07:00", "08:00", "09:00", "10:00", "11:00"]),
  },
  {
    id: "afternoon",
    label: "Afternoon",
    range: "12 pm – 4 pm",
    slots: Object.freeze(["12:00", "13:00", "14:00", "15:00", "16:00"]),
  },
  {
    id: "evening",
    label: "Evening",
    range: "5 pm – 8 pm",
    slots: Object.freeze(["17:00", "18:00", "18:30", "19:00", "19:30", "20:00"]),
  },
] as const;

export type DayTimeWindowId = (typeof DAY_TIME_WINDOWS)[number]["id"];

export function isDayTimeWindowId(value: string): value is DayTimeWindowId {
  return DAY_TIME_WINDOWS.some((window) => window.id === value);
}

export type PlanDayTimeWindows = Readonly<Partial<Record<PreferredDayId, DayTimeWindowId | null>>>;

/**
 * How many mains a customer may plan for a single day. A session cooks up to
 * two mains (e.g. dinner plus a meal-prep pack) and optionally overnight oats.
 */
export const DAY_MAIN_CAPACITY = 2;

/** A single day's meal plan inside a subscription week. */
export interface PlanDayMealPlan {
  readonly day: PreferredDayId;
  /** Up to DAY_MAIN_CAPACITY catalog mains for this day. */
  readonly mainSlugs: readonly string[];
  /** Frontend-only display names; omitted from the backend wire payload. */
  readonly mainNames?: readonly string[];
  /** Overnight oats breakfast add-on for this day. */
  readonly overnightOats: boolean;
  /** Pasted meal references for this day, formatted "[Source] url". */
  readonly links: readonly string[];
}

/**
 * How many weekly main-meal options a subscriber may name at signup.
 * The 4-session plan (rhythm) keeps the original two-option menu (favourite +
 * meal-prep second); the 8- and 12-session plans may name up to six weekly
 * mains so their rota can cycle through more variety. Once-off sessions do not
 * name weekly meals at all.
 */
export function weeklyMainCapacity(planId: ChefmatePlanId | null): number {
  if (planId === "family" || planId === "premium") return 6;
  if (planId === "rhythm") return 2;
  return 0;
}

/** Day -> meal slug, for customers who assign their named meals to preferred days at signup. */
export type PlanDayMealAssignments = Readonly<Partial<Record<PreferredDayId, string>>>;

/**
 * The durable package-selection contract sent with a package booking.
 * It deliberately describes preferences, not confirmed recurring dates.
 */
export interface ChefmatePlanSelection {
  readonly planId: ChefmatePlanId;
  readonly preferredDays: readonly PreferredDayId[];
  readonly schedulePreference: PlanSchedulePreference;
  readonly favoriteMealSlug: string | null;
  /** Pasted meal reference (TikTok / Instagram / Pinterest / other), if the slot uses a link. */
  readonly favoriteMealLink: string | null;
  /** Optional second meal for meal-prep packs. */
  readonly secondFavoriteMealSlug: string | null;
  readonly secondFavoriteMealLink: string | null;
  /** Weekly mains beyond options 1 & 2 (8- and 12-session plans may name up to six). */
  readonly extraMealSlugs?: readonly string[];
  /** Pasted-link references for extra slots (any slot may be a link instead of a catalog meal). */
  readonly extraMealLinks?: readonly string[];
  /** Day -> named-meal assignments made at signup; omitted when the customer defers or matches nothing. */
  readonly dayMealAssignments?: PlanDayMealAssignments | null;
  /** True when the customer explicitly chose to match meals to days later. */
  readonly dayMealsDeferred?: boolean;
  /** Per-day meal plans for the first week (days → up to 2 mains + oats + links). */
  readonly dayMealPlans?: readonly PlanDayMealPlan[] | null;
  /** Per-day meal plans for the optional second planned week. */
  readonly week2DayMealPlans?: readonly PlanDayMealPlan[] | null;
  /** True when the customer chose to plan the second week later. */
  readonly week2Deferred?: boolean;
  /** Preferred time window per weekday. */
  readonly dayTimeWindows?: PlanDayTimeWindows | null;
  /** Auto-computed nearest bookable date (SAST) for the first session. */
  readonly firstSessionDate?: string | null;
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

/** Days ahead a subscriber may plan when they opt into week 2. */
export const PLAN_WEEKS = 2;

const WEEKDAY_TO_DAY_ID: readonly PreferredDayId[] = Object.freeze([
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
]);

export interface JohannesburgToday {
  /** yyyy-mm-dd in South Africa's zone. */
  readonly iso: string;
  /** 0 = Sunday … 6 = Saturday (SAST). */
  readonly weekday: number;
  /** Minutes since SAST midnight. */
  readonly minutes: number;
}

/** The current calendar date/time in Johannesburg, independent of device timezone. */
export function johannesburgToday(now: Date): JohannesburgToday {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  const iso = `${get("year")}-${get("month")}-${get("day")}`;
  const weekday = new Date(Date.UTC(get("year"), get("month") - 1, get("day"))).getUTCDay();
  return { iso, weekday, minutes: (get("hour") % 24) * 60 + get("minute") };
}

/** ISO date (yyyy-mm-dd) `days` days after the given ISO date. */
export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Weekday (0 = Sunday … 6 = Saturday) of an ISO date. */
export function isoWeekday(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).getUTCDay();
}

function earliestWindowMinutes(windowId: DayTimeWindowId | null | undefined): number | null {
  if (!windowId) return null;
  const window = DAY_TIME_WINDOWS.find((candidate) => candidate.id === windowId);
  const firstSlot = window?.slots[0];
  return firstSlot ? Number(firstSlot.slice(0, 2)) * 60 + Number(firstSlot.slice(3, 5)) : null;
}

/**
 * The customer's first session date: the nearest bookable SAST day among
 * their preferred weekdays. Sessions need 24 hours of lead time, so scanning
 * starts tomorrow; tomorrow only qualifies while the chosen window's first
 * slot is still ahead of "now" in SAST. Returns null when no days were
 * chosen.
 */
export function firstSessionDate(
  preferredDays: readonly PreferredDayId[],
  timeWindows: PlanDayTimeWindows,
  now: Date,
): string | null {
  if (preferredDays.length === 0) return null;
  const today = johannesburgToday(now);
  for (let offset = 1; offset <= 14; offset += 1) {
    const iso = addDaysIso(today.iso, offset);
    const dayId = WEEKDAY_TO_DAY_ID[isoWeekday(iso)];
    if (!dayId || !preferredDays.includes(dayId)) continue;
    if (offset === 1) {
      const windowStart = earliestWindowMinutes(timeWindows[dayId]);
      // With a chosen window, tomorrow only clears the 24-hour lead when its
      // first slot is still ahead of now. Without a window, tomorrow stands.
      if (windowStart !== null && windowStart < today.minutes) continue;
    }
    return iso;
  }
  return null;
}
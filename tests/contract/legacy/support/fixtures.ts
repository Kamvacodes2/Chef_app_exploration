/**
 * Synthetic legacy response fixtures.
 *
 * Every value here is invented for testing. No production customer data,
 * token, cookie, credential, or real bank detail appears in this file
 * (blueprint section 18.2).
 */

export const LEGACY_BASE_URL = "http://chefmate-api.test";

export const legacyAuthUser = {
  id: "usr_0000000000000001",
  email: "thandi.customer@example.test",
  displayName: "Thandi Customer",
  // `COOK` — not `CHEF` — is the value the legacy contract accepts today (D018 / ADR-0008).
  roles: ["CUSTOMER", "COOK"],
  status: "ACTIVE",
  emailVerifiedAt: "2026-07-01T08:00:00.000Z",
  createdAt: "2026-06-01T08:00:00.000Z",
} as const;

export const legacyAuthResponse = { data: { user: legacyAuthUser } } as const;

export const legacyCategory = {
  slug: "seven-colours",
  name: "Seven Colours",
  paletteId: "maize",
  mood: "Sunday plate",
  sortOrder: 0,
} as const;

export const legacyMeal = {
  slug: "roast-chicken-seven-colours",
  categorySlug: "seven-colours",
  name: "Roast Chicken Seven Colours",
  description: "Roast chicken with seven colourful sides.",
  priceDisplay: "R527.85",
  image: {
    src: "/images/meals/roast-chicken-seven-colours.jpg",
    alt: "Roast chicken plated with colourful sides",
    width: 1200,
    height: 900,
  },
  isHot: true,
  hasCutlery: true,
  sortOrder: 3,
} as const;

export const legacyAvailabilityResponse = {
  data: {
    date: "2026-08-03",
    slots: [
      { period: "morning", time: "09:00", label: "9:00 AM", available: true },
      { period: "afternoon", time: "14:00", label: "2:00 PM", available: false },
      { period: "evening", time: "18:00", label: "6:00 PM", available: true },
    ],
  },
} as const;

/**
 * Legacy quote response. Note the `main` item carrying `priceCents` — this
 * contradicts invariant 4.1.2 / D005 and is recorded, not corrected, in S01.
 */
export const legacyQuoteResponse = {
  data: {
    subtotalCents: 67285,
    discountCents: 0,
    totalCents: 67285,
    items: [
      { kind: "main", slug: "roast-chicken-seven-colours", name: "Roast Chicken Seven Colours", priceCents: 52785, sortOrder: 0 },
      { kind: "side", slug: "creamed-spinach", name: "Creamed Spinach", priceCents: 0, sortOrder: 1 },
      { kind: "side", slug: "mielies", name: "Mielies", priceCents: 0, sortOrder: 2 },
      { kind: "side", slug: "coleslaw", name: "Coleslaw", priceCents: 5500, sortOrder: 3 },
      { kind: "dessert", slug: "malva-pudding", name: "Malva Pudding", priceCents: 9000, sortOrder: 4 },
    ],
    plan: {
      // `full-house` — not `PREMIUM` — is the live legacy plan id (D002 / ADR-0008).
      id: "full-house",
      name: "chefmate full house",
      sessions: "12 sessions",
      recurring: true,
      priceCents: 505500,
    },
  },
} as const;

/** Fabricated bank instruction values only; these resemble no real account. */
export const legacyBookingResponse = {
  data: {
    id: "bkr_0000000000000001",
    reference: "CM-2026-000123",
    status: "REQUESTED",
    subtotalCents: 67285,
    discountCents: 0,
    totalCents: 67285,
    payment: {
      method: "BANK_TRANSFER",
      status: "PENDING",
      bankTransfer: {
        bankName: "Example Test Bank",
        branchName: "Test Branch",
        branchCode: "000000",
        accountHolder: "Chefmate Test Account",
        accountNumber: "0000000000",
        accountType: "Cheque",
        paymentReference: "CM-2026-000123",
      },
    },
  },
} as const;

export const legacySurveyResponse = {
  data: {
    bookingReference: "CM-2026-000123",
    // Legacy survey recipient role is `COOK`, not `CHEF`.
    recipientRole: "COOK",
    status: "PENDING",
    expiresAt: "2026-08-10T10:00:00.000Z",
    questions: ["sessionRating", "comment"],
  },
} as const;

export const LEGACY_SURVEY_TOKEN = "synthetic-survey-token-0000";

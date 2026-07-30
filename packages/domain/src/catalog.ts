export type CatalogItemKind = "main" | "side" | "dessert";

export interface CatalogCategory {
  readonly slug: string;
  readonly name: string;
  readonly paletteId: string;
  readonly mood: string;
  readonly sortOrder: number;
}

export interface CatalogItem {
  readonly slug: string;
  readonly categorySlug: string;
  readonly kind: CatalogItemKind;
  readonly name: string;
  readonly description: string;
  readonly priceDisplay: string;
  readonly image: {
    readonly src: string;
    readonly alt: string;
    readonly width: number;
    readonly height: number;
  };
  readonly isHot: boolean;
  readonly hasCutlery: boolean;
  readonly sortOrder: number;
}

export interface PricingPlan {
  readonly id: "tonight" | "rhythm" | "family" | "premium";
  readonly name: string;
  readonly sessions: string;
  readonly recurring: boolean;
  readonly priceCents: number;
  readonly aliases?: readonly string[];
}

export interface PlanSelection {
  readonly planId: string;
  readonly preferredDays?: readonly string[];
  readonly schedulePreference?: string;
  readonly favoriteMealSlug?: string | null;
}

export interface PricingPayload {
  readonly mainSlug: string;
  readonly sideSlugs: readonly string[];
  readonly dessertSlug: string | null;
  readonly customRequest: string | null;
  readonly giftCode: string | null;
  readonly planSelection?: PlanSelection;
}

export interface PricingItem {
  readonly kind: CatalogItemKind;
  readonly slug: string;
  readonly name: string;
  readonly priceCents: number;
  readonly sortOrder: number;
}

export interface PricingQuote {
  readonly subtotalCents: number;
  readonly discountCents: number;
  readonly totalCents: number;
  readonly items: readonly PricingItem[];
  readonly plan: {
    readonly id: string;
    readonly name: string;
    readonly sessions: string;
    readonly recurring: boolean;
    readonly priceCents: number;
  } | null;
  readonly status: "REQUESTED" | "NEEDS_REVIEW";
  readonly chefPayableCents: number;
  readonly platformRevenueCents: number;
}

export const EXTRA_SIDE_PRICE_CENTS = 5_500;
export const DESSERT_PRICE_CENTS = 9_000;
export const CHEF_SHARE_BASIS_POINTS = 6_500;
export const PLATFORM_SHARE_BASIS_POINTS = 3_500;

export const CATALOG_CATEGORIES: readonly CatalogCategory[] = Object.freeze([
  {
    slug: "chefmate-signatures",
    name: "Chefmate Signatures",
    paletteId: "blood-red",
    mood: "Popular this week",
    sortOrder: 0,
  },
  {
    slug: "healthy",
    name: "Healthy",
    paletteId: "olive",
    mood: "Light and balanced",
    sortOrder: 1,
  },
  {
    slug: "chicken",
    name: "Chicken",
    paletteId: "persimmon",
    mood: "Weeknight favourites",
    sortOrder: 2,
  },
  {
    slug: "beef-premium",
    name: "Beef and Premium",
    paletteId: "espresso",
    mood: "Hearty plates",
    sortOrder: 3,
  },
  {
    slug: "pasta-bakes",
    name: "Pasta and Bakes",
    paletteId: "strawberry",
    mood: "Comfort food",
    sortOrder: 4,
  },
  { slug: "sides", name: "Sides", paletteId: "warm-linen", mood: "Add-ons", sortOrder: 5 },
  {
    slug: "desserts",
    name: "Desserts",
    paletteId: "vanilla",
    mood: "Sweet finishes",
    sortOrder: 6,
  },
]);

const included = "Included in plan";

export const CATALOG_ITEMS: readonly CatalogItem[] = Object.freeze([
  {
    slug: "winter-oxtail-stew",
    categorySlug: "chefmate-signatures",
    kind: "main",
    name: "Oxtail Stew",
    description: "Slow-braised oxtail in a rich, hearty gravy.",
    priceDisplay: included,
    image: {
      src: "/images/meals/beef-premium/oxtail-stew.webp",
      alt: "Oxtail stew",
      width: 1200,
      height: 900,
    },
    isHot: true,
    hasCutlery: true,
    sortOrder: 0,
  },
  {
    slug: "sa-roast-chicken-seven-colours",
    categorySlug: "chefmate-signatures",
    kind: "main",
    name: "Roast Chicken Seven Colours",
    description: "Roast chicken with seven vibrant sides.",
    priceDisplay: included,
    image: {
      src: "/images/meals/sunday-lunch/roast-chicken-seven-colours.webp",
      alt: "Roast chicken seven colours",
      width: 1200,
      height: 900,
    },
    isHot: true,
    hasCutlery: true,
    sortOrder: 1,
  },
  {
    slug: "winter-lamb-chops",
    categorySlug: "chefmate-signatures",
    kind: "main",
    name: "Char-Grilled Lamb Chops",
    description: "Herb-seasoned lamb chops, char-grilled.",
    priceDisplay: included,
    image: {
      src: "/images/meals/beef-premium/lamb-chops.webp",
      alt: "Lamb chops",
      width: 1200,
      height: 900,
    },
    isHot: true,
    hasCutlery: true,
    sortOrder: 2,
  },
  {
    slug: "healthy-chicken-gyro-bowl",
    categorySlug: "healthy",
    kind: "main",
    name: "Chicken Gyro Bowl",
    description: "Grilled chicken, fresh greens and a light tzatziki drizzle.",
    priceDisplay: included,
    image: {
      src: "/images/meals/healthy/chicken-gyro-bowl.webp",
      alt: "Chicken gyro bowl",
      width: 1200,
      height: 900,
    },
    isHot: false,
    hasCutlery: true,
    sortOrder: 3,
  },
  {
    slug: "healthy-burger-bowl",
    categorySlug: "healthy",
    kind: "main",
    name: "Burger Bowl",
    description: "Deconstructed burger flavours over crisp greens.",
    priceDisplay: included,
    image: {
      src: "/images/meals/healthy/burger-bowl.webp",
      alt: "Burger bowl",
      width: 1200,
      height: 900,
    },
    isHot: false,
    hasCutlery: true,
    sortOrder: 4,
  },
  {
    slug: "healthy-chicken-salad-bowl",
    categorySlug: "healthy",
    kind: "main",
    name: "Chicken Salad Bowl",
    description: "Lean chicken breast with a colourful vegetable medley.",
    priceDisplay: included,
    image: {
      src: "/images/meals/healthy/chicken-salad-bowl.webp",
      alt: "Chicken salad bowl",
      width: 1200,
      height: 900,
    },
    isHot: false,
    hasCutlery: true,
    sortOrder: 5,
  },
  {
    slug: "chicken-peri-peri",
    categorySlug: "chicken",
    kind: "main",
    name: "Peri-Peri Chicken",
    description: "Flame-grilled chicken basted in peri-peri sauce.",
    priceDisplay: included,
    image: {
      src: "/images/meals/chicken/peri-peri-chicken.webp",
      alt: "Peri-peri chicken",
      width: 1200,
      height: 900,
    },
    isHot: true,
    hasCutlery: true,
    sortOrder: 6,
  },
  {
    slug: "chicken-bbq",
    categorySlug: "chicken",
    kind: "main",
    name: "BBQ Chicken",
    description: "Smoky BBQ glazed chicken, grilled to perfection.",
    priceDisplay: included,
    image: {
      src: "/images/meals/chicken/bbq-chicken.webp",
      alt: "BBQ chicken",
      width: 1200,
      height: 900,
    },
    isHot: false,
    hasCutlery: true,
    sortOrder: 7,
  },
  {
    slug: "chicken-roasted",
    categorySlug: "chicken",
    kind: "main",
    name: "Roasted Chicken",
    description: "Slow-roasted chicken with golden crispy skin.",
    priceDisplay: included,
    image: {
      src: "/images/meals/chicken/roasted-chicken.webp",
      alt: "Roasted chicken",
      width: 1200,
      height: 900,
    },
    isHot: false,
    hasCutlery: true,
    sortOrder: 8,
  },
  {
    slug: "beef-steak-chips",
    categorySlug: "beef-premium",
    kind: "main",
    name: "Steak and Chips",
    description: "Tender grilled steak served with crispy golden chips.",
    priceDisplay: included,
    image: {
      src: "/images/meals/beef-premium/steak-and-chips.webp",
      alt: "Steak and chips",
      width: 1200,
      height: 900,
    },
    isHot: false,
    hasCutlery: true,
    sortOrder: 9,
  },
  {
    slug: "sa-oxtail-seven-colours",
    categorySlug: "chefmate-signatures",
    kind: "main",
    name: "Oxtail Seven Colours",
    description: "Rich oxtail served the traditional Sunday way.",
    priceDisplay: included,
    image: {
      src: "/images/meals/sunday-lunch/oxtail-seven-colours.webp",
      alt: "Oxtail seven colours",
      width: 1200,
      height: 900,
    },
    isHot: true,
    hasCutlery: true,
    sortOrder: 10,
  },
  {
    slug: "breakfast-overnight-oats",
    categorySlug: "healthy",
    kind: "main",
    name: "Overnight Oats",
    description: "Creamy oats soaked overnight with fruit and honey.",
    priceDisplay: included,
    image: {
      src: "/images/meals/breakfast/overnight-oats.webp",
      alt: "Overnight oats",
      width: 1200,
      height: 900,
    },
    isHot: false,
    hasCutlery: true,
    sortOrder: 11,
  },
  {
    slug: "pasta-beef-lasagne",
    categorySlug: "pasta-bakes",
    kind: "main",
    name: "Beef Lasagne",
    description: "Layers of pasta, beef ragu and melted cheese.",
    priceDisplay: included,
    image: {
      src: "/images/meals/pasta-bakes/beef-lasagne.webp",
      alt: "Beef lasagne",
      width: 1200,
      height: 900,
    },
    isHot: false,
    hasCutlery: true,
    sortOrder: 12,
  },
  {
    slug: "pasta-meatball",
    categorySlug: "pasta-bakes",
    kind: "main",
    name: "Meatball Pasta",
    description: "Juicy meatballs tossed in rich tomato pasta.",
    priceDisplay: included,
    image: {
      src: "/images/meals/pasta-bakes/meatball-pasta.webp",
      alt: "Meatball pasta",
      width: 1200,
      height: 900,
    },
    isHot: false,
    hasCutlery: true,
    sortOrder: 13,
  },
  {
    slug: "pasta-cheesy-mince",
    categorySlug: "pasta-bakes",
    kind: "main",
    name: "Cheesy Mince Pasta",
    description: "Kid-friendly cheesy mince pasta bake.",
    priceDisplay: included,
    image: {
      src: "/images/meals/pasta-bakes/cheesy-mince-pasta.webp",
      alt: "Cheesy mince pasta",
      width: 1200,
      height: 900,
    },
    isHot: false,
    hasCutlery: true,
    sortOrder: 14,
  },
  {
    slug: "sa-chicken-seven-colours",
    categorySlug: "chefmate-signatures",
    kind: "main",
    name: "Chicken Seven Colours",
    description: "Classic chicken Sunday lunch with seven colourful sides.",
    priceDisplay: included,
    image: {
      src: "/images/meals/sunday-lunch/chicken-seven-colours.webp",
      alt: "Chicken seven colours",
      width: 1200,
      height: 900,
    },
    isHot: true,
    hasCutlery: true,
    sortOrder: 15,
  },
  {
    slug: "side-beetroot-salad",
    categorySlug: "sides",
    kind: "side",
    name: "Beetroot Salad",
    description: "Earthy beetroot with a bright, tangy finish.",
    priceDisplay: "First two included",
    image: {
      src: "/images/menu/sides/beetroot.jpg",
      alt: "Beetroot salad",
      width: 1200,
      height: 900,
    },
    isHot: false,
    hasCutlery: true,
    sortOrder: 100,
  },
  {
    slug: "side-coleslaw",
    categorySlug: "sides",
    kind: "side",
    name: "Coleslaw",
    description: "Crunchy, creamy slaw for a cool, classic side.",
    priceDisplay: "First two included",
    image: { src: "/images/menu/sides/coleslaw.jpg", alt: "Coleslaw", width: 1200, height: 900 },
    isHot: false,
    hasCutlery: true,
    sortOrder: 101,
  },
  {
    slug: "side-creamed-spinach",
    categorySlug: "sides",
    kind: "side",
    name: "Creamed Spinach",
    description: "Velvety creamed spinach, warm and savoury.",
    priceDisplay: "First two included",
    image: {
      src: "/images/menu/sides/creamed-spinach.jpg",
      alt: "Creamed spinach",
      width: 1200,
      height: 900,
    },
    isHot: false,
    hasCutlery: true,
    sortOrder: 102,
  },
  {
    slug: "side-green-salad",
    categorySlug: "sides",
    kind: "side",
    name: "Green Salad",
    description: "Fresh seasonal greens with a light dressing.",
    priceDisplay: "First two included",
    image: {
      src: "/images/menu/sides/green-salad.jpg",
      alt: "Green salad",
      width: 1200,
      height: 900,
    },
    isHot: false,
    hasCutlery: true,
    sortOrder: 103,
  },
  {
    slug: "side-mielies",
    categorySlug: "sides",
    kind: "side",
    name: "Mielies",
    description: "Sweet, tender mielies with a buttery finish.",
    priceDisplay: "First two included",
    image: { src: "/images/menu/sides/mielies.jpg", alt: "Mielies", width: 1200, height: 900 },
    isHot: false,
    hasCutlery: true,
    sortOrder: 104,
  },
  {
    slug: "side-tuna-pasta-salad",
    categorySlug: "sides",
    kind: "side",
    name: "Tuna Pasta Salad",
    description: "Tuna, pasta and crisp vegetables in a creamy dressing.",
    priceDisplay: "First two included",
    image: {
      src: "/images/menu/sides/tuna-pasta-salad.jpg",
      alt: "Tuna pasta salad",
      width: 1200,
      height: 900,
    },
    isHot: false,
    hasCutlery: true,
    sortOrder: 105,
  },
  {
    slug: "side-potato-salad",
    categorySlug: "sides",
    kind: "side",
    name: "Potato Salad",
    description: "Classic creamy potato salad.",
    priceDisplay: "First two included",
    image: {
      src: "/images/menu/sides/potato-salad.jpg",
      alt: "Potato salad",
      width: 1200,
      height: 900,
    },
    isHot: false,
    hasCutlery: true,
    sortOrder: 106,
  },
  {
    slug: "side-pumpkin-rocket-salad",
    categorySlug: "sides",
    kind: "side",
    name: "Pumpkin and Rocket Salad",
    description: "Roasted pumpkin with peppery rocket leaves.",
    priceDisplay: "First two included",
    image: {
      src: "/images/menu/sides/pumpkin-rocket-salad.jpg",
      alt: "Pumpkin and rocket salad",
      width: 1200,
      height: 900,
    },
    isHot: false,
    hasCutlery: true,
    sortOrder: 107,
  },
  {
    slug: "dessert-malva",
    categorySlug: "desserts",
    kind: "dessert",
    name: "Malva Pudding",
    description: "Warm, sticky apricot sponge with cream.",
    priceDisplay: "R90",
    image: { src: "/images/loop/meal-9.webp", alt: "Malva pudding", width: 1200, height: 900 },
    isHot: false,
    hasCutlery: true,
    sortOrder: 200,
  },
  {
    slug: "dessert-milk-tart",
    categorySlug: "desserts",
    kind: "dessert",
    name: "Milk Tart",
    description: "Silky cinnamon-dusted custard tart.",
    priceDisplay: "R90",
    image: { src: "/images/loop/meal-7.webp", alt: "Milk tart", width: 1200, height: 900 },
    isHot: false,
    hasCutlery: true,
    sortOrder: 201,
  },
  {
    slug: "dessert-berry-oats",
    categorySlug: "desserts",
    kind: "dessert",
    name: "Berry Oat Crumble",
    description: "Baked berries under a golden oat crumble.",
    priceDisplay: "R90",
    image: { src: "/images/loop/meal-4.webp", alt: "Berry oat crumble", width: 1200, height: 900 },
    isHot: false,
    hasCutlery: true,
    sortOrder: 202,
  },
]);

export const PRICING_PLANS: readonly PricingPlan[] = Object.freeze([
  {
    id: "tonight",
    name: "chefmate tonight",
    sessions: "Once-off",
    recurring: false,
    priceCents: 52_785,
  },
  {
    id: "rhythm",
    name: "chefmate rhythm",
    sessions: "4 sessions",
    recurring: true,
    priceCents: 199_900,
  },
  {
    id: "family",
    name: "chefmate family",
    sessions: "8 sessions",
    recurring: true,
    priceCents: 379_900,
  },
  {
    id: "premium",
    name: "chefmate premium",
    sessions: "12 sessions",
    recurring: true,
    priceCents: 505_500,
    aliases: ["full-house"],
  },
]);

export function findCatalogItem(slug: string): CatalogItem | undefined {
  return CATALOG_ITEMS.find((item) => item.slug === slug);
}

export function resolvePricingPlan(id: string | null | undefined): PricingPlan {
  const requested = id?.trim() || "tonight";
  const plan = PRICING_PLANS.find(
    (candidate) => candidate.id === requested || candidate.aliases?.includes(requested),
  );
  if (!plan) throw new Error("Unknown Chefmate pricing plan.");
  return plan;
}

function discountFraction(giftCode: string | null): number {
  switch (giftCode?.trim().toUpperCase()) {
    case "CHILL10":
      return 0.1;
    case "WINTER15":
      return 0.15;
    case "FIRSTMEAL":
      return 0.2;
    default:
      return 0;
  }
}

function splitChefShare(amountCents: number): number {
  return Math.round((amountCents * CHEF_SHARE_BASIS_POINTS) / 10_000);
}

export function calculatePricingQuote(payload: PricingPayload): PricingQuote {
  const isCustomRequest =
    payload.mainSlug === "custom-request" || Boolean(payload.customRequest?.trim());
  if (isCustomRequest) {
    return {
      subtotalCents: 0,
      discountCents: 0,
      totalCents: 0,
      items: [],
      plan: null,
      status: "NEEDS_REVIEW",
      chefPayableCents: 0,
      platformRevenueCents: 0,
    };
  }

  const main = findCatalogItem(payload.mainSlug);
  if (!main || main.kind !== "main") throw new Error("Choose a valid main meal.");

  const plan = resolvePricingPlan(payload.planSelection?.planId);
  const items: PricingItem[] = [
    { kind: "main", slug: main.slug, name: main.name, priceCents: 0, sortOrder: 0 },
  ];

  let extrasCents = 0;
  payload.sideSlugs.forEach((slug, index) => {
    const side = findCatalogItem(slug);
    if (!side || side.kind !== "side") throw new Error("Choose valid side dishes.");
    const priceCents = index < 2 ? 0 : EXTRA_SIDE_PRICE_CENTS;
    extrasCents += priceCents;
    items.push({
      kind: "side",
      slug: side.slug,
      name: side.name,
      priceCents,
      sortOrder: index + 1,
    });
  });

  if (payload.dessertSlug) {
    const dessert = findCatalogItem(payload.dessertSlug);
    if (!dessert || dessert.kind !== "dessert") throw new Error("Choose a valid dessert.");
    extrasCents += DESSERT_PRICE_CENTS;
    items.push({
      kind: "dessert",
      slug: dessert.slug,
      name: dessert.name,
      priceCents: DESSERT_PRICE_CENTS,
      sortOrder: items.length,
    });
  }

  const subtotalCents = plan.priceCents + extrasCents;
  const discountCents = Math.round(subtotalCents * discountFraction(payload.giftCode));
  const totalCents = Math.max(0, subtotalCents - discountCents);
  const chefPayableCents = splitChefShare(totalCents);

  return {
    subtotalCents,
    discountCents,
    totalCents,
    items,
    plan: {
      id: plan.id,
      name: plan.name,
      sessions: plan.sessions,
      recurring: plan.recurring,
      priceCents: plan.priceCents,
    },
    status: "REQUESTED",
    chefPayableCents,
    platformRevenueCents: totalCents - chefPayableCents,
  };
}

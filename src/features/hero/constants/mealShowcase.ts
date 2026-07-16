export interface MealShowcaseItem {
  readonly id: string;
  readonly theme: string;
  readonly imageSrc: string;
  readonly alt: string;
}

/**
 * Curated dish photos shown in the WAITING-state showcase row, reusing
 * already-converted WebP assets from `public/images/meals/**`. Each entry
 * pairs a lifestyle "theme" label with a dish that visually supports it.
 */
export const MEAL_SHOWCASE_ITEMS: readonly MealShowcaseItem[] = [
  {
    id: "winter-noms",
    theme: "Winter Noms",
    imageSrc: "/images/meals/beef-premium/oxtail-stew.webp",
    alt: "Slow-braised oxtail stew, a hearty winter comfort dish",
  },
  {
    id: "anti-inflammatory",
    theme: "Anti-Inflammatory",
    imageSrc: "/images/meals/healthy/chicken-salad-bowl.webp",
    alt: "Fresh chicken salad bowl with lean protein and greens",
  },
  {
    id: "summer-body-goals",
    theme: "Summer Body Goals",
    imageSrc: "/images/meals/breakfast/overnight-oats.webp",
    alt: "Light and fresh overnight oats topped with fruit",
  },
  {
    id: "home-comfort",
    theme: "Home Comfort",
    imageSrc: "/images/meals/pasta-bakes/beef-lasagne.webp",
    alt: "Cheesy beef lasagne, a classic home comfort favorite",
  },
] as const;

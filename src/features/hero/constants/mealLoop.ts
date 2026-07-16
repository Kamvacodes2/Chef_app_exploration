import type { PaletteId } from "@/data/types/Palette";

export interface MealLoopItem {
  readonly id: string;
  readonly imageSrc: string;
  readonly alt: string;
  readonly paletteId: PaletteId;
}

/**
 * The 9 meals that scroll through the hero in the WAITING state, one per
 * brand palette. As the loop advances, the meal in the center "anchor" slot
 * drives the background gradient and text color via its `paletteId`.
 *
 * Images are converted from `Assets/Design/1.png`–`9.png` to
 * `public/images/loop/meal-N.webp` by `scripts/convert-assets.mjs`.
 *
 * Palette ordering cycles through all 9 brand palettes so every color
 * appears in the loop. Reorder entries here to change which design image
 * maps to which palette.
 */
export const MEAL_LOOP_ITEMS: readonly MealLoopItem[] = [
  {
    id: "loop-olive",
    imageSrc: "/images/loop/meal-1.webp",
    alt: "Healthy chicken gyro bowl with fresh greens",
    paletteId: "olive",
  },
  {
    id: "loop-persimmon",
    imageSrc: "/images/loop/meal-2.webp",
    alt: "Golden peri-peri chicken meal",
    paletteId: "persimmon",
  },
  {
    id: "loop-espresso",
    imageSrc: "/images/loop/meal-3.webp",
    alt: "Hearty beef steak with chips",
    paletteId: "espresso",
  },
  {
    id: "loop-vanilla",
    imageSrc: "/images/loop/meal-4.webp",
    alt: "Light overnight oats with fruit",
    paletteId: "vanilla",
  },
  {
    id: "loop-strawberry",
    imageSrc: "/images/loop/meal-5.webp",
    alt: "Cheesy beef lasagne comfort food",
    paletteId: "strawberry",
  },
  {
    id: "loop-blood-red",
    imageSrc: "/images/loop/meal-6.webp",
    alt: "Seven colours Sunday lunch spread",
    paletteId: "blood-red",
  },
  {
    id: "loop-lemon-cream",
    imageSrc: "/images/loop/meal-7.webp",
    alt: "Bright citrus morning dish",
    paletteId: "lemon-cream",
  },
  {
    id: "loop-warm-linen",
    imageSrc: "/images/loop/meal-8.webp",
    alt: "Soft neutral warm dish",
    paletteId: "warm-linen",
  },
  {
    id: "loop-bean",
    imageSrc: "/images/loop/meal-9.webp",
    alt: "Deep midnight roast stew",
    paletteId: "bean",
  },
] as const;

export const MEAL_LOOP_LENGTH = MEAL_LOOP_ITEMS.length;

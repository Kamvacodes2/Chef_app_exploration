import type { ShowcaseSlide } from "../types";

/**
 * 9 showcase slides grouped by category, in display order:
 * SUNDAY / COLORS -> HEARTY / FLAVORS -> SWEET / GREENS -> HEALTHY / GO-TO.
 * Plate images are trimmed (tight-cropped, no transparent padding) versions of the hero loop assets, generated specifically for this feature so the fixed-size positioning math in ShowcasePlate.tsx behaves predictably (see scripts/convert-assets.mjs or the trim step documented there).
 */
export const SHOWCASE_SLIDES: readonly ShowcaseSlide[] = Object.freeze([
  Object.freeze({
    id: "sunday-colors-1",
    plateSrc: "/images/showcase/plate-6.webp",
    alt: "Sunday lunch plate with rich, colorful sides",
    paletteId: "blood-red",
    label: Object.freeze({ lineOne: "SUNDAY", lineTwo: "COLORS" }),
  }),
  Object.freeze({
    id: "sunday-colors-2",
    plateSrc: "/images/showcase/plate-8.webp",
    alt: "Sunday lunch plate with warm linen-toned sides",
    paletteId: "warm-linen",
    label: Object.freeze({ lineOne: "SUNDAY", lineTwo: "COLORS" }),
  }),
  Object.freeze({
    id: "hearty-flavors-1",
    plateSrc: "/images/showcase/plate-3.webp",
    alt: "Hearty beef and mince plate with rich espresso tones",
    paletteId: "espresso",
    label: Object.freeze({ lineOne: "HEARTY", lineTwo: "FLAVORS" }),
  }),
  Object.freeze({
    id: "hearty-flavors-2",
    plateSrc: "/images/showcase/plate-5.webp",
    alt: "Hearty plate with a soft strawberry-toned garnish",
    paletteId: "strawberry",
    label: Object.freeze({ lineOne: "HEARTY", lineTwo: "FLAVORS" }),
  }),
  Object.freeze({
    id: "hearty-flavors-3",
    plateSrc: "/images/showcase/plate-9.webp",
    alt: "Hearty plate with deep, bean-toned roast flavors",
    paletteId: "bean",
    label: Object.freeze({ lineOne: "HEARTY", lineTwo: "FLAVORS" }),
  }),
  Object.freeze({
    id: "sweet-greens-1",
    plateSrc: "/images/showcase/plate-1.webp",
    alt: "Fresh plate with olive-toned greens",
    paletteId: "olive",
    label: Object.freeze({ lineOne: "SWEET", lineTwo: "GREENS" }),
  }),
  Object.freeze({
    id: "sweet-greens-2",
    plateSrc: "/images/showcase/plate-2.webp",
    alt: "Fresh plate with persimmon-toned garnish",
    paletteId: "persimmon",
    label: Object.freeze({ lineOne: "SWEET", lineTwo: "GREENS" }),
  }),
  Object.freeze({
    id: "healthy-go-to-1",
    plateSrc: "/images/showcase/plate-4.webp",
    alt: "Healthy go-to plate with a light vanilla-toned base",
    paletteId: "vanilla",
    label: Object.freeze({ lineOne: "HEALTHY", lineTwo: "GO-TO" }),
  }),
  Object.freeze({
    id: "healthy-go-to-2",
    plateSrc: "/images/showcase/plate-7.webp",
    alt: "Healthy go-to plate with a bright lemon-cream finish",
    paletteId: "lemon-cream",
    label: Object.freeze({ lineOne: "HEALTHY", lineTwo: "GO-TO" }),
  }),
]);

export const SHOWCASE_SLIDE_COUNT: number = SHOWCASE_SLIDES.length;

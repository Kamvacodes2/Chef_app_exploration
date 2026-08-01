import type { Goal } from "../types";

/**
 * Onboarding body/lifestyle goals. Each maps to meal `goalTags` so the menu
 * filters to suit. Copy is warm and encouraging, never clinical. The final
 * "just-good-food" goal is the no-filter escape hatch for guests who just
 * want dinner.
 */
export const GOALS: readonly Goal[] = Object.freeze([
  Object.freeze({
    id: "lose-weight",
    title: "Lose Weight",
    tagline: "Lighter plates, big flavour, no rabbit food.",
    image: "/images/goals/lose-weight.webp",
    imageAlt: "Illustration of a tape measure crossed over a slimmer waistline",
    matchTags: Object.freeze(["light", "high-protein", "low-carb"]),
    paletteId: "olive",
  }),
  Object.freeze({
    id: "build-muscle",
    title: "Build Muscle",
    tagline: "Protein-packed plates to fuel the work.",
    image: "/images/goal-icons/build-muscle-dumbbell.svg",
    imageAlt: "Dumbbell icon for the build muscle goal",
    matchTags: Object.freeze(["high-protein"]),
    paletteId: "espresso",
  }),
  Object.freeze({
    id: "post-partum",
    title: "Post-Partum",
    tagline: "Nourishing, comforting, one-hand-friendly.",
    image: "/images/goals/post-partum.webp",
    imageAlt: "Illustration of a parent nourishing themselves while holding a baby",
    matchTags: Object.freeze(["nourishing", "iron-rich", "comfort"]),
    paletteId: "strawberry",
  }),
  Object.freeze({
    id: "anti-inflammatory",
    title: "Anti-Inflammatory",
    tagline: "Gentle, colourful, easy on the body.",
    image: "/images/goal-icons/anti-inflammatory-sprout.svg",
    imageAlt: "Sprout icon for the anti-inflammatory goal",
    matchTags: Object.freeze(["light", "plant-forward", "omega"]),
    paletteId: "lemon-cream",
  }),
  Object.freeze({
    id: "mediterranean",
    title: "Mediterranean",
    tagline: "Olive oil, grilled lean protein, fresh veg.",
    image: "/images/goal-icons/mediterranean-olive-branch.svg",
    imageAlt: "Olive branch icon for the mediterranean goal",
    matchTags: Object.freeze(["mediterranean", "light", "omega"]),
    paletteId: "vanilla",
  }),
  Object.freeze({
    id: "just-good-food",
    title: "Just Good Food",
    tagline: "No goal — show me everything delicious.",
    image: "/images/goal-icons/just-good-food-star.svg",
    imageAlt: "Star icon for the just good food goal",
    matchTags: Object.freeze([]),
    paletteId: "persimmon",
  }),
]);

export const DEFAULT_GOAL_ID = "just-good-food";

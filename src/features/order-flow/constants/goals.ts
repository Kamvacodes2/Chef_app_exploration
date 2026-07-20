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
    emoji: "🥗",
    matchTags: Object.freeze(["light", "high-protein", "low-carb"]),
    paletteId: "olive",
  }),
  Object.freeze({
    id: "build-muscle",
    title: "Build Muscle",
    tagline: "Protein-packed plates to fuel the work.",
    emoji: "💪",
    matchTags: Object.freeze(["high-protein"]),
    paletteId: "espresso",
  }),
  Object.freeze({
    id: "anti-inflammatory",
    title: "Anti-Inflammatory",
    tagline: "Gentle, colourful, easy on the body.",
    emoji: "🌿",
    matchTags: Object.freeze(["light", "plant-forward", "omega"]),
    paletteId: "lemon-cream",
  }),
  Object.freeze({
    id: "post-partum",
    title: "Post-Partum",
    tagline: "Nourishing, comforting, one-hand-friendly.",
    emoji: "🤱",
    matchTags: Object.freeze(["nourishing", "iron-rich", "comfort"]),
    paletteId: "strawberry",
  }),
  Object.freeze({
    id: "mediterranean",
    title: "Mediterranean",
    tagline: "Olive oil, grilled lean protein, fresh veg.",
    emoji: "🫒",
    matchTags: Object.freeze(["mediterranean", "light", "omega"]),
    paletteId: "vanilla",
  }),
  Object.freeze({
    id: "just-good-food",
    title: "Just Good Food",
    tagline: "No goal — show me everything delicious.",
    emoji: "😋",
    matchTags: Object.freeze([]),
    paletteId: "persimmon",
  }),
]);

export const DEFAULT_GOAL_ID = "just-good-food";

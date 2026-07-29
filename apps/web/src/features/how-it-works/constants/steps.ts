export interface HowItWorksStep {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly image: string;
  readonly alt: string;
}

/**
 * The product story distilled to 3 steps: choose/book, a chef cooks in your
 * kitchen, then you sit down while the kitchen's already clean. Anything
 * more granular (matching, shopping lists, plating) is true but reads as
 * logistics, not the pitch.
 */
export const HOW_IT_WORKS_STEPS: readonly HowItWorksStep[] = [
  {
    id: "choose-and-book",
    title: "Choose & Book",
    description:
      "Pick a meal you're craving and a time that suits you — we'll send the exact shopping list.",
    image: "/images/how-it-works/choose-what-youre-craving.webp",
    alt: "Choose & Book",
  },
  {
    id: "a-chef-cooks-in-your-kitchen",
    title: "A Chef Cooks in Your Kitchen",
    description:
      "We match you with a chef who arrives on time and cooks everything fresh, right there.",
    image: "/images/how-it-works/your-chef-arrives.webp",
    alt: "A Chef Cooks in Your Kitchen",
  },
  {
    id: "sit-down-we-clean-up",
    title: "Sit Down. We Clean Up.",
    description: "Dinner's served and the kitchen's spotless — you just enjoy the evening.",
    image: "/images/how-it-works/enjoy-your-evening.webp",
    alt: "Sit Down. We Clean Up.",
  },
] as const;

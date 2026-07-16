export interface HowItWorksStep {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly image: string;
  readonly alt: string;
}

export const HOW_IT_WORKS_STEPS: readonly HowItWorksStep[] = [
  {
    id: "choose-what-youre-craving",
    title: "Choose What You're Craving",
    description: "Browse meals you'll love.",
    image: "/images/how-it-works/choose-what-youre-craving.webp",
    alt: "Choose What You're Craving",
  },
  {
    id: "book-a-time",
    title: "Book a Time",
    description: "Pick a day that suits you.",
    image: "/images/how-it-works/book-a-time.webp",
    alt: "Book a Time",
  },
  {
    id: "shop-with-confidence",
    title: "Shop with Confidence",
    description: "We'll send you the exact ingredient list. (No guessing.)",
    image: "/images/how-it-works/shop-with-confidence.webp",
    alt: "Shop with Confidence",
  },
  {
    id: "we-match-you",
    title: "We Match You",
    description: "We'll pair you with the perfect chef. (No browsing hundreds of profiles.)",
    image: "/images/how-it-works/we-match-you.webp",
    alt: "We Match You",
  },
  {
    id: "your-chef-arrives",
    title: "Your Chef Arrives",
    description: "Right on time. Ready to cook.",
    image: "/images/how-it-works/your-chef-arrives.webp",
    alt: "Your Chef Arrives",
  },
  {
    id: "freshly-cooked",
    title: "Freshly Cooked",
    description: "Everything prepared in your own kitchen.",
    image: "/images/how-it-works/freshly-cooked.webp",
    alt: "Freshly Cooked",
  },
  {
    id: "kitchen-left-spotless",
    title: "Kitchen Left Spotless",
    description: "No dishes. No mess.",
    image: "/images/how-it-works/kitchen-left-spotless.webp",
    alt: "Kitchen Left Spotless",
  },
  {
    id: "enjoy-your-evening",
    title: "Enjoy Your Evening",
    description: "Spend time with family. Watch a movie. Read. Rest. Just be home.",
    image: "/images/how-it-works/enjoy-your-evening.webp",
    alt: "Enjoy Your Evening",
  },
] as const;

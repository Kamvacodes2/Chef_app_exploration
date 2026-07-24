export interface IntroFrame {
  readonly id: string;
  readonly image: string;
  readonly alt: string;
  readonly headline: string;
  readonly body: string;
  /**
   * object-position for the crossfading banner image. Cooking, Garnishing,
   * and Relaxing are portrait-cropped source photos (people/characters near
   * the top of the frame) composited into a wider 4:3 box, so a center crop
   * cuts off heads -- "top" keeps them in frame. Prepping's source is
   * already landscape and well-centered, so the default center crop is fine.
   */
  readonly imagePosition?: "center" | "top";
}

export const INTRO_FRAMES: readonly IntroFrame[] = [
  {
    id: "prepping",
    image: "/images/intro/prepping.webp",
    alt: "A chef finely chops fresh herbs and garlic on a wooden board in a home kitchen",
    headline: "A chef, in your kitchen, prepping real ingredients.",
    body: "Fresh herbs. Real garlic. Nothing frozen, nothing from a box.",
  },
  {
    id: "cooking",
    image: "/images/intro/cooking.webp",
    alt: "Hands stirring pasta and vegetables in a pan on a home stovetop",
    headline: "Cooked live, on your stove, right now.",
    body: "Not reheated. Not delivered cold. Made from scratch while you wait.",
    imagePosition: "top",
  },
  {
    id: "garnishing",
    image: "/images/intro/garnishing.webp",
    alt: "A chef seasoning a finished plate of food in a home kitchen",
    headline: "Finished with the care of a real chef.",
    body: "Plated, seasoned, tasted — before it ever reaches your table.",
    imagePosition: "top",
  },
  {
    id: "relaxing",
    image: "/images/intro/relaxing.webp",
    alt: "Friends relaxing on a couch with drinks and a cheese board, dinner already handled",
    headline: "We don't deliver dinner. We deliver kitchen help.",
    body: "You sit down, eat, and spend the evening with the people you love.",
    imagePosition: "top",
  },
] as const;

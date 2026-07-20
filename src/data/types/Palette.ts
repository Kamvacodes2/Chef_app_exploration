export type PaletteId =
  | "vanilla"
  | "olive"
  | "persimmon"
  | "espresso"
  | "strawberry"
  | "blood-red"
  | "lemon-cream"
  | "warm-linen"
  | "bean";

export interface Palette {
  readonly id: PaletteId;
  readonly from: string;
  readonly to: string;
  readonly mood: string;
  /**
   * The on-background text color to use for headline/CTA-style copy that
   * sits directly on this palette's gradient (not text inside the fixed
   * white/cream info card, which stays dark regardless of palette).
   */
  readonly textColor: string;
  /**
   * Perceived lightness of the palette background. "dark" palettes need
   * light-tinted line art (hands) and accents; "light" palettes need dark.
   */
  readonly tone: "light" | "dark";
  /**
   * The line-art stroke color the showcase hands should take on so they stay
   * visible against this palette. The source hand PNGs are dark blood-red
   * strokes; on dark palettes we recolor them to the light cream tone.
   */
  readonly handColor: string;
}

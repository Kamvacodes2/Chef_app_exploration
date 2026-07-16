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
}

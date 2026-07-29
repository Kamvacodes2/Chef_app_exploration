import type { PaletteId } from "@/data/types/Palette";

export interface ShowcaseCategoryLabel {
  readonly lineOne: string;
  readonly lineTwo: string;
}

export interface ShowcaseSlide {
  readonly id: string;
  readonly plateSrc: string;
  readonly alt: string;
  readonly paletteId: PaletteId;
  readonly label: ShowcaseCategoryLabel;
}

/**
 * EXITING is split into two non-overlapping sub-phases so the above-hands'
 * descent and the plate+above-hands' upward pull-away never run concurrently:
 *  - EXITING_HANDS_ARRIVING: above-hands descend to the "grab" position; the
 *    plate stays at rest (does not move).
 *  - EXITING_PULLING_AWAY: the plate and above-hands move up together and
 *    off-screen. Only after this completes does the controller advance to
 *    the next slide's ENTERING phase.
 */
export type ShowcasePhase =
  "ENTERING" | "HOLDING" | "EXITING_HANDS_ARRIVING" | "EXITING_PULLING_AWAY";

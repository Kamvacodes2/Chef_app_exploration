import { motion } from "framer-motion";
import type { ReactElement } from "react";
import { getPalette } from "@/features/hero/constants/palettes";
import { LABEL_VARIANTS } from "../constants/showcaseTransitions";
import type { ShowcaseSlide } from "../types";

export interface ShowcaseLabelProps {
  readonly slide: ShowcaseSlide;
  readonly reducedMotion: boolean;
}

/**
 * Left-aligned, two-line category label overlaid on the upper-left region
 * of the stage. Must be wrapped in <AnimatePresence> keyed by slide.id by
 * the parent.
 */
export function ShowcaseLabel({ slide, reducedMotion }: ShowcaseLabelProps): ReactElement {
  const palette = getPalette(slide.paletteId);
  const variants = reducedMotion
    ? {
        enter: { opacity: 0 },
        rest: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : LABEL_VARIANTS;

  return (
    <motion.div
      className="absolute left-[6%] top-[18%] md:top-[22%]"
      variants={variants}
      initial="enter"
      animate="rest"
      exit="exit"
      style={{ color: palette.textColor }}
      data-testid="showcase-label"
    >
      <p className="font-display text-6xl leading-none md:text-7xl lg:text-8xl">{slide.label.lineOne}</p>
      <p className="font-display text-6xl leading-none md:text-7xl lg:text-8xl">{slide.label.lineTwo}</p>
    </motion.div>
  );
}

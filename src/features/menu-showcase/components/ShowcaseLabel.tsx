import { motion } from "framer-motion";
import type { ReactElement } from "react";
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
  const variants = reducedMotion
    ? {
        enter: { opacity: 0 },
        rest: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : LABEL_VARIANTS;

  return (
    <motion.div
      className="absolute left-[6%] top-[14%] text-[var(--color-oxblood)] md:top-[18%]"
      variants={variants}
      initial="enter"
      animate="rest"
      exit="exit"
      data-testid="showcase-label"
    >
      <p className="font-display text-4xl leading-none md:text-7xl lg:text-8xl">
        {slide.label.lineOne}
      </p>
      <p className="font-display text-4xl leading-none md:text-7xl lg:text-8xl">
        {slide.label.lineTwo}
      </p>
      <a
        href="#order-flow"
        className="mt-4 inline-flex min-h-9 items-center rounded-xl bg-[var(--color-oxblood)] px-5 py-2 font-sans text-xs font-extrabold uppercase tracking-[0.08em] text-white shadow-lg transition-transform hover:scale-105 hover:bg-[var(--color-oxblood)]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-oxblood)] md:mt-6 md:min-h-11 md:px-7 md:py-3 md:text-sm"
      >
        Choose your meal
      </a>
    </motion.div>
  );
}

import Image from "next/image";
import { motion } from "framer-motion";
import type { ReactElement } from "react";
import {
  PLATE_BELOW_VARIANTS,
  PLATE_BOTTOM_PCT,
  PLATE_HEIGHT_PCT,
  PLATE_LEFT_PCT,
} from "../constants/showcaseTransitions";
import type { ShowcaseSlide } from "../types";

export interface ShowcasePlateProps {
  readonly slide: ShowcaseSlide;
  readonly reducedMotion: boolean;
  /**
   * Explicit variant key driven by the parent's phase/sub-phase state
   * machine. "rest" holds the plate in place (ENTERING, HOLDING, and the
   * EXITING_HANDS_ARRIVING sub-phase); "exit" moves the plate up and
   * off-screen, and must only be passed during EXITING_PULLING_AWAY so it
   * runs in lockstep with the above-hands' own upward pull-away motion.
   */
  readonly animate: "rest" | "exit";
}

/**
 * Fixed-size plate image, positioned in the right-of-center "hand-off"
 * zone of the stage. The parent drives `animate` explicitly (phase/sub-phase
 * based) rather than relying on AnimatePresence's unmount-triggered exit, so
 * the plate's upward exit can be synchronized exactly with the above-hands'
 * pull-away motion. The parent intentionally does NOT wrap this component in
 * AnimatePresence (see ShowcaseStageContent) — the `exit` variant/prop below
 * is reached explicitly via `animate="exit"` before unmount, so no
 * AnimatePresence-driven exit animation is needed or used.
 */
export function ShowcasePlate({ slide, reducedMotion, animate }: ShowcasePlateProps): ReactElement {
  const variants = reducedMotion
    ? {
        enter: { opacity: 0 },
        rest: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : PLATE_BELOW_VARIANTS;

  return (
    // Plain (non-motion) wrapper owns the static centering transform.
    // framer-motion takes exclusive ownership of the `transform` property
    // on any element it animates, so a static `translate(-50%, -100%)`
    // cannot live on the same element as the animated y/opacity variants
    // below — it gets silently dropped. Splitting positioning (here) from
    // the enter/hold/exit motion (inner motion.div) keeps both intact.
    //
    // Anchored by its BOTTOM edge (not center) at PLATE_BOTTOM_PCT, which
    // matches the measured top of the cradling hands in hands-below.webp.
    // Growing PLATE_HEIGHT_PCT therefore extends the plate upward and keeps
    // its resting bottom edge cradled by the hands regardless of size.
    <div
      className="absolute aspect-square"
      style={{
        left: `${PLATE_LEFT_PCT}%`,
        top: `${PLATE_BOTTOM_PCT}%`,
        height: `${PLATE_HEIGHT_PCT}%`,
        transform: "translate(-50%, -100%)",
      }}
    >
      <motion.div
        className="relative h-full w-full"
        variants={variants}
        initial="enter"
        animate={animate}
        exit="exit"
        data-testid="showcase-plate"
      >
        <Image
          src={slide.plateSrc}
          alt={slide.alt}
          fill
          sizes="(max-width: 767px) 90vw, 45vw"
          style={{ objectFit: "contain" }}
          priority
        />
      </motion.div>
    </div>
  );
}

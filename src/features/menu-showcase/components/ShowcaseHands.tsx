import Image from "next/image";
import { motion } from "framer-motion";
import type { ReactElement } from "react";
import { HANDS_ABOVE_VARIANTS, HANDS_BELOW_VARIANTS } from "../constants/showcaseTransitions";

export type ShowcaseHandsVariant = "below" | "below-left" | "below-right" | "above";

export interface ShowcaseHandsProps {
  readonly variant: ShowcaseHandsVariant;
  readonly reducedMotion: boolean;
  readonly animate: "enter" | "rest" | "exit" | "grab" | "pullAway";
}

const SOURCE_BY_VARIANT: Readonly<Record<ShowcaseHandsVariant, string>> = Object.freeze({
  below: "/images/showcase/hands-below.webp",
  // Split single-hand assets so the below-right hand can render in front of
  // the plate (its own DOM layer with a higher stacking position) while the
  // below-left hand stays behind it — matching the reference composition,
  // where the right hand's fingers visibly overlap the plate's front edge.
  // Both crops share the same 1280x720 canvas/coordinate space as the
  // combined hands-below.webp, so the same motion variants keep them in sync.
  "below-left": "/images/showcase/hand-below-left.webp",
  "below-right": "/images/showcase/hand-below-right.webp",
  above: "/images/showcase/hands-above.webp",
});

/**
 * Full-fill hands layer (below the plate, or above it for the "grab" exit
 * motion). `animate` drives the framer-motion variant key explicitly so the
 * parent can coordinate the below/above hand-off sequence.
 */
export function ShowcaseHands({ variant, reducedMotion, animate }: ShowcaseHandsProps): ReactElement {
  const baseVariants = variant === "above" ? HANDS_ABOVE_VARIANTS : HANDS_BELOW_VARIANTS;
  const variants = reducedMotion
    ? {
        enter: { opacity: 0 },
        rest: { opacity: 1 },
        grab: { opacity: 1 },
        pullAway: { opacity: 0 },
        exit: { opacity: 0 },
      }
    : baseVariants;

  return (
    <motion.div
      // Shifted right on desktop only, via left/right insets rather than a
      // static transform — framer-motion owns the `transform` property on
      // this element (animated y), so a static translateX here would be
      // silently dropped (same class of bug fixed earlier in ShowcasePlate).
      // left/right both move by the same amount, keeping the layer's width
      // (and therefore its scale) unchanged — a pure rightward shift.
      className="absolute inset-0 sm:left-[8%] sm:right-[-8%]"
      variants={variants}
      initial="enter"
      animate={animate}
      exit="exit"
      data-testid={`showcase-hands-${variant}`}
    >
      <Image
        src={SOURCE_BY_VARIANT[variant]}
        alt=""
        fill
        sizes="100vw"
        style={{ objectFit: "contain" }}
        aria-hidden="true"
      />
    </motion.div>
  );
}

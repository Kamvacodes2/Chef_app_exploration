import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { getPalette } from "@/features/hero/constants/palettes";
import { ShowcaseHands } from "./ShowcaseHands";
import { ShowcasePlate } from "./ShowcasePlate";
import { HANDS_RECEDE_DELAY_MS } from "../constants/showcaseTransitions";
import type { ShowcasePhase, ShowcaseSlide } from "../types";

export interface ShowcaseStageContentProps {
  readonly slide: ShowcaseSlide;
  readonly phase: ShowcasePhase;
  readonly reducedMotion: boolean;
}

type HandsBelowSubState = "cradle" | "recede";

/**
 * Shared hands + plate + hands stage content used by both the mobile and
 * desktop layout branches of MenuShowcase. Only the label's placement
 * differs between those branches, so it is intentionally excluded here and
 * rendered by the caller.
 */
export function ShowcaseStageContent({
  slide,
  phase,
  reducedMotion,
}: ShowcaseStageContentProps): ReactElement {
  // The plate's `animate` is driven explicitly by phase/sub-phase: "rest"
  // throughout ENTERING, HOLDING, and EXITING_HANDS_ARRIVING (it does not
  // move while the above-hands descend), and "exit" only during
  // EXITING_PULLING_AWAY, synchronized with the above-hands' own "pullAway"
  // motion so both travel up and off-screen together.
  //
  // The below-hands' motion is decoupled from the plate during HOLDING: they
  // rise together on ENTERING, then partway through HOLDING the hands recede
  // (as if letting go) while the plate stays resting. They intentionally do
  // NOT rise back up to meet the plate again before EXITING — the below-
  // hands are never involved in taking the plate away (only the above-hands
  // do that), so a "return to cradle" bump here would just be a third,
  // unnecessary upward movement. Once receded, they stay down through the
  // rest of HOLDING and both EXITING sub-phases, only rising again as part
  // of the NEXT slide's own ENTERING (a fresh below-hands instance, keyed by
  // the new slide.id, mounts already at this same off-screen position, so
  // there is no visible jump at the handoff).
  const [handsBelowSubState, setHandsBelowSubState] = useState<HandsBelowSubState>("cradle");

  useEffect(() => {
    if (phase !== "HOLDING") {
      setHandsBelowSubState("cradle");
      return undefined;
    }

    setHandsBelowSubState("cradle");
    const recedeTimer = setTimeout(() => setHandsBelowSubState("recede"), HANDS_RECEDE_DELAY_MS);

    return () => {
      clearTimeout(recedeTimer);
    };
  }, [phase, slide.id]);

  const isExiting = phase === "EXITING_HANDS_ARRIVING" || phase === "EXITING_PULLING_AWAY";

  // Resolve the palette's adaptive hand color so the line-art hands stay
  // visible against the current slide's background (dark palettes flip the
  // strokes to the light cream tone).
  const handColor = getPalette(slide.paletteId).handColor;

  // "cradle" (pre-recede HOLDING) and "rest" (ENTERING) target the identical
  // y/opacity/transition — both are simply "resting, cradling the plate" —
  // so a single "rest" animate value covers them both.
  const handsBelowAnimate = isExiting || handsBelowSubState === "recede" ? "exit" : "rest";

  // Plate stays at rest until the pull-away sub-phase, so its upward motion
  // starts exactly when the above-hands begin their own "pullAway" motion —
  // never before, and never overlapping with the hands-arriving sub-phase.
  const plateAnimate = phase === "EXITING_PULLING_AWAY" ? "exit" : "rest";

  return (
    <>
      {/*
       * The below-hands are split into two separate image layers (rather
       * than one combined image) so the right hand can render IN FRONT of
       * the plate while the left hand stays behind it — matching the
       * reference composition where the right hand's fingers visibly
       * overlap the plate's front edge. Both crops share the same motion
       * (handsBelowAnimate), so they move in lockstep.
       */}
      <AnimatePresence>
        <ShowcaseHands
          key={`${slide.id}-below-left`}
          variant="below-left"
          reducedMotion={reducedMotion}
          animate={handsBelowAnimate}
          lineColor={handColor}
        />
      </AnimatePresence>
      {/*
       * Intentionally NOT wrapped in AnimatePresence: the plate's motion is
       * now fully explicit via `animate` (phase/sub-phase driven), and by
       * the time `slideIndex` advances (changing `slide.id`, and therefore
       * this key) the old plate has already finished animating to "exit"
       * (fully off-screen top, opacity 0). Keeping AnimatePresence here
       * would additionally re-trigger its own implicit unmount-exit
       * animation on top of the one already explicitly driven above —
       * redundant at best, and a latent risk of a duplicate/conflicting
       * upward re-animation if timing ever drifts. Removing it is safe
       * because the old element is already fully invisible/off-screen when
       * React unmounts it on the key change, so there is nothing left to
       * visibly animate away.
       */}
      <ShowcasePlate key={slide.id} slide={slide} reducedMotion={reducedMotion} animate={plateAnimate} />
      <AnimatePresence>
        <ShowcaseHands
          key={`${slide.id}-below-right`}
          variant="below-right"
          reducedMotion={reducedMotion}
          animate={handsBelowAnimate}
          lineColor={handColor}
        />
      </AnimatePresence>
      <AnimatePresence>
        {isExiting ? (
          <ShowcaseHands
            key={`${slide.id}-above`}
            variant="above"
            reducedMotion={reducedMotion}
            animate={phase === "EXITING_HANDS_ARRIVING" ? "grab" : "pullAway"}
            lineColor={handColor}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}

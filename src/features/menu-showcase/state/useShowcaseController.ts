"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/features/hero/hooks/useMediaQuery";
import {
  HANDS_ABOVE_ARRIVE_MS,
  HOLD_MS,
  PLATE_ENTER_MS,
  PLATE_PULL_AWAY_MS,
} from "../constants/showcaseTransitions";
import { SHOWCASE_SLIDES, SHOWCASE_SLIDE_COUNT } from "../constants/slides";
import type { ShowcasePhase, ShowcaseSlide } from "../types";

interface ShowcaseState {
  readonly slideIndex: number;
  readonly phase: ShowcasePhase;
}

const INITIAL_STATE: ShowcaseState = Object.freeze({ slideIndex: 0, phase: "ENTERING" });

export interface ShowcaseController {
  readonly slide: ShowcaseSlide;
  readonly phase: ShowcasePhase;
  readonly slideIndex: number;
  readonly isPaused: boolean;
  pause: () => void;
  resume: () => void;
}

/**
 * Drives the menu showcase's ENTERING -> HOLDING -> EXITING_HANDS_ARRIVING ->
 * EXITING_PULLING_AWAY -> (advance) cycle via a chained setTimeout sequence.
 * The two EXITING sub-phases keep the above-hands' descent and the
 * plate+above-hands' upward pull-away strictly sequential/non-overlapping. `paused` (external, e.g. tab
 * visibility) and the hook's own internal pause (hover/focus, via the
 * returned `pause`/`resume`) both suspend timer advancement; either one
 * being active is enough to pause.
 */
export function useShowcaseController(paused: boolean): ShowcaseController {
  const [state, setState] = useState<ShowcaseState>(INITIAL_STATE);
  const [internalPaused, setInternalPaused] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const hasUserOverrideRef = useRef(false);

  // Reduced-motion users get an indefinitely auto-advancing carousel with no
  // consent by default: until they explicitly interact with pause/resume,
  // treat the controller as paused whenever the OS/browser reports a
  // reduced-motion preference. Once the user has explicitly toggled
  // pause/resume, their choice takes over and this effect stops overriding it.
  useEffect(() => {
    if (!hasUserOverrideRef.current) {
      setInternalPaused(prefersReducedMotion);
    }
  }, [prefersReducedMotion]);

  const isPaused = paused || internalPaused;
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  useEffect(() => {
    if (isPaused) {
      return undefined;
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const scheduleFrom = (phase: ShowcasePhase): void => {
      const durationMs =
        phase === "ENTERING"
          ? PLATE_ENTER_MS
          : phase === "HOLDING"
            ? HOLD_MS
            : phase === "EXITING_HANDS_ARRIVING"
              ? HANDS_ABOVE_ARRIVE_MS
              : PLATE_PULL_AWAY_MS;

      timeoutId = setTimeout(() => {
        if (isPausedRef.current) return;

        setState((prev) => {
          if (phase === "ENTERING") {
            return { ...prev, phase: "HOLDING" };
          }
          if (phase === "HOLDING") {
            return { ...prev, phase: "EXITING_HANDS_ARRIVING" };
          }
          if (phase === "EXITING_HANDS_ARRIVING") {
            return { ...prev, phase: "EXITING_PULLING_AWAY" };
          }
          return {
            slideIndex: (prev.slideIndex + 1) % SHOWCASE_SLIDE_COUNT,
            phase: "ENTERING",
          };
        });
      }, durationMs);
    };

    scheduleFrom(state.phase);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [state.phase, state.slideIndex, isPaused]);

  const pause = useCallback(() => {
    hasUserOverrideRef.current = true;
    setInternalPaused(true);
  }, []);
  const resume = useCallback(() => {
    hasUserOverrideRef.current = true;
    setInternalPaused(false);
  }, []);

  const slide = SHOWCASE_SLIDES[state.slideIndex] ?? SHOWCASE_SLIDES[0]!;

  return {
    slide,
    phase: state.phase,
    slideIndex: state.slideIndex,
    isPaused: internalPaused,
    pause,
    resume,
  };
}

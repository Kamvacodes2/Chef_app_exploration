"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { LOOP_ADVANCE_INTERVAL_MS } from "../constants/transitions";
import { DWELL_TO_DELIGHT_MS } from "../constants/transitions";
import { heroReducer } from "./heroReducer";
import { INITIAL_HERO_STATE } from "./heroMachine.types";
import type { HeroState } from "./heroMachine.types";

export interface HeroController {
  readonly state: HeroState;
  chooseMeal: () => void;
  navigate: (direction: 1 | -1, mealCount: number) => void;
  selectCategory: (categoryIndex: number) => void;
  reset: () => void;
  loopPaused: boolean;
  pauseLoop: () => void;
  resumeLoop: () => void;
}

/**
 * Owns the hero's reducer + dwell timer. The dwell timer resets on every
 * navigation and only fires DWELL_TIMEOUT while in the BROWSING phase,
 * promoting directly to DELIGHTED.
 */
export function useHeroController(): HeroController {
  const [state, dispatch] = useReducer(heroReducer, INITIAL_HERO_STATE);
  const [loopPaused, setLoopPaused] = useState(false);
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clearDwellTimer = useCallback(() => {
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = undefined;
    }
  }, []);

  useEffect(() => {
    clearDwellTimer();
    if (state.phase === "BROWSING") {
      dwellTimerRef.current = setTimeout(() => {
        dispatch({ type: "DWELL_TIMEOUT" });
      }, DWELL_TO_DELIGHT_MS);
    }
    return clearDwellTimer;
  }, [state.phase, state.navCount, clearDwellTimer]);

  // Auto-advance the meal loop during WAITING. Pauses on hover/focus via
  // loopPaused; stops entirely once the user enters BROWSING.
  const loopPausedRef = useRef(loopPaused);
  loopPausedRef.current = loopPaused;

  useEffect(() => {
    if (state.phase !== "WAITING") return undefined;
    const intervalId = setInterval(() => {
      if (!loopPausedRef.current) dispatch({ type: "LOOP_ADVANCE" });
    }, LOOP_ADVANCE_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [state.phase]);

  const chooseMeal = useCallback(() => dispatch({ type: "CHOOSE_MEAL" }), []);

  const navigate = useCallback(
    (direction: 1 | -1, mealCount: number) => dispatch({ type: "NAVIGATE", direction, mealCount }),
    [],
  );

  const selectCategory = useCallback(
    (categoryIndex: number) => dispatch({ type: "SELECT_CATEGORY", categoryIndex }),
    [],
  );

  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  const pauseLoop = useCallback(() => setLoopPaused(true), []);
  const resumeLoop = useCallback(() => setLoopPaused(false), []);

  return { state, chooseMeal, navigate, selectCategory, reset, loopPaused, pauseLoop, resumeLoop };
}

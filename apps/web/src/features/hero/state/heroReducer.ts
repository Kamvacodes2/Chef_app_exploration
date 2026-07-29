import type { HeroAction, HeroState } from "./heroMachine.types";
import { INITIAL_HERO_STATE } from "./heroMachine.types";

function wrapIndex(index: number, direction: 1 | -1, count: number): number {
  if (count <= 0) return 0;
  return (index + direction + count) % count;
}

/**
 * Pure reducer implementing the 3-phase hero state machine:
 * WAITING -> BROWSING -> DELIGHTED, with DELIGHTED demoting back to
 * BROWSING on further navigation. Always returns a new object (no mutation).
 */
export function heroReducer(state: HeroState, action: HeroAction): HeroState {
  switch (action.type) {
    case "CHOOSE_MEAL": {
      if (state.phase !== "WAITING") return state;
      return { ...state, phase: "BROWSING", navCount: 0 };
    }

    case "NAVIGATE": {
      if (state.phase === "WAITING") return state;

      const nextMealIndex = wrapIndex(state.mealIndex, action.direction, action.mealCount);
      const nextNavCount = state.navCount + 1;

      return {
        ...state,
        phase: "BROWSING",
        mealIndex: nextMealIndex,
        navCount: nextNavCount,
      };
    }

    case "DWELL_TIMEOUT": {
      if (state.phase !== "BROWSING") return state;
      return { ...state, phase: "DELIGHTED" };
    }

    case "SELECT_CATEGORY": {
      if (state.phase === "WAITING") return state;
      return { ...state, categoryIndex: action.categoryIndex, mealIndex: 0 };
    }
    case "LOOP_ADVANCE": {
      if (state.phase !== "WAITING") return state;
      return { ...state, loopIndex: state.loopIndex + 1 };
    }

    case "RESET": {
      return { ...INITIAL_HERO_STATE };
    }

    default:
      return state;
  }
}

export type HeroPhase = "WAITING" | "BROWSING" | "DELIGHTED";

export interface HeroState {
  readonly phase: HeroPhase;
  readonly categoryIndex: number;
  readonly mealIndex: number;
  readonly navCount: number;
  /** Index into MEAL_LOOP_ITEMS, advanced only during WAITING. */
  readonly loopIndex: number;
}

export type HeroAction =
  | { type: "CHOOSE_MEAL" }
  | { type: "NAVIGATE"; direction: 1 | -1; mealCount: number }
  | { type: "DWELL_TIMEOUT" }
  | { type: "SELECT_CATEGORY"; categoryIndex: number }
  | { type: "LOOP_ADVANCE" }
  | { type: "RESET" };

export const INITIAL_HERO_STATE: HeroState = Object.freeze({
  phase: "WAITING",
  categoryIndex: 0,
  mealIndex: 0,
  navCount: 0,
  loopIndex: 0,
});

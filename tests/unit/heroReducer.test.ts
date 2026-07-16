import { describe, expect, it } from "vitest";
import { heroReducer } from "@/features/hero/state/heroReducer";
import { INITIAL_HERO_STATE } from "@/features/hero/state/heroMachine.types";
import type { HeroState } from "@/features/hero/state/heroMachine.types";

describe("heroReducer", () => {
  it("stays WAITING on NAVIGATE while in WAITING phase", () => {
    const result = heroReducer(INITIAL_HERO_STATE, { type: "NAVIGATE", direction: 1, mealCount: 3 });
    expect(result).toBe(INITIAL_HERO_STATE);
  });

  it("transitions WAITING -> BROWSING on CHOOSE_MEAL", () => {
    const result = heroReducer(INITIAL_HERO_STATE, { type: "CHOOSE_MEAL" });
    expect(result.phase).toBe("BROWSING");
    expect(result).not.toBe(INITIAL_HERO_STATE);
  });

  it("does not re-enter BROWSING via CHOOSE_MEAL when already browsing", () => {
    const browsing: HeroState = { ...INITIAL_HERO_STATE, phase: "BROWSING" };
    const result = heroReducer(browsing, { type: "CHOOSE_MEAL" });
    expect(result).toBe(browsing);
  });

  it("increments navCount and mealIndex on NAVIGATE while BROWSING", () => {
    const browsing: HeroState = { ...INITIAL_HERO_STATE, phase: "BROWSING" };
    const result = heroReducer(browsing, { type: "NAVIGATE", direction: 1, mealCount: 3 });
    expect(result.navCount).toBe(1);
    expect(result.mealIndex).toBe(1);
    expect(result.phase).toBe("BROWSING");
  });

  it("wraps mealIndex forward past the end of the meal count", () => {
    const state: HeroState = { ...INITIAL_HERO_STATE, phase: "BROWSING", mealIndex: 2 };
    const result = heroReducer(state, { type: "NAVIGATE", direction: 1, mealCount: 3 });
    expect(result.mealIndex).toBe(0);
  });

  it("wraps mealIndex backward before the start of the meal count", () => {
    const state: HeroState = { ...INITIAL_HERO_STATE, phase: "BROWSING", mealIndex: 0 };
    const result = heroReducer(state, { type: "NAVIGATE", direction: -1, mealCount: 3 });
    expect(result.mealIndex).toBe(2);
  });

  it("stays BROWSING regardless of how many times NAVIGATE fires", () => {
    let state: HeroState = { ...INITIAL_HERO_STATE, phase: "BROWSING" };
    state = heroReducer(state, { type: "NAVIGATE", direction: 1, mealCount: 5 });
    state = heroReducer(state, { type: "NAVIGATE", direction: 1, mealCount: 5 });
    state = heroReducer(state, { type: "NAVIGATE", direction: 1, mealCount: 5 });
    expect(state.phase).toBe("BROWSING");
    expect(state.navCount).toBe(3);
  });

  it("ignores DWELL_TIMEOUT unless in BROWSING", () => {
    const waiting: HeroState = { ...INITIAL_HERO_STATE, phase: "WAITING" };
    const result = heroReducer(waiting, { type: "DWELL_TIMEOUT" });
    expect(result).toBe(waiting);
  });

  it("transitions BROWSING -> DELIGHTED on DWELL_TIMEOUT", () => {
    const browsing: HeroState = { ...INITIAL_HERO_STATE, phase: "BROWSING" };
    const result = heroReducer(browsing, { type: "DWELL_TIMEOUT" });
    expect(result.phase).toBe("DELIGHTED");
  });

  it("does not re-trigger DWELL_TIMEOUT while already DELIGHTED", () => {
    const delighted: HeroState = { ...INITIAL_HERO_STATE, phase: "DELIGHTED" };
    const result = heroReducer(delighted, { type: "DWELL_TIMEOUT" });
    expect(result).toBe(delighted);
  });

  it("demotes DELIGHTED -> BROWSING on NAVIGATE", () => {
    const delighted: HeroState = { ...INITIAL_HERO_STATE, phase: "DELIGHTED", navCount: 5 };
    const result = heroReducer(delighted, { type: "NAVIGATE", direction: 1, mealCount: 4 });
    expect(result.phase).toBe("BROWSING");
    expect(result.navCount).toBe(6);
  });

  it("never mutates the input state object", () => {
    const state: HeroState = { ...INITIAL_HERO_STATE, phase: "BROWSING" };
    const snapshot = { ...state };
    heroReducer(state, { type: "NAVIGATE", direction: 1, mealCount: 3 });
    expect(state).toEqual(snapshot);
  });

  it("resets mealIndex and updates categoryIndex on SELECT_CATEGORY", () => {
    const state: HeroState = { ...INITIAL_HERO_STATE, phase: "BROWSING", mealIndex: 2 };
    const result = heroReducer(state, { type: "SELECT_CATEGORY", categoryIndex: 1 });
    expect(result.categoryIndex).toBe(1);
    expect(result.mealIndex).toBe(0);
  });

  it("handles a zero mealCount without throwing", () => {
    const state: HeroState = { ...INITIAL_HERO_STATE, phase: "BROWSING" };
    const result = heroReducer(state, { type: "NAVIGATE", direction: 1, mealCount: 0 });
    expect(result.mealIndex).toBe(0);
  });

  it("advances loopIndex by 1 on LOOP_ADVANCE while WAITING", () => {
    const result = heroReducer(INITIAL_HERO_STATE, { type: "LOOP_ADVANCE" });
    expect(result.loopIndex).toBe(1);
    expect(result.phase).toBe("WAITING");
  });

  it("grows loopIndex monotonically — never wraps back to 0", () => {
    let state = INITIAL_HERO_STATE;
    const iterations = 20; // well past the 9-item array length
    for (let i = 0; i < iterations; i++) {
      state = heroReducer(state, { type: "LOOP_ADVANCE" });
    }
    expect(state.loopIndex).toBe(20);
    expect(state.phase).toBe("WAITING");
  });

  it("ignores LOOP_ADVANCE outside the WAITING phase", () => {
    const browsing: HeroState = { ...INITIAL_HERO_STATE, phase: "BROWSING", loopIndex: 3 };
    const result = heroReducer(browsing, { type: "LOOP_ADVANCE" });
    expect(result.loopIndex).toBe(3);
  });

  it("resets loopIndex to 0 on RESET", () => {
    const state: HeroState = { ...INITIAL_HERO_STATE, loopIndex: 42 };
    const result = heroReducer(state, { type: "RESET" });
    expect(result.loopIndex).toBe(0);
  });


  it("returns to the true initial state on RESET from a non-initial DELIGHTED state", () => {
    const state: HeroState = {
      phase: "DELIGHTED",
      categoryIndex: 2,
      mealIndex: 3,
      navCount: 7,
      loopIndex: 4,
    };
    const result = heroReducer(state, { type: "RESET" });
    expect(result).toEqual(INITIAL_HERO_STATE);
    expect(result.phase).toBe("WAITING");
    expect(result.mealIndex).toBe(0);
    expect(result.categoryIndex).toBe(0);
    expect(result.navCount).toBe(0);
  });

  it("RESET is a no-op-equivalent (still returns initial state) when already WAITING", () => {
    const result = heroReducer(INITIAL_HERO_STATE, { type: "RESET" });
    expect(result).toEqual(INITIAL_HERO_STATE);
  });
});

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useHeroController } from "@/features/hero/state/useHeroController";
import { DWELL_TO_DELIGHT_MS } from "@/features/hero/constants/transitions";
import { LOOP_ADVANCE_INTERVAL_MS } from "@/features/hero/constants/transitions";

describe("useHeroController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts in WAITING", () => {
    const { result } = renderHook(() => useHeroController());
    expect(result.current.state.phase).toBe("WAITING");
  });

  it("moves to BROWSING on chooseMeal, then DELIGHTED after the dwell timeout", () => {
    const { result } = renderHook(() => useHeroController());

    act(() => result.current.chooseMeal());
    expect(result.current.state.phase).toBe("BROWSING");

    act(() => {
      vi.advanceTimersByTime(DWELL_TO_DELIGHT_MS + 10);
    });
    expect(result.current.state.phase).toBe("DELIGHTED");
  });

  it("does not fire the dwell timeout while still navigating within the window", () => {
    const { result } = renderHook(() => useHeroController());
    act(() => result.current.chooseMeal());
    act(() => result.current.navigate(1, 5));

    act(() => {
      vi.advanceTimersByTime(DWELL_TO_DELIGHT_MS - 100);
    });
    expect(result.current.state.phase).toBe("BROWSING");

    act(() => result.current.navigate(1, 5));
    act(() => {
      vi.advanceTimersByTime(DWELL_TO_DELIGHT_MS - 100);
    });
    expect(result.current.state.phase).toBe("BROWSING");
  });

  it("demotes DELIGHTED back to BROWSING on further navigation", () => {
    const { result } = renderHook(() => useHeroController());
    act(() => result.current.chooseMeal());
    act(() => {
      vi.advanceTimersByTime(DWELL_TO_DELIGHT_MS + 10);
    });
    expect(result.current.state.phase).toBe("DELIGHTED");

    act(() => result.current.navigate(1, 5));
    expect(result.current.state.phase).toBe("BROWSING");
  });

  it("auto-advances the loop index while WAITING", () => {
    const { result } = renderHook(() => useHeroController());
    expect(result.current.state.loopIndex).toBe(0);
    expect(result.current.state.phase).toBe("WAITING");

    act(() => {
      vi.advanceTimersByTime(LOOP_ADVANCE_INTERVAL_MS);
    });
    expect(result.current.state.loopIndex).toBe(1);
  });

  it("stops advancing the loop once BROWSING starts", () => {
    const { result } = renderHook(() => useHeroController());
    act(() => result.current.chooseMeal());
    expect(result.current.state.phase).toBe("BROWSING");

    const indexBefore = result.current.state.loopIndex;
    act(() => {
      vi.advanceTimersByTime(LOOP_ADVANCE_INTERVAL_MS * 3);
    });
    expect(result.current.state.loopIndex).toBe(indexBefore);
  });

  it("pauses the loop when pauseLoop is called and resumes on resumeLoop", () => {
    const { result } = renderHook(() => useHeroController());
    act(() => result.current.pauseLoop());
    expect(result.current.loopPaused).toBe(true);

    act(() => {
      vi.advanceTimersByTime(LOOP_ADVANCE_INTERVAL_MS * 2);
    });
    expect(result.current.state.loopIndex).toBe(0);

    act(() => result.current.resumeLoop());
    expect(result.current.loopPaused).toBe(false);

    act(() => {
      vi.advanceTimersByTime(LOOP_ADVANCE_INTERVAL_MS);
    });
    expect(result.current.state.loopIndex).toBe(1);
  });
});

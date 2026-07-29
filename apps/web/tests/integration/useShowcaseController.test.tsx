import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useShowcaseController } from "@/features/menu-showcase/state/useShowcaseController";
import {
  HANDS_ABOVE_ARRIVE_MS,
  HOLD_MS,
  PLATE_ENTER_MS,
  PLATE_PULL_AWAY_MS,
} from "@/features/menu-showcase/constants/showcaseTransitions";
import { SHOWCASE_SLIDE_COUNT } from "@/features/menu-showcase/constants/slides";
import * as mediaQuery from "@/features/hero/hooks/useMediaQuery";

vi.mock("@/features/hero/hooks/useMediaQuery", async () => {
  const actual = await vi.importActual<typeof mediaQuery>("@/features/hero/hooks/useMediaQuery");
  return {
    ...actual,
    usePrefersReducedMotion: vi.fn(() => false),
  };
});

describe("useShowcaseController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(mediaQuery.usePrefersReducedMotion).mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("progresses ENTERING -> HOLDING -> EXITING sub-phases -> advances slideIndex -> back to ENTERING", () => {
    const { result } = renderHook(() => useShowcaseController(false));

    expect(result.current.phase).toBe("ENTERING");
    expect(result.current.slideIndex).toBe(0);

    act(() => {
      vi.advanceTimersByTime(PLATE_ENTER_MS);
    });
    expect(result.current.phase).toBe("HOLDING");

    act(() => {
      vi.advanceTimersByTime(HOLD_MS);
    });
    expect(result.current.phase).toBe("EXITING_HANDS_ARRIVING");

    act(() => {
      vi.advanceTimersByTime(HANDS_ABOVE_ARRIVE_MS);
    });
    expect(result.current.phase).toBe("EXITING_PULLING_AWAY");

    act(() => {
      vi.advanceTimersByTime(PLATE_PULL_AWAY_MS);
    });
    expect(result.current.phase).toBe("ENTERING");
    expect(result.current.slideIndex).toBe(1);
  });

  it("wraps slideIndex via modulo at the array boundary", () => {
    const { result } = renderHook(() => useShowcaseController(false));

    const fullCycleMs = PLATE_ENTER_MS + HOLD_MS + HANDS_ABOVE_ARRIVE_MS + PLATE_PULL_AWAY_MS;

    act(() => {
      for (let i = 0; i < SHOWCASE_SLIDE_COUNT; i += 1) {
        vi.advanceTimersByTime(fullCycleMs);
      }
    });

    expect(result.current.slideIndex).toBe(0);
  });

  it("stops progression while paused, even after advancing past the threshold", () => {
    const { result } = renderHook(() => useShowcaseController(false));

    act(() => result.current.pause());
    expect(result.current.isPaused).toBe(true);

    const phaseBefore = result.current.phase;
    const indexBefore = result.current.slideIndex;

    act(() => {
      vi.advanceTimersByTime(
        PLATE_ENTER_MS + HOLD_MS + HANDS_ABOVE_ARRIVE_MS + PLATE_PULL_AWAY_MS + 5000,
      );
    });

    expect(result.current.phase).toBe(phaseBefore);
    expect(result.current.slideIndex).toBe(indexBefore);
  });

  it("resumes progression after pause() then resume()", () => {
    const { result } = renderHook(() => useShowcaseController(false));

    act(() => result.current.pause());
    act(() => {
      vi.advanceTimersByTime(PLATE_ENTER_MS + 1000);
    });
    expect(result.current.phase).toBe("ENTERING");

    act(() => result.current.resume());
    expect(result.current.isPaused).toBe(false);

    act(() => {
      vi.advanceTimersByTime(PLATE_ENTER_MS);
    });
    expect(result.current.phase).toBe("HOLDING");
  });

  it("starts paused by default when usePrefersReducedMotion is true, until resume() is called", () => {
    vi.mocked(mediaQuery.usePrefersReducedMotion).mockReturnValue(true);

    const { result } = renderHook(() => useShowcaseController(false));

    expect(result.current.isPaused).toBe(true);

    act(() => {
      vi.advanceTimersByTime(
        PLATE_ENTER_MS + HOLD_MS + HANDS_ABOVE_ARRIVE_MS + PLATE_PULL_AWAY_MS + 5000,
      );
    });
    expect(result.current.phase).toBe("ENTERING");
    expect(result.current.slideIndex).toBe(0);

    act(() => result.current.resume());
    expect(result.current.isPaused).toBe(false);

    act(() => {
      vi.advanceTimersByTime(PLATE_ENTER_MS);
    });
    expect(result.current.phase).toBe("HOLDING");
  });

  it("clears pending timers on unmount without further state updates", () => {
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
    const { unmount } = renderHook(() => useShowcaseController(false));

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});

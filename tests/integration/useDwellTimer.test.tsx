import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDwellTimer } from "@/features/hero/hooks/useDwellTimer";

describe("useDwellTimer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("fires onTimeout after the delay when active", () => {
    const onTimeout = vi.fn();
    renderHook(() => useDwellTimer(true, 1000, "key-1", onTimeout));
    vi.advanceTimersByTime(1000);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("does not fire when inactive", () => {
    const onTimeout = vi.fn();
    renderHook(() => useDwellTimer(false, 1000, "key-1", onTimeout));
    vi.advanceTimersByTime(2000);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it("resets the timer when resetKey changes", () => {
    const onTimeout = vi.fn();
    const { rerender } = renderHook(({ key }) => useDwellTimer(true, 1000, key, onTimeout), {
      initialProps: { key: "a" },
    });
    vi.advanceTimersByTime(600);
    rerender({ key: "b" });
    vi.advanceTimersByTime(600);
    expect(onTimeout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });
});

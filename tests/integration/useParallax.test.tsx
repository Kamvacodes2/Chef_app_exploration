import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useParallax } from "@/features/hero/hooks/useParallax";

function firePointerMove(clientX: number, clientY: number) {
  window.dispatchEvent(
    new MouseEvent("pointermove", { clientX, clientY }) as unknown as PointerEvent,
  );
}

describe("useParallax", () => {
  it("resets motion values to zero when disabled", () => {
    const { result } = renderHook(() => useParallax(false));

    expect(result.current.x.get()).toBe(0);
    expect(result.current.y.get()).toBe(0);
  });

  it("updates motion values from pointermove when enabled", async () => {
    const { result } = renderHook(() => useParallax(true));

    act(() => {
      firePointerMove(window.innerWidth, window.innerHeight / 2);
    });

    // x/y are spring-smoothed, so they animate toward the target over
    // subsequent frames rather than jumping instantly.
    await waitFor(() => expect(result.current.x.get()).toBeGreaterThan(0));
    expect(result.current.y.get()).toBeCloseTo(0, 1);
  });

  it("stops updating after being disabled again", async () => {
    const { result, rerender } = renderHook(({ enabled }) => useParallax(enabled), {
      initialProps: { enabled: true },
    });

    act(() => {
      firePointerMove(window.innerWidth, window.innerHeight);
    });
    await waitFor(() => expect(result.current.x.get()).toBeGreaterThan(0));

    rerender({ enabled: false });
    await waitFor(() => expect(result.current.x.get()).toBeCloseTo(0, 2));
    expect(result.current.y.get()).toBeCloseTo(0, 2);
  });
});

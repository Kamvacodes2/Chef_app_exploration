import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useMealNavigation } from "@/features/hero/hooks/useMealNavigation";

function fireWheel(deltaY: number) {
  window.dispatchEvent(new WheelEvent("wheel", { deltaY, cancelable: true }));
}

function fireKey(key: string) {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, cancelable: true }));
}

function fireSwipe(startY: number, endY: number) {
  window.dispatchEvent(new TouchEvent("touchstart", { touches: [{ clientY: startY } as Touch] }));
  window.dispatchEvent(
    new TouchEvent("touchend", { changedTouches: [{ clientY: endY } as Touch] }),
  );
}

describe("useMealNavigation", () => {
  it("dispatches forward on ArrowRight and backward on ArrowLeft", () => {
    const onNavigate = vi.fn();
    renderHook(() => useMealNavigation({ enabled: true, onNavigate }));

    fireKey("ArrowRight");
    fireKey("ArrowLeft");

    expect(onNavigate).toHaveBeenNthCalledWith(1, 1);
    expect(onNavigate).toHaveBeenNthCalledWith(2, -1);
  });

  it("dispatches on wheel once the accumulated delta crosses the threshold", () => {
    const onNavigate = vi.fn();
    renderHook(() => useMealNavigation({ enabled: true, onNavigate, wheelThreshold: 20 }));

    fireWheel(25);
    expect(onNavigate).toHaveBeenCalledWith(1);
  });

  it("dispatches on an upward swipe past the threshold", () => {
    const onNavigate = vi.fn();
    renderHook(() => useMealNavigation({ enabled: true, onNavigate, swipeThreshold: 30 }));

    fireSwipe(200, 100);
    expect(onNavigate).toHaveBeenCalledWith(1);
  });

  it("dispatches on a downward swipe past the threshold", () => {
    const onNavigate = vi.fn();
    renderHook(() => useMealNavigation({ enabled: true, onNavigate, swipeThreshold: 30 }));

    fireSwipe(100, 200);
    expect(onNavigate).toHaveBeenCalledWith(-1);
  });

  it("ignores a swipe below the threshold", () => {
    const onNavigate = vi.fn();
    renderHook(() => useMealNavigation({ enabled: true, onNavigate, swipeThreshold: 30 }));

    fireSwipe(100, 110);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("ignores arrow keys when the event target is an editable input", () => {
    const onNavigate = vi.fn();
    renderHook(() => useMealNavigation({ enabled: true, onNavigate }));

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true, bubbles: true }),
    );

    expect(onNavigate).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it("ignores arrow keys when the event target is contenteditable", () => {
    const onNavigate = vi.fn();
    renderHook(() => useMealNavigation({ enabled: true, onNavigate }));

    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    document.body.appendChild(div);
    div.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true, bubbles: true }),
    );

    expect(onNavigate).not.toHaveBeenCalled();
    document.body.removeChild(div);
  });

  it("does not attach listeners when disabled", () => {
    const onNavigate = vi.fn();
    renderHook(() => useMealNavigation({ enabled: false, onNavigate }));

    fireKey("ArrowRight");
    expect(onNavigate).not.toHaveBeenCalled();
  });
});

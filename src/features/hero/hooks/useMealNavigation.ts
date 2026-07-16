"use client";

import { useEffect, useRef } from "react";

export interface UseMealNavigationOptions {
  readonly enabled: boolean;
  readonly onNavigate: (direction: 1 | -1) => void;
  readonly wheelThreshold?: number;
  readonly swipeThreshold?: number;
}

/**
 * Wires wheel/trackpad, arrow-key, and touch-swipe input to a single
 * onNavigate(direction) callback. Attaches listeners to `window` so it
 * works regardless of which element has focus.
 */
export function useMealNavigation({
  enabled,
  onNavigate,
  wheelThreshold = 24,
  swipeThreshold = 40,
}: UseMealNavigationOptions): void {
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;

  const wheelAccumRef = useRef(0);
  const wheelCooldownRef = useRef(false);
  const touchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return undefined;

    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      if (wheelCooldownRef.current) return;
      wheelAccumRef.current += event.deltaY;
      if (Math.abs(wheelAccumRef.current) >= wheelThreshold) {
        const direction: 1 | -1 = wheelAccumRef.current > 0 ? 1 : -1;
        wheelAccumRef.current = 0;
        wheelCooldownRef.current = true;
        onNavigateRef.current(direction);
        setTimeout(() => {
          wheelCooldownRef.current = false;
        }, 250);
      }
    }

    function isEditableTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        target.isContentEditable ||
        target.getAttribute("contenteditable") === "true" ||
        target.getAttribute("role") === "textbox"
      );
    }

    function handleKeydown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        onNavigateRef.current(1);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        onNavigateRef.current(-1);
      }
    }

    function handleTouchStart(event: TouchEvent) {
      touchStartYRef.current = event.touches[0]?.clientY ?? null;
    }

    function handleTouchEnd(event: TouchEvent) {
      const startY = touchStartYRef.current;
      const endY = event.changedTouches[0]?.clientY;
      touchStartYRef.current = null;
      if (startY == null || endY == null) return;
      const delta = startY - endY;
      if (Math.abs(delta) >= swipeThreshold) {
        onNavigateRef.current(delta > 0 ? 1 : -1);
      }
    }

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [enabled, wheelThreshold, swipeThreshold]);
}

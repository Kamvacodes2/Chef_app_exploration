"use client";

import { useMotionValue, useSpring } from "framer-motion";
import { useEffect } from "react";
import { PARALLAX_SPRING } from "../constants/parallax";

export interface ParallaxValues {
  readonly x: ReturnType<typeof useSpring>;
  readonly y: ReturnType<typeof useSpring>;
}

/**
 * Tracks normalized (-1..1) mouse position across the window and exposes
 * spring-smoothed motion values. Disabled entirely when `enabled` is false
 * (mobile / prefers-reduced-motion), in which case values stay at 0.
 */
export function useParallax(enabled: boolean): ParallaxValues {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, PARALLAX_SPRING);
  const y = useSpring(rawY, PARALLAX_SPRING);

  useEffect(() => {
    if (!enabled) {
      rawX.set(0);
      rawY.set(0);
      return undefined;
    }

    function handlePointerMove(event: PointerEvent) {
      const nx = (event.clientX / window.innerWidth) * 2 - 1;
      const ny = (event.clientY / window.innerHeight) * 2 - 1;
      rawX.set(nx);
      rawY.set(ny);
    }

    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [enabled, rawX, rawY]);

  return { x, y };
}

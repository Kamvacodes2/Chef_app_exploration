"use client";

import { useEffect, useRef } from "react";

/**
 * Fires `onTimeout` after `delayMs` of no dependency changes while `active`
 * is true. Resets whenever `resetKey` changes. Standalone/reusable version
 * of the dwell logic embedded in useHeroController.
 */
export function useDwellTimer(active: boolean, delayMs: number, resetKey: unknown, onTimeout: () => void): void {
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  useEffect(() => {
    if (!active) return undefined;
    const timer = setTimeout(() => onTimeoutRef.current(), delayMs);
    return () => clearTimeout(timer);
  }, [active, delayMs, resetKey]);
}

"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useLayoutEffect, useRef, useState } from "react";
import { MEAL_LOOP_ITEMS } from "../constants/mealLoop";
import { LOOP_TRACK_TRANSITION_MS } from "../constants/transitions";
import { useIsMobile } from "../hooks/useMediaQuery";

export interface MealLoopProps {
  /** Current index into MEAL_LOOP_ITEMS (the centered "anchor" meal). */
  readonly loopIndex: number;
  readonly onPause: () => void;
  readonly onResume: () => void;
}

/**
 * Horizontal food loop, used on both desktop and mobile. A track of 9 meal
 * images scrolls behind/in front of the model. The center slot is the
 * "anchor" — the meal there drives the background gradient and text color
 * (via the reducer's loopIndex → palette selector). Off-center meals shrink
 * and dim with a distance-based falloff so the track reads as a conveyor
 * bending around the model.
 *
 * `loopIndex` is monotonic (never wraps) — the track always scrolls in
 * the same direction. Enough copies of the 9-item array are rendered so
 * the current anchor position always has a multi-slot buffer ahead.
 *
 * Slot sizing is responsive: on mobile viewports the slot is narrower so
 * ~2 plates are comfortably visible edge-to-edge, while desktop keeps the
 * larger 128px slot. The anchor enlargement (ANCHOR_SCALE) and all the
 * lead-buffer/overflow-visible fixes below are viewport-agnostic and apply
 * identically at both sizes.
 */
export function MealLoop({ loopIndex, onPause, onResume }: MealLoopProps) {
  const count = MEAL_LOOP_ITEMS.length;
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const isMobile = useIsMobile();

  const SLOT_WIDTH = isMobile ? 140 : 176;
  const SLOT_GAP = isMobile ? 14 : 22;
  const SLOT_PITCH = SLOT_WIDTH + SLOT_GAP;

  // Fixed lead buffer rendered BEFORE the logical start of the loop
  // (loopIndex 0). Without this, at low loopIndex values (e.g. right after
  // mount) trackX shifts the whole strip far to the right to keep the
  // anchor centered, but there is no array content behind index 0 to fill
  // the vacated left side — leaving a blank left portion of the viewport
  // (regression: left ~40% of the page had no plates). Sized generously
  // (20 slots ≈ 2880px of half-track coverage) for the widest supported
  // viewport, so the left edge always has content to slide into view.
  const LEAD_SLOTS = 20;

  // Enough copies so loopIndex always has a buffer ahead too.
  const copiesNeeded = Math.max(5, Math.ceil(loopIndex / count) + 3);
  const forwardItems = Array.from({ length: copiesNeeded }, () => [...MEAL_LOOP_ITEMS]).flat();
  const leadItems = Array.from(
    { length: LEAD_SLOTS },
    (_, k) => MEAL_LOOP_ITEMS[(((LEAD_SLOTS - k) % count) + count) % count]!,
  );
  const items = [...leadItems, ...forwardItems];
  const activeIdx = loopIndex + LEAD_SLOTS;
  const MIN_OPACITY = 0.2;
  const OPACITY_FALLOFF = 0.15;
  const MIN_SCALE = 0.55;
  const SCALE_FALLOFF = 0.07;
  const ANCHOR_SCALE = 1.85;
  // Nudge the featured plate toward the model's hands instead of perfectly
  // centering it on the viewport.
  const ANCHOR_OFFSET_X = isMobile ? 14 : 34;

  // Measure the visible track width so the anchor slot can be centered
  // under the model (which is horizontally centered on the page) instead
  // of pinned to the left edge of the container.
  //
  // useLayoutEffect (rather than useEffect) runs synchronously before the
  // browser paints, so the initial measurement is applied before the user
  // ever sees a frame — minimizing the window where containerWidth is 0.
  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const updateWidth = (): void => {
      setContainerWidth(element.offsetWidth);
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Until the container has been measured at least once, containerWidth is
  // 0 and trackX would be a large negative number (anchor off-screen left).
  // Guard against animating from that bogus position by disabling the
  // transition entirely for the very first positioned frame.
  const hasMeasured = containerWidth > 0;

  const anchorOffset = activeIdx * SLOT_PITCH;
  const trackX = containerWidth / 2 - anchorOffset - SLOT_WIDTH / 2 + ANCHOR_OFFSET_X;

  return (
    <div
      ref={containerRef}
      // Deliberately NOT mixing overflow-x-hidden with overflow-y-visible:
      // per the CSS spec, when one axis is "hidden" and the other is
      // "visible", the "visible" axis is computationally promoted to
      // "auto" by the browser — which silently creates a real (nested)
      // scrollbar on this element whenever the scaled-up anchor plate
      // exceeds the container's height. That was the source of the
      // second/nested scrollbar bug. `overflow-visible` (both axes) avoids
      // the quirk entirely; horizontal edge-to-edge overflow is already
      // clipped page-wide by `overflow-x: hidden` on `body` in globals.css.
      className="relative w-full overflow-visible"
      data-testid="meal-loop"
      data-loop-index={loopIndex}
      onMouseEnter={onPause}
      onMouseLeave={onResume}
      onFocus={onPause}
      onBlur={onResume}
      aria-label="Featured meals, auto-scrolling"
    >
      <motion.div
        className="flex items-center py-4"
        style={{ gap: SLOT_GAP }}
        animate={{ x: trackX }}
        transition={
          hasMeasured
            ? {
                duration: LOOP_TRACK_TRANSITION_MS / 1000,
                ease: [0.4, 0.0, 0.2, 1],
              }
            : { duration: 0 }
        }
      >
        {items.map((item, i) => {
          const distance = Math.abs(i - activeIdx);
          const isAnchor = distance === 0;
          // Falloff: anchor = 1.0, neighbors = 0.7, then decay outward
          const opacity = Math.max(MIN_OPACITY, 1 - distance * OPACITY_FALLOFF);
          const scale = isAnchor ? ANCHOR_SCALE : Math.max(MIN_SCALE, 1 - distance * SCALE_FALLOFF);

          return (
            <motion.div
              key={`${item.id}-${i}`}
              className="relative flex-shrink-0"
              style={{
                width: SLOT_WIDTH,
                opacity,
                zIndex: isAnchor ? 10 : 1,
                // Scale from the bottom edge (not center) so the enlarged
                // anchor plate grows upward into the model image instead of
                // symmetrically — otherwise half of the scale overflow pushes
                // the anchor's bottom edge past the viewport fold.
                transformOrigin: "center bottom",
              }}
              animate={{ scale }}
              transition={{
                duration: LOOP_TRACK_TRANSITION_MS / 1000,
                ease: [0.4, 0.0, 0.2, 1],
              }}
              data-testid={isAnchor ? "meal-loop-anchor" : undefined}
            >
              {/* No extra border/shadow — the plate image IS the plate frame */}
              <div className="relative aspect-square w-full">
                <Image
                  src={item.imageSrc}
                  alt={item.alt}
                  fill
                  sizes={`${SLOT_WIDTH}px`}
                  style={{ objectFit: "contain" }}
                  priority={isAnchor}
                />
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

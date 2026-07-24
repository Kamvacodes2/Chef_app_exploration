"use client";

import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from "framer-motion";
import type { KeyboardEvent } from "react";
import { useRef } from "react";
import { usePrefersReducedMotion } from "@/features/hero/hooks/useMediaQuery";
import type { HowItWorksStep } from "../constants/steps";

export interface StepTimelineProps {
  readonly steps: readonly HowItWorksStep[];
  readonly activeIndex: number;
  readonly onStepSelect: (index: number) => void;
}

/**
 * How long (ms) to suppress scroll-driven active-step updates after a manual
 * click, so a click isn't immediately fought/overridden by the scroll
 * listener recomputing a different band for the current scroll position.
 */
const MANUAL_OVERRIDE_SUPPRESSION_MS = 600;

/**
 * How much scroll distance (in viewport heights) each step "owns" on
 * desktop. Increasing this slows the pacing of the scroll-driven timeline --
 * progressing through all steps now requires substantially more scrolling
 * than the height of the (now windowed, 3-item) step list alone would allow.
 */
const SCROLL_VH_PER_STEP = 60;

/** Number of timeline items visible at once in the windowed view. */
const WINDOW_SIZE = 3;

function handleKeyActivate(event: KeyboardEvent<HTMLButtonElement>, onActivate: () => void): void {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onActivate();
  }
}

function bandIndexFromProgress(progress: number, stepCount: number): number {
  if (stepCount <= 1) return 0;
  const band = Math.floor(progress * stepCount);
  return Math.min(stepCount - 1, Math.max(0, band));
}

/**
 * Computes the (inclusive) start/end indices of the sliding window of
 * visible steps for a given active index, clamped to the bounds of the
 * step list so the window never has fewer than `windowSize` items unless
 * the whole list is shorter than that.
 */
function windowIndicesFor(
  activeIndex: number,
  length: number,
  windowSize: number = WINDOW_SIZE,
): readonly number[] {
  if (length <= windowSize) {
    return Array.from({ length }, (_, i) => i);
  }

  const half = Math.floor(windowSize / 2);
  let start = activeIndex - half;
  let end = activeIndex + half;

  if (start < 0) {
    end += -start;
    start = 0;
  }
  if (end > length - 1) {
    start -= end - (length - 1);
    end = length - 1;
  }
  start = Math.max(0, start);

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export function StepTimeline({ steps, activeIndex, onStepSelect }: StepTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isManualRef = useRef(false);
  const manualTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const prefersReducedMotion = usePrefersReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.8", "end end"],
  });

  // Spring-smooth the raw scroll input so step transitions feel fluid
  // instead of jerky. The spring acts as a low-pass filter on scroll deltas.
  // useSpring must be called unconditionally (Rules of Hooks); the reduced-
  // motion branch simply ignores its output in favor of the raw value.
  const springProgress = useSpring(scrollYProgress, {
    stiffness: 70,
    damping: 20,
    restDelta: 0.001,
  });
  const smoothProgress = prefersReducedMotion ? scrollYProgress : springProgress;

  const fillScaleY = useTransform(smoothProgress, [0, 1], [0, 1]);

  useMotionValueEvent(smoothProgress, "change", (latest) => {
    if (isManualRef.current) return;
    const nextIndex = bandIndexFromProgress(latest, steps.length);
    if (nextIndex !== activeIndex) {
      onStepSelect(nextIndex);
    }
  });

  const handleManualSelect = (index: number): void => {
    isManualRef.current = true;
    onStepSelect(index);
    clearTimeout(manualTimeoutRef.current);
    manualTimeoutRef.current = setTimeout(() => {
      isManualRef.current = false;
    }, MANUAL_OVERRIDE_SUPPRESSION_MS);
  };

  const visibleIndices = windowIndicesFor(activeIndex, steps.length);

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ minHeight: `${steps.length * SCROLL_VH_PER_STEP}vh` }}
      data-testid="step-timeline-scroll-region"
    >
      <div className="flex flex-col justify-center rounded-3xl bg-[var(--color-oxblood)] px-8 py-10 sm:sticky sm:top-24 sm:h-[440px] sm:self-start">
        <ol className="relative flex flex-col gap-8 pl-10" data-testid="step-timeline">
          <span
            aria-hidden
            className="absolute left-5 top-2 bottom-2 w-px -translate-x-1/2 bg-[var(--color-bone)]/20"
            data-testid="timeline-track"
          />
          <motion.span
            aria-hidden
            className="absolute left-5 top-2 bottom-2 w-px -translate-x-1/2 origin-top bg-[var(--color-maize)]"
            style={{ scaleY: fillScaleY }}
            transition={prefersReducedMotion ? { duration: 0 } : undefined}
            data-testid="timeline-fill"
          />
          {visibleIndices.map((index) => {
            const step = steps[index]!;
            const isActive = index === activeIndex;
            return (
              <motion.li
                key={step.id}
                className="relative"
                initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
                animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.4, 0.0, 0.2, 1] }}
              >
                <span
                  aria-hidden
                  className={`absolute -left-5 top-1 h-4 w-4 -translate-x-1/2 rounded-full border-2 transition-colors duration-500 ease-out ${
                    index <= activeIndex
                      ? "border-[var(--color-maize)] bg-[var(--color-maize)]"
                      : "border-[var(--color-bone)]/30 bg-transparent"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => handleManualSelect(index)}
                  onKeyDown={(event) => handleKeyActivate(event, () => handleManualSelect(index))}
                  aria-current={isActive ? "step" : undefined}
                  className="group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-maize)] focus-visible:ring-offset-2 rounded-sm"
                >
                  <span
                    className={`font-sans block text-lg font-extrabold transition-colors duration-500 sm:text-xl ${
                      isActive ? "text-[var(--color-bone)]" : "text-[var(--color-bone)]/70"
                    }`}
                  >
                    {step.title}
                  </span>
                  <span className="mt-1 block text-sm text-[var(--color-bone)]/70">
                    {step.description}
                  </span>
                </button>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/features/hero/hooks/useMediaQuery";
import { INTRO_FRAMES } from "./constants/frames";
import { INTRO_ADVANCE_INTERVAL_MS, INTRO_CROSSFADE_MS } from "./constants/transitions";

/**
 * Half-image / half-copy banner that introduces the platform above the hero
 * section. Cycles through Prepping -> Cooking -> Garnishing -> Relaxing: the
 * photo on the left and the oxblood copy card on the right crossfade in
 * lockstep, mirroring the HowItWorks image/card split.
 */
export function PlatformIntro() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const frame = INTRO_FRAMES[index]!;

  useEffect(() => {
    if (paused || prefersReducedMotion) return undefined;
    const intervalId = setInterval(() => {
      setIndex((current) => (current + 1) % INTRO_FRAMES.length);
    }, INTRO_ADVANCE_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [paused, prefersReducedMotion]);

  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);

  return (
    <section
      className="bg-white px-6 py-20 sm:py-28"
      aria-label="What ChefMate is"
      data-testid="platform-intro"
      data-active-frame={frame.id}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
    >
      <div className="mx-auto max-w-7xl">
        <p className="mb-10 text-sm font-extrabold uppercase tracking-[0.2em] text-[var(--color-oxblood)]">
          What ChefMate Is
        </p>

        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-10">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl sm:h-[620px] sm:w-1/2">
            <AnimatePresence mode="sync">
              <motion.div
                key={frame.id}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: INTRO_CROSSFADE_MS / 1000 }}
              >
                <Image
                  src={frame.image}
                  alt={frame.alt}
                  fill
                  priority={index === 0}
                  sizes="(max-width: 767px) 100vw, 50vw"
                  style={{ objectFit: "cover", objectPosition: frame.imagePosition ?? "center" }}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex flex-col justify-center rounded-3xl bg-[var(--color-oxblood)] px-10 py-12 sm:h-[620px] sm:w-1/2 sm:px-14">
            <AnimatePresence mode="wait">
              <motion.div
                key={frame.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: INTRO_CROSSFADE_MS / 1000 }}
              >
                <h2 className="font-display text-4xl leading-tight text-[var(--color-bone)] sm:text-5xl">
                  {frame.headline}
                </h2>
                <p className="mt-6 text-lg text-[var(--color-bone)]/85 sm:text-xl">{frame.body}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import Image from "next/image";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { MEAL_SHOWCASE_ITEMS } from "../constants/mealShowcase";
import { usePrefersReducedMotion } from "../hooks/useMediaQuery";

const AUTO_ADVANCE_INTERVAL_MS = 3000;

const SWING_VARIANTS: Variants = {
  enter: { opacity: 0, rotate: 15, x: 40 },
  center: { opacity: 1, rotate: 0, x: 0 },
  exit: { opacity: 0, rotate: -15, x: -40 },
};

const REDUCED_MOTION_VARIANTS: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * A single large "swinging" card shown only in the WAITING state, close to
 * the model's hand. Auto-rotates through the curated meal themes every 3
 * seconds using a pendulum-like enter/exit transition, pausing on
 * hover/touch/focus and reduced to a simple crossfade for
 * prefers-reduced-motion users.
 */
export function MealShowcaseCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const pausedRef = useRef(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (pausedRef.current) return;
      setActiveIndex((current) => (current + 1) % MEAL_SHOWCASE_ITEMS.length);
    }, AUTO_ADVANCE_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);

  // MEAL_SHOWCASE_ITEMS is a non-empty readonly const array; activeIndex is
  // always kept in range by the modulo in the auto-advance interval.
  const activeItem = MEAL_SHOWCASE_ITEMS[activeIndex]!;
  const variants = reducedMotion ? REDUCED_MOTION_VARIANTS : SWING_VARIANTS;

  return (
    <div
      className="mx-auto w-full max-w-[160px] sm:max-w-[192px]"
      data-testid="meal-showcase-carousel"
    >
      <div
        role="group"
        aria-label="Featured meal themes, auto-rotating"
        tabIndex={0}
        onMouseEnter={() => {
          pausedRef.current = true;
        }}
        onMouseLeave={() => {
          pausedRef.current = false;
        }}
        onTouchStart={() => {
          pausedRef.current = true;
        }}
        onTouchEnd={() => {
          pausedRef.current = false;
        }}
        onFocus={() => {
          pausedRef.current = true;
        }}
        onBlur={() => {
          pausedRef.current = false;
        }}
        className="relative aspect-[4/5] w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F3E3B2]"
      >
        <AnimatePresence initial={false}>
          <motion.figure
            key={activeItem.id}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reducedMotion ? 0.15 : 0.4, ease: "easeOut" }}
            className="absolute inset-0 flex w-full flex-col items-center gap-2"
          >
            <div className="relative aspect-square w-full overflow-hidden rounded-3xl">
              <Image
                src={activeItem.imageSrc}
                alt={activeItem.alt}
                fill
                sizes="(max-width: 767px) 55vw, 26vw"
                style={{ objectFit: "cover" }}
                priority
              />
            </div>
            <motion.figcaption
              variants={{
                enter: { opacity: 0 },
                center: { opacity: 1 },
                exit: { opacity: 0, transition: { duration: reducedMotion ? 0.05 : 0.12 } },
              }}
              className="text-center font-display text-sm leading-tight text-white/90 sm:text-base"
            >
              {activeItem.theme}
            </motion.figcaption>
          </motion.figure>
        </AnimatePresence>
      </div>
    </div>
  );
}

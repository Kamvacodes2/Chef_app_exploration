"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { fetchCatalogMeals } from "@/features/featured-meals/api/featuredMealsClient";
import { POPULAR_MEALS } from "./content";
import { Container, Eyebrow, PrimaryLink } from "./primitives";

const POPULAR_MEAL_SEGMENT_COUNT = 5;
const MARQUEE_SPEED_PX_PER_S = 40;
const CARD_WIDTH_PX = 262; // 245px card + 16px gap + 1px border safety

interface MarqueeMeal {
  readonly id: string;
  readonly name: string;
  readonly imageSrc: string;
  readonly imageAlt: string;
}

/** Static safety net used before the live fetch resolves and if it fails. */
const FALLBACK_MEALS: readonly MarqueeMeal[] = POPULAR_MEALS.map((meal) => ({
  id: meal.id,
  name: meal.name,
  imageSrc: meal.imageSrc,
  imageAlt: meal.imageAlt,
}));

/**
 * Marquee of the admin-curated featured meals. Fetches on the client against
 * the real catalog API so an admin's saved change shows on the next page load.
 *
 * Interactive on all viewports: auto-scrolls, with pause/play and prev/next
 * controls so users can explore at their own pace.
 */
export function PopularMealsGrid(): ReactElement {
  const [meals, setMeals] = useState<readonly MarqueeMeal[]>(FALLBACK_MEALS);
  const [isPaused, setIsPaused] = useState(false);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const scrollAnimationRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number>(0);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const featured = await fetchCatalogMeals({ featured: true, signal: controller.signal });
        if (controller.signal.aborted || featured.length === 0) return;
        setMeals(
          featured.map((meal) => ({
            id: meal.slug,
            name: meal.name,
            imageSrc: meal.image.src,
            imageAlt: meal.image.alt,
          })),
        );
      } catch (caught) {
        if (controller.signal.aborted) return;
        console.warn("Featured meals fetch failed; using static list.", caught);
      }
    })();
    return () => controller.abort();
  }, []);

  const animateScroll = useCallback(
    (timestamp: number) => {
      const el = marqueeRef.current;
      if (!el) {
        scrollAnimationRef.current = requestAnimationFrame(animateScroll);
        return;
      }

      if (lastTimestampRef.current === 0) {
        lastTimestampRef.current = timestamp;
      }

      const delta = timestamp - lastTimestampRef.current;
      lastTimestampRef.current = timestamp;

      // Clamp delta so a background tab that resumes doesn't jump
      const px = Math.min((MARQUEE_SPEED_PX_PER_S * delta) / 1000, CARD_WIDTH_PX);
      el.scrollLeft += px;

      // Loop: when we scroll one full segment, snap back
      const segmentWidth = meals.length * CARD_WIDTH_PX;
      if (el.scrollLeft >= segmentWidth) {
        el.scrollLeft -= segmentWidth;
      }

      scrollAnimationRef.current = requestAnimationFrame(animateScroll);
    },
    [meals.length],
  );

  // Start / stop the animation loop based on pause state
  useEffect(() => {
    if (isPaused) {
      if (scrollAnimationRef.current !== null) {
        cancelAnimationFrame(scrollAnimationRef.current);
        scrollAnimationRef.current = null;
      }
      lastTimestampRef.current = 0;
      return;
    }

    lastTimestampRef.current = 0;
    scrollAnimationRef.current = requestAnimationFrame(animateScroll);
    return () => {
      if (scrollAnimationRef.current !== null) {
        cancelAnimationFrame(scrollAnimationRef.current);
        scrollAnimationRef.current = null;
      }
    };
  }, [isPaused, animateScroll]);

  // Clear any pending auto-resume timer on unmount
  useEffect(() => {
    return () => {
      if (resumeTimerRef.current !== null) {
        clearTimeout(resumeTimerRef.current);
      }
    };
  }, []);

  const togglePause = useCallback(() => {
    // Clear any pending auto-resume when the user manually toggles
    if (resumeTimerRef.current !== null) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
    setIsPaused((prev) => !prev);
  }, []);

  const scrollBy = useCallback(
    (direction: 1 | -1) => {
      const el = marqueeRef.current;
      if (!el) return;

      // Clear any pending auto-resume
      if (resumeTimerRef.current !== null) {
        clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = null;
      }

      setIsPaused(true);
      el.scrollBy({ left: direction * CARD_WIDTH_PX, behavior: "smooth" });

      // Auto-resume after a short pause
      resumeTimerRef.current = setTimeout(() => {
        resumeTimerRef.current = null;
        setIsPaused(false);
      }, 3000);
    },
    [],
  );

  const mealGroups = Array.from({ length: POPULAR_MEAL_SEGMENT_COUNT }, () => meals);

  return (
    <section
      id="meals"
      className="bg-[var(--color-warm-white)] py-14 sm:py-18 lg:py-20"
      aria-labelledby="popular-meals-title"
      data-testid="popular-meals"
    >
      <Container>
        <div className="mb-7 text-center">
          <Eyebrow>Popular this week</Eyebrow>
          <h2
            id="popular-meals-title"
            className="mt-3 font-display text-4xl text-[var(--color-oxblood)] sm:text-5xl"
          >
            Real meals, cooked at home.
          </h2>
        </div>
      </Container>

      <div className="relative">
        {/* Marquee track */}
        <div
          ref={marqueeRef}
          className="scrollbar-none flex gap-4 overflow-x-auto px-2 py-1"
          data-testid="popular-meal-loop"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocusCapture={() => setIsPaused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setIsPaused(false);
            }
          }}
        >
          {mealGroups.map((group, groupIndex) => (
            <div
              key={groupIndex}
              className="popular-meals-marquee-segment"
              aria-hidden={groupIndex > 0 || undefined}
            >
              {group.map((meal) => (
                <a
                  key={`${meal.id}-${groupIndex}`}
                  href={`#order-flow?meal=${meal.id}`}
                  className="group w-[245px] shrink-0 rounded-[22px] border border-[var(--color-oxblood)]/12 bg-[var(--color-warm-cream)] p-4 text-left transition hover:-translate-y-1 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-terracotta)] sm:w-[270px]"
                  data-order-meal-id={meal.id}
                  data-testid={groupIndex === 0 ? "popular-meal-card" : undefined}
                  tabIndex={groupIndex === 0 ? undefined : -1}
                >
                  <span className="relative block aspect-square overflow-hidden rounded-[18px] bg-white">
                    <Image
                      src={meal.imageSrc}
                      alt={meal.imageAlt}
                      fill
                      loading="lazy"
                      sizes="(max-width: 767px) 245px, 270px"
                      className="object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  </span>
                  <span className="mt-4 block font-display text-xl leading-tight text-[var(--color-oxblood)]">
                    {meal.name}
                  </span>
                </a>
              ))}
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Previous meals"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-oxblood)]/20 bg-white text-[var(--color-oxblood)] transition hover:bg-[var(--color-oxblood)]/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-terracotta)]"
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={togglePause}
            aria-label={isPaused ? "Resume auto-scroll" : "Pause auto-scroll"}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-oxblood)]/20 bg-white text-[var(--color-oxblood)] transition hover:bg-[var(--color-oxblood)]/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-terracotta)]"
          >
            {isPaused ? (
              <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Next meals"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-oxblood)]/20 bg-white text-[var(--color-oxblood)] transition hover:bg-[var(--color-oxblood)]/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-terracotta)]"
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <Container>
        <div className="mt-6 flex justify-center">
          <PrimaryLink href="#order-flow">Explore meals</PrimaryLink>
        </div>
      </Container>
    </section>
  );
}

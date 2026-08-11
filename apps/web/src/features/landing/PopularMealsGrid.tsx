"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { fetchCatalogMeals } from "@/features/featured-meals/api/featuredMealsClient";
import { resolveCatalogImageSource } from "@/features/meal-browser/mealPresentation";
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
 * Auto-scrolls by default. Hovering or touching a card pauses the animation;
 * it resumes when the pointer leaves. Users can also swipe or scroll-wheel
 * freely — the scrollbar is hidden but touch/gesture scrolling works.
 */
export function PopularMealsGrid(): ReactElement {
  const [meals, setMeals] = useState<readonly MarqueeMeal[]>(FALLBACK_MEALS);
  const [isPaused, setIsPaused] = useState(false);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const scrollAnimationRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number>(0);

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
            imageSrc: resolveCatalogImageSource(meal.image.src),
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
      </div>

      <Container>
        <div className="mt-6 flex justify-center">
          <PrimaryLink href="#order-flow">Explore meals</PrimaryLink>
        </div>
      </Container>
    </section>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useState, type ReactElement } from "react";
import { fetchCatalogMeals } from "@/features/featured-meals/api/featuredMealsClient";
import { POPULAR_MEALS } from "./content";
import { Container, Eyebrow, PrimaryLink } from "./primitives";

const POPULAR_MEAL_SEGMENT_COUNT = 5;

interface MarqueeMeal {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly imageSrc: string;
  readonly imageAlt: string;
}

/** Static safety net used before the live fetch resolves and if it fails. */
const FALLBACK_MEALS: readonly MarqueeMeal[] = POPULAR_MEALS.map((meal) => ({
  id: meal.id,
  name: meal.name,
  description: meal.description,
  imageSrc: meal.imageSrc,
  imageAlt: meal.imageAlt,
}));

/**
 * Marquee of the admin-curated featured meals. Fetches on the client against
 * the real catalog API so an admin's saved change shows on the next page load,
 * regardless of the local/http catalog data-source toggle.
 */
export function PopularMealsGrid(): ReactElement {
  const [meals, setMeals] = useState<readonly MarqueeMeal[]>(FALLBACK_MEALS);

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
            description: meal.description,
            imageSrc: meal.image.src,
            imageAlt: meal.image.alt,
          })),
        );
      } catch (caught) {
        if (controller.signal.aborted) return;
        // Graceful degradation: keep the static in-demand list on the page.
        console.warn("Featured meals fetch failed; using static list.", caught);
      }
    })();
    return () => controller.abort();
  }, []);

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

      <div className="overflow-hidden" data-testid="popular-meal-loop">
        <div className="popular-meals-marquee flex w-max py-1">
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
                      unoptimized
                      loading="lazy"
                      sizes="(max-width: 767px) 245px, 270px"
                      className="object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  </span>
                  <span className="mt-4 block font-display text-xl leading-tight text-[var(--color-oxblood)]">
                    {meal.name}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-sm leading-6 text-[var(--color-charcoal)]/72">
                    {meal.description}
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

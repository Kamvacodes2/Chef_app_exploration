"use client";

import Image from "next/image";
import { useEffect, useState, type FocusEvent, type ReactElement } from "react";
import { useReducedMotion } from "framer-motion";
import { HERO_STORIES } from "./content";

const STORY_INTERVAL_MS = 3500;

export function LandingHeroCarousel(): ReactElement {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const [isInteractionPaused, setIsInteractionPaused] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const activeStory = HERO_STORIES[activeIndex] ?? HERO_STORIES[0];

  useEffect(() => {
    if (isManuallyPaused || isInteractionPaused || prefersReducedMotion) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % HERO_STORIES.length);
    }, STORY_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [activeIndex, isInteractionPaused, isManuallyPaused, prefersReducedMotion]);

  const handleBlur = (event: FocusEvent<HTMLElement>): void => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsInteractionPaused(false);
    }
  };

  return (
    <section
      className="bg-[var(--color-warm-cream)] py-8 sm:py-12 lg:py-14"
      aria-labelledby="landing-hero-title"
      data-testid="landing-hero-carousel"
      onMouseEnter={() => setIsInteractionPaused(true)}
      onMouseLeave={() => setIsInteractionPaused(false)}
      onFocusCapture={() => setIsInteractionPaused(true)}
      onBlurCapture={handleBlur}
    >
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:gap-10">
          <div className="max-w-xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--color-oxblood)]/75">
              A chef on demand, at home
            </p>

            <div key={activeStory.title} className="landing-hero-story-reveal">
              <h1
                id="landing-hero-title"
                className="mt-4 font-display text-5xl leading-[0.95] text-[var(--color-oxblood)] sm:text-6xl lg:text-7xl"
              >
                {activeStory.title}
              </h1>
              <p className="mt-5 max-w-md text-base leading-7 text-[var(--color-charcoal)]/80 sm:text-lg">
                {activeStory.body}
              </p>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#order-flow"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-oxblood)] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--color-oxblood)]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-terracotta)]"
              >
                Book a chef
              </a>
              <a
                href="#how-it-works"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--color-oxblood)]/35 bg-white/55 px-6 py-3 text-sm font-bold text-[var(--color-oxblood)] transition hover:border-[var(--color-oxblood)] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-terracotta)]"
              >
                See how it works
              </a>
            </div>
          </div>

          <div data-testid="landing-hero-media">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] bg-[var(--color-soft-beige)] shadow-sm">
              {HERO_STORIES.map((story, index) => (
                <Image
                  key={story.asset.src}
                  src={story.asset.src}
                  alt={index === activeIndex ? story.asset.alt : ""}
                  aria-hidden={index !== activeIndex}
                  fill
                  priority={index === 0}
                  loading={index === 0 ? "eager" : "lazy"}
                  sizes="(max-width: 1023px) 100vw, 58vw"
                  className={`object-cover object-center transition-opacity duration-500 motion-reduce:transition-none ${
                    index === activeIndex ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))}
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/22 to-transparent"
                aria-hidden="true"
              />
            </div>

            <div className="mt-4 flex items-center justify-center gap-2" aria-label="Hero story controls">
              <div
                className="flex items-center rounded-xl bg-[var(--color-warm-cream)]/80 px-2"
                role="tablist"
                aria-label="Choose a hero story"
                data-testid="landing-hero-dots"
              >
                {HERO_STORIES.map((story, index) => (
                  <button
                    key={story.title}
                    type="button"
                    role="tab"
                    aria-selected={index === activeIndex}
                    aria-label={`Show story ${index + 1}: ${story.title}`}
                    onClick={() => setActiveIndex(index)}
                    className="group inline-flex h-11 w-8 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-terracotta)]"
                  >
                    <span
                      className={`block h-2.5 rounded-full transition-all ${
                        index === activeIndex
                          ? "w-6 bg-[var(--color-oxblood)]"
                          : "w-2.5 bg-[var(--color-oxblood)]/28 group-hover:bg-[var(--color-oxblood)]/55"
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setIsManuallyPaused((isPaused) => !isPaused)}
                className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl border border-transparent px-3 text-xs font-bold text-[var(--color-oxblood)] transition hover:bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-terracotta)]"
                aria-label={isManuallyPaused ? "Play story rotation" : "Pause story rotation"}
              >
                {isManuallyPaused ? "Play" : "Pause"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

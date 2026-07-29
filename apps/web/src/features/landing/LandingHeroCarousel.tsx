"use client";

import { useReducedMotion } from "framer-motion";
import Image from "next/image";
import type { ReactElement, ReactNode } from "react";
import { useEffect, useState } from "react";
import { HERO_STORIES } from "./content";

const HERO_ROTATION_MS = 6000;

const POSTER_STORIES: Array<{
  headline: ReactNode;
  body: string;
}> = [
  {
    headline: (
      <>
        Dinner&apos;s handled.
        <br />
        Your evening
        <br />
        is yours.
      </>
    ),
    body: "A trusted Chefmate cooks fresh meals in your kitchen and cleans up before they leave.",
  },
  {
    headline: (
      <>
        More time
        <br />
        to hear about
        <br />
        their day.
      </>
    ),
    body: HERO_STORIES[1].body,
  },
  {
    headline: (
      <>
        Come home.
        <br />
        Switch off.
        <br />
        Let someone
        <br />
        else cook.
      </>
    ),
    body: HERO_STORIES[2].body,
  },
  {
    headline: (
      <>
        Catch up
        <br />
        with each
        <br />
        other.
      </>
    ),
    body: HERO_STORIES[3].body,
  },
];

export function LandingHeroCarousel(): ReactElement {
  const prefersReducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isInteractionPaused, setIsInteractionPaused] = useState(false);
  const activePosterStory = POSTER_STORIES[activeIndex] ?? POSTER_STORIES[0]!;

  useEffect(() => {
    if (prefersReducedMotion || isInteractionPaused) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % HERO_STORIES.length);
    }, HERO_ROTATION_MS);

    return () => window.clearInterval(timer);
  }, [isInteractionPaused, prefersReducedMotion]);

  return (
    <section
      className="grid overflow-hidden bg-[var(--color-oxblood)] text-[var(--color-warm-cream)] lg:min-h-[690px] lg:grid-cols-[48fr_52fr]"
      aria-labelledby="landing-hero-title"
      data-testid="landing-hero-carousel"
      onMouseEnter={() => setIsInteractionPaused(true)}
      onMouseLeave={() => setIsInteractionPaused(false)}
      onFocusCapture={() => setIsInteractionPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsInteractionPaused(false);
        }
      }}
    >
      <div
        className="order-2 flex flex-col bg-[var(--color-oxblood)] px-6 py-8 sm:px-10 sm:py-18 lg:order-1 lg:px-12 lg:py-20"
        data-testid="landing-hero-copy"
      >
        <div className="flex h-full w-full max-w-[560px] flex-col lg:ml-auto">
          <h1
            id="landing-hero-title"
            key={`hero-heading-${activeIndex}`}
            className="font-display-wide landing-hero-story-reveal text-[clamp(3rem,13.4vw,4.15rem)] leading-[0.9] text-[var(--color-warm-cream)] text-balance sm:text-[5.8rem] lg:text-[clamp(4.3rem,5.05vw,6.2rem)]"
          >
            {activePosterStory.headline}
          </h1>

          <p
            key={`hero-copy-${activeIndex}`}
            className="landing-hero-story-reveal mt-5 max-w-[32rem] text-base leading-7 text-[var(--color-warm-cream)]/78 sm:mt-7 sm:text-lg"
          >
            {activePosterStory.body}
          </p>

          <div
            className="mt-5 flex items-center gap-2 sm:mt-7"
            role="tablist"
            aria-label="Chefmate hero stories"
            data-testid="landing-hero-dots"
          >
            {HERO_STORIES.map((story, index) => {
              const isActive = index === activeIndex;

              return (
                <button
                  aria-label={`Show story ${index + 1}: ${story.title}`}
                  aria-selected={isActive}
                  className={`h-3 rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-terracotta)] ${
                    isActive
                      ? "w-9 bg-[var(--color-warm-cream)]"
                      : "w-3 bg-[var(--color-warm-cream)]/35 hover:bg-[var(--color-warm-cream)]/60"
                  }`}
                  key={story.title}
                  onClick={() => setActiveIndex(index)}
                  role="tab"
                  type="button"
                >
                  <span className="sr-only">{story.title}</span>
                </button>
              );
            })}
          </div>

          <div
            className="mt-8 grid gap-3 sm:mt-10 sm:flex sm:flex-wrap lg:mt-auto lg:pt-10"
            data-testid="landing-hero-actions"
          >
            <a
              href="#order-flow"
              className="font-display-wide inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-warm-cream)] px-6 py-3 text-sm text-[var(--color-oxblood)] transition hover:bg-[var(--color-warm-white)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-terracotta)]"
            >
              Book a Chefmate
            </a>
            <a
              href="#how-it-works"
              className="font-display-wide inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--color-warm-cream)]/45 px-6 py-3 text-sm text-[var(--color-warm-cream)] transition hover:border-[var(--color-warm-cream)] hover:bg-[var(--color-warm-cream)]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-terracotta)]"
            >
              How it works
            </a>
          </div>
        </div>
      </div>

      <div
        className="order-1 relative aspect-[4/3] overflow-hidden bg-[var(--color-soft-beige)] sm:aspect-[5/4] lg:order-2 lg:aspect-auto lg:h-[690px]"
        data-testid="landing-hero-media"
      >
        {HERO_STORIES.map((story, index) => (
          <Image
            alt={index === activeIndex ? story.asset.alt : ""}
            aria-hidden={index === activeIndex ? undefined : true}
            className={`h-full w-full object-cover object-center transition-opacity duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
              index === activeIndex ? "opacity-100" : "opacity-0"
            }`}
            fill
            key={story.title}
            loading={index === 0 ? undefined : "eager"}
            priority={index === 0}
            sizes="(max-width: 1023px) 100vw, 52vw"
            src={story.asset.src}
          />
        ))}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-b from-transparent via-[var(--color-oxblood)]/55 to-[var(--color-oxblood)] lg:hidden"
          data-testid="landing-hero-colour-wash"
        />
      </div>
    </section>
  );
}

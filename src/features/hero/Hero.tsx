"use client";

import { useMemo } from "react";
import type { Category, Meal } from "@/data/types/Meal";
import { getPalette } from "./constants/palettes";
import { BackgroundLayer } from "./components/BackgroundLayer";
import { MealNavigation } from "./components/MealNavigation";
import { MealLoop } from "./components/MealLoop";
import { MealStage } from "./components/MealStage";
import { ParallaxWrapper } from "./components/ParallaxWrapper";
import { PrimaryCta } from "./components/PrimaryCta";
import { PARALLAX_DEPTH } from "./constants/parallax";
import { MEAL_LOOP_ITEMS } from "./constants/mealLoop";
import { useImagePreloader } from "./hooks/useImagePreloader";
import { useIsMobile, usePrefersReducedMotion } from "./hooks/useMediaQuery";
import { useMealNavigation } from "./hooks/useMealNavigation";
import { useParallax } from "./hooks/useParallax";
import { selectActiveMeal, selectMealsForActiveCategory } from "./state/selectors";
import { useHeroController } from "./state/useHeroController";

export interface HeroProps {
  readonly categories: readonly Category[];
  readonly meals: readonly Meal[];
}

export function Hero({ categories, meals }: HeroProps) {
  const { state, chooseMeal, navigate, pauseLoop, resumeLoop } = useHeroController();
  const isMobile = useIsMobile();
  const reducedMotion = usePrefersReducedMotion();
  const parallaxEnabled = !isMobile && !reducedMotion;
  const parallax = useParallax(parallaxEnabled);

  const isBrowsing = state.phase !== "WAITING";
  const palette = getPalette("blood-red");
  const categoryMeals = useMemo(
    () => selectMealsForActiveCategory(state, categories, meals),
    [state, categories, meals],
  );
  const activeMeal = selectActiveMeal(state, categories, meals);

  useMealNavigation({
    enabled: isBrowsing,
    onNavigate: (direction) => navigate(direction, categoryMeals.length),
  });

  useImagePreloader(useMemo(() => MEAL_LOOP_ITEMS.map((item) => item.imageSrc), []));

  return (
    <div className="relative w-full">
      <main
        className="relative flex min-h-dvh w-full flex-col sm:h-dvh sm:overflow-hidden"
        data-phase={state.phase}
      >
        <ParallaxWrapper
          parallax={parallax}
          depth={PARALLAX_DEPTH.background}
          className="absolute inset-0"
        >
          <BackgroundLayer palette={palette} />
        </ParallaxWrapper>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-10 sm:py-16">
          <ParallaxWrapper
            parallax={parallax}
            depth={PARALLAX_DEPTH.model}
            className="relative flex min-h-[60vh] w-full max-w-5xl items-center justify-center"
          >
            {isBrowsing && (
              <>
                <ParallaxWrapper
                  parallax={parallax}
                  depth={PARALLAX_DEPTH.meal}
                  className="relative z-10 w-full max-w-sm sm:max-w-md"
                >
                  <MealStage meal={activeMeal} />
                </ParallaxWrapper>
                <MealNavigation
                  onPrev={() => navigate(-1, categoryMeals.length)}
                  onNext={() => navigate(1, categoryMeals.length)}
                />
              </>
            )}
          </ParallaxWrapper>

          {/*
           * On desktop, `main` is height-clipped (sm:h-dvh sm:overflow-hidden)
           * to avoid an unwanted page-level scrollbar. That clipping would
           * hard-cut the bottom of this card at short/medium viewport
           * heights. Instead of living inside the clipped flex flow, the
           * card is rendered as an absolutely positioned sibling of `main`
           * (see below, outside the overflow-hidden boundary) so it can
           * bleed over the Hero/HowItWorks seam intentionally.
           */}
        </div>
      </main>

      {!isBrowsing && (
        <div
          className="pointer-events-none absolute inset-x-0 top-[18%] z-30 flex flex-col items-center gap-5 sm:top-[20%]"
          aria-hidden={false}
        >
          <div className="pointer-events-auto px-6">
            <PrimaryCta onClick={chooseMeal} />
          </div>
          {/* Full-width moving food loop, edge-to-edge (no horizontal padding), on both mobile and desktop. */}
          <div
            className="pointer-events-auto mt-5 w-full sm:mt-8"
            data-testid="hero-meal-loop-stage"
          >
            <MealLoop loopIndex={state.loopIndex} onPause={pauseLoop} onResume={resumeLoop} />
          </div>
        </div>
      )}
    </div>
  );
}

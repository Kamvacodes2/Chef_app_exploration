"use client";

import { useMemo } from "react";
import type { Category, Meal } from "@/data/types/Meal";
import { getPalette } from "./constants/palettes";
import { BackgroundLayer } from "./components/BackgroundLayer";
import { BrandMark } from "./components/BrandMark";
import { HeroHeadline } from "./components/HeroHeadline";
import { MealNavigation } from "./components/MealNavigation";
import { MealLoop } from "./components/MealLoop";
import { MealStage } from "./components/MealStage";
import { ModelLayer } from "./components/ModelLayer";
import { ParallaxWrapper } from "./components/ParallaxWrapper";
import { PrimaryCta } from "./components/PrimaryCta";
import { PARALLAX_DEPTH } from "./constants/parallax";
import { MEAL_LOOP_ITEMS } from "./constants/mealLoop";
import { useImagePreloader } from "./hooks/useImagePreloader";
import { useIsMobile, usePrefersReducedMotion } from "./hooks/useMediaQuery";
import { useMealNavigation } from "./hooks/useMealNavigation";
import { useParallax } from "./hooks/useParallax";
import {
  selectActiveMeal,
  selectActivePaletteId,
  selectFrameNumber,
  selectMealsForActiveCategory,
} from "./state/selectors";
import { useHeroController } from "./state/useHeroController";

export interface HeroProps {
  readonly categories: readonly Category[];
  readonly meals: readonly Meal[];
}

export function Hero({ categories, meals }: HeroProps) {
  const { state, chooseMeal, navigate, reset, loopPaused, pauseLoop, resumeLoop } = useHeroController();
  const isMobile = useIsMobile();
  const reducedMotion = usePrefersReducedMotion();
  const parallaxEnabled = !isMobile && !reducedMotion;
  const parallax = useParallax(parallaxEnabled);

  const isBrowsing = state.phase !== "WAITING";
  const paletteId = selectActivePaletteId(state, categories);
  const palette = getPalette(paletteId);
  const frameNumber = selectFrameNumber(state);
  const categoryMeals = useMemo(
    () => selectMealsForActiveCategory(state, categories, meals),
    [state, categories, meals],
  );
  const activeMeal = selectActiveMeal(state, categories, meals);

  useMealNavigation({
    enabled: isBrowsing,
    onNavigate: (direction) => navigate(direction, categoryMeals.length),
  });

  useImagePreloader(
    useMemo(() => [1, 2, 3].map((n) => `/images/model/frame-${n}.webp`), []),
  );

  useImagePreloader(
    useMemo(() => MEAL_LOOP_ITEMS.map((item) => item.imageSrc), []),
  );

  return (
    <div className="relative w-full">
      <main className="relative flex min-h-dvh w-full flex-col sm:h-dvh sm:overflow-hidden" data-phase={state.phase}>
        <ParallaxWrapper parallax={parallax} depth={PARALLAX_DEPTH.background} className="absolute inset-0">
          <BackgroundLayer palette={palette} />
        </ParallaxWrapper>

        <div className="absolute left-4 top-4 z-20 sm:left-6 sm:top-6">
          <BrandMark onReset={reset} textColor={palette.textColor} />
        </div>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-start gap-6 px-6 pb-8 pt-10 sm:gap-2 sm:pb-2 sm:pt-36">
          {!isBrowsing && <HeroHeadline textColor={palette.textColor} />}

          <ParallaxWrapper
            parallax={parallax}
            depth={PARALLAX_DEPTH.model}
            className="relative flex w-full flex-1 flex-col self-stretch min-h-0 translate-y-[40px] sm:mx-auto sm:block sm:w-full sm:max-w-md sm:flex-none sm:self-auto sm:translate-y-4"
          >
            <ModelLayer frameNumber={frameNumber}>
              {isBrowsing && (
                <ParallaxWrapper
                  parallax={parallax}
                  depth={PARALLAX_DEPTH.meal}
                  className="absolute left-1/2 top-[56%] z-10 w-[90%] -translate-x-1/2 sm:top-[32%] sm:w-[82%]"
                >
                  <MealStage meal={activeMeal} />
                </ParallaxWrapper>
              )}
            </ModelLayer>

            {isBrowsing && (
              <MealNavigation
                onPrev={() => navigate(-1, categoryMeals.length)}
                onNext={() => navigate(1, categoryMeals.length)}
              />
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
          className="pointer-events-none absolute inset-x-0 bottom-[5%] z-30 flex flex-col items-center gap-4 sm:bottom-auto sm:top-[424px]"
          aria-hidden={false}
        >
          <div className="pointer-events-auto px-6">
            <PrimaryCta onClick={chooseMeal} />
          </div>
          {/* Full-width moving food loop, edge-to-edge (no horizontal padding), on both mobile and desktop. */}
          <div className="pointer-events-auto w-full sm:mt-[64px]">
            <MealLoop
              loopIndex={state.loopIndex}
              paused={loopPaused}
              onPause={pauseLoop}
              onResume={resumeLoop}
            />
          </div>
        </div>
      )}
    </div>
  );
}

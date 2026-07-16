"use client";

import { AnimatePresence } from "framer-motion";
import { useMemo } from "react";
import type { ReactElement } from "react";
import { BackgroundLayer } from "@/features/hero/components/BackgroundLayer";
import { getPalette } from "@/features/hero/constants/palettes";
import { useImagePreloader } from "@/features/hero/hooks/useImagePreloader";
import { useIsMobile, usePrefersReducedMotion } from "@/features/hero/hooks/useMediaQuery";
import { ShowcaseLabel } from "./components/ShowcaseLabel";
import { ShowcasePauseToggle } from "./components/ShowcasePauseToggle";
import { ShowcaseStage } from "./components/ShowcaseStage";
import { ShowcaseStageContent } from "./components/ShowcaseStageContent";
import { SHOWCASE_SLIDES } from "./constants/slides";
import { useShowcaseController } from "./state/useShowcaseController";

/**
 * Auto-rotating menu showcase: a plate rises into frame from below (hands
 * placing it), holds, then a second pair of hands reaches in from above to
 * lift it away before the next plate enters. Mirrors Hero's section
 * structure (palette-driven BackgroundLayer, preloaded images, pause on
 * hover/focus/keyboard toggle).
 */
export function MenuShowcase(): ReactElement {
  const isMobile = useIsMobile();
  const reducedMotion = usePrefersReducedMotion();
  const { slide, phase, slideIndex, isPaused, pause, resume } = useShowcaseController(false);

  const preloadSrcs = useMemo(
    () => [
      ...SHOWCASE_SLIDES.map((s) => s.plateSrc),
      "/images/showcase/hands-below.webp",
      "/images/showcase/hands-above.webp",
    ],
    [],
  );
  useImagePreloader(preloadSrcs);

  const palette = getPalette(slide.paletteId);

  const handleToggle = (): void => {
    if (isPaused) {
      resume();
    } else {
      pause();
    }
  };

  return (
    <section
      className="relative w-full min-h-dvh overflow-hidden"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
      aria-label="Menu showcase, auto-rotating"
      data-testid="menu-showcase"
      data-slide-index={slideIndex}
      data-phase={phase}
    >
      <BackgroundLayer palette={palette} />
      <div className="relative z-10 flex h-full min-h-dvh w-full flex-col items-center justify-center gap-4 px-4 py-6 md:px-10 md:py-8">
        {isMobile ? (
          <>
            <AnimatePresence mode="wait">
              <ShowcaseLabel key={`${slide.id}-label`} slide={slide} reducedMotion={reducedMotion} />
            </AnimatePresence>
            <ShowcaseStage>
              <ShowcaseStageContent slide={slide} phase={phase} reducedMotion={reducedMotion} />
              <ShowcasePauseToggle isPaused={isPaused} onToggle={handleToggle} />
            </ShowcaseStage>
          </>
        ) : (
          <ShowcaseStage>
            <ShowcaseStageContent slide={slide} phase={phase} reducedMotion={reducedMotion} />
            <AnimatePresence mode="wait">
              <ShowcaseLabel key={`${slide.id}-label`} slide={slide} reducedMotion={reducedMotion} />
            </AnimatePresence>
            <ShowcasePauseToggle isPaused={isPaused} onToggle={handleToggle} />
          </ShowcaseStage>
        )}
      </div>
    </section>
  );
}

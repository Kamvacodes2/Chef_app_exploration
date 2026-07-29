"use client";

import { AnimatePresence } from "framer-motion";
import { useMemo } from "react";
import type { ReactElement } from "react";
import { useImagePreloader } from "@/features/hero/hooks/useImagePreloader";
import { useIsMobile, usePrefersReducedMotion } from "@/features/hero/hooks/useMediaQuery";
import { ShowcaseLabel } from "./components/ShowcaseLabel";
import { ShowcaseStage } from "./components/ShowcaseStage";
import { ShowcaseStageContent } from "./components/ShowcaseStageContent";
import { SHOWCASE_SLIDES } from "./constants/slides";
import { useShowcaseController } from "./state/useShowcaseController";

/**
 * Auto-rotating menu showcase: a plate rises into frame from below (hands
 * placing it), holds, then a second pair of hands reaches in from above to
 * lift it away before the next plate enters. Mirrors Hero's section
 * structure (palette-driven BackgroundLayer, preloaded images, pause on
 * hover or keyboard focus).
 */
export function MenuShowcase(): ReactElement {
  const isMobile = useIsMobile();
  const reducedMotion = usePrefersReducedMotion();
  const { slide, phase, slideIndex, pause, resume } = useShowcaseController(false);

  const preloadSrcs = useMemo(
    () => [
      ...SHOWCASE_SLIDES.map((s) => s.plateSrc),
      "/images/showcase/hands-below.webp",
      "/images/showcase/hands-above.webp",
    ],
    [],
  );
  useImagePreloader(preloadSrcs);

  return (
    <section
      className="relative min-h-[560px] w-full overflow-hidden md:min-h-[calc(100dvh-150px)]"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onPointerDown={pause}
      tabIndex={0}
      aria-label="Menu showcase, auto-rotating. Focus or touch to pause."
      data-testid="menu-showcase"
      data-slide-index={slideIndex}
      data-phase={phase}
    >
      <div
        className="absolute inset-0 bg-white"
        data-testid="background-layer"
        data-palette="white"
      />
      <div className="relative z-10 flex h-full min-h-[560px] w-full flex-col items-center justify-center gap-4 px-4 py-6 md:min-h-[calc(100dvh-150px)] md:px-10 md:py-8">
        {isMobile ? (
          <>
            <AnimatePresence mode="wait">
              <ShowcaseLabel
                key={`${slide.id}-label`}
                slide={slide}
                reducedMotion={reducedMotion}
              />
            </AnimatePresence>
            <ShowcaseStage>
              <ShowcaseStageContent slide={slide} phase={phase} reducedMotion={reducedMotion} />
            </ShowcaseStage>
          </>
        ) : (
          <ShowcaseStage>
            <ShowcaseStageContent slide={slide} phase={phase} reducedMotion={reducedMotion} />
            <AnimatePresence mode="wait">
              <ShowcaseLabel
                key={`${slide.id}-label`}
                slide={slide}
                reducedMotion={reducedMotion}
              />
            </AnimatePresence>
          </ShowcaseStage>
        )}
      </div>
    </section>
  );
}

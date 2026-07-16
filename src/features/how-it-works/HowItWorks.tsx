"use client";

import { useState } from "react";
import { useIsMobile } from "@/features/hero/hooks/useMediaQuery";
import { HOW_IT_WORKS_STEPS } from "./constants/steps";
import { StepImage } from "./components/StepImage";
import { StepTimeline } from "./components/StepTimeline";
import { MobileStepFeed } from "./components/MobileStepFeed";

export function HowItWorks() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeStep = HOW_IT_WORKS_STEPS[activeIndex] ?? HOW_IT_WORKS_STEPS[0]!;
  const isMobile = useIsMobile();

  return (
    <section
      className="bg-[#2A2F18] px-6 py-20 sm:py-28"
      aria-labelledby="how-it-works-heading"
      data-testid="how-it-works-section"
    >
      <div className="mx-auto max-w-6xl">
        <h2
          id="how-it-works-heading"
          className="font-sans mb-10 text-sm font-extrabold uppercase tracking-[0.2em] text-[#E1D5BF]/80"
        >
          Your Evening, Made Simple
        </h2>

        {isMobile ? (
          <MobileStepFeed steps={HOW_IT_WORKS_STEPS} />
        ) : (
          <div className="flex flex-col gap-12 sm:flex-row sm:items-start sm:gap-16">
            <div className="sm:sticky sm:top-24 sm:w-1/2 sm:self-start">
              <StepImage step={activeStep} />
            </div>
            <div className="sm:w-1/2">
              <StepTimeline
                steps={HOW_IT_WORKS_STEPS}
                activeIndex={activeIndex}
                onStepSelect={setActiveIndex}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

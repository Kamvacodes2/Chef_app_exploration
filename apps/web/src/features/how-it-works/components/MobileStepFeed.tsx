"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";
import { usePrefersReducedMotion } from "@/features/hero/hooks/useMediaQuery";
import type { HowItWorksStep } from "../constants/steps";

export interface MobileStepFeedProps {
  readonly steps: readonly HowItWorksStep[];
}

function StepThumbnail({ step }: { readonly step: HowItWorksStep }) {
  return (
    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
      <Image src={step.image} alt="" fill sizes="56px" style={{ objectFit: "cover" }} />
    </div>
  );
}

export function MobileStepFeed({ steps }: MobileStepFeedProps) {
  const containerRef = useRef<HTMLOListElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.85", "end 0.35"],
  });

  const fillScaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <ol ref={containerRef} className="relative flex flex-col pl-4" data-testid="mobile-step-feed">
      <span
        aria-hidden
        className="absolute left-1 top-2 bottom-2 w-px bg-[var(--color-oxblood)]/20"
        data-testid="mobile-timeline-track"
      />
      <motion.span
        aria-hidden
        className="absolute left-1 top-2 bottom-2 w-px origin-top bg-[var(--color-maize)]"
        data-testid="mobile-timeline-fill"
        style={{ scaleY: fillScaleY }}
        transition={prefersReducedMotion ? { duration: 0 } : undefined}
      />
      {steps.map((step, index) => (
        <li key={step.id} className="relative">
          <motion.div
            className="flex items-center gap-4 py-4"
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
            whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={prefersReducedMotion ? undefined : { once: false, amount: 0.4 }}
            transition={{ duration: 0.35 }}
          >
            <StepThumbnail step={step} />
            <div className="min-w-0 flex-1 border-l border-[var(--color-oxblood)]/20 pl-4">
              <h3 className="font-sans flex items-center gap-2 text-base font-extrabold text-[var(--color-oxblood)]">
                {step.title}
              </h3>
              <p className="mt-1 text-sm text-[var(--color-oxblood)]/70">{step.description}</p>
            </div>
          </motion.div>
          {index < steps.length - 1 && (
            <div aria-hidden className="pl-[3.5rem] text-center text-[var(--color-oxblood)]/40">
              ↓
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

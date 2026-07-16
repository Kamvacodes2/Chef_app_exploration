"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import type { HowItWorksStep } from "../constants/steps";

export interface StepImageProps {
  readonly step: HowItWorksStep;
}

export function StepImage({ step }: StepImageProps) {
  return (
    <div
      className="relative aspect-square w-full max-w-[440px] overflow-hidden rounded-2xl bg-neutral-100 sm:max-h-[440px]"
      data-testid="step-image"
    >
      <AnimatePresence mode="sync">
        <motion.div
          key={step.id}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.6, ease: [0.4, 0.0, 0.2, 1] }}
        >
          <Image
            src={step.image}
            alt={step.alt}
            fill
            sizes="(max-width: 767px) 100vw, 440px"
            style={{ objectFit: "cover" }}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

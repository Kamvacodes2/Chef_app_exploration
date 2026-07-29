"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import type { ReactNode } from "react";
import { MODEL_CROSSFADE_MS } from "../constants/transitions";

export interface ModelLayerProps {
  readonly frameNumber: number;
  readonly children?: ReactNode;
}

const FRAME_ALT: Readonly<Record<number, string>> = {
  1: "Chef waiting patiently at an empty table, hands resting on the edge, smiling",
  2: "Chef looking down at the table, curious",
  3: "Chef eating with a spoon near their mouth, pointing, delighted",
};

/**
 * Crossfades between the 3 model frames. Never applies color filters to the
 * model image itself — palette/mood theming lives in the layers behind it.
 */
export function ModelLayer({ frameNumber, children }: ModelLayerProps) {
  return (
    <div
      className="relative mx-auto aspect-[447/558] max-h-[65vh] w-full max-w-sm sm:max-h-[46vh] sm:max-w-[250px]"
      data-testid="model-layer"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={frameNumber}
          className="pointer-events-none absolute inset-0 sm:-translate-y-[18%]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: MODEL_CROSSFADE_MS / 1000 }}
        >
          <Image
            src={`/images/model/frame-${frameNumber}.webp`}
            alt={FRAME_ALT[frameNumber] ?? "Chill Chef model"}
            fill
            priority={frameNumber === 1}
            sizes="(max-width: 767px) 80vw, 40vw"
            style={{ objectFit: "contain" }}
          />
        </motion.div>
      </AnimatePresence>
      {children}
    </div>
  );
}

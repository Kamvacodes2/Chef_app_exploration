"use client";

import { motion, useTransform } from "framer-motion";
import type { ReactNode } from "react";
import type { ParallaxValues } from "../hooks/useParallax";

export interface ParallaxWrapperProps {
  readonly parallax: ParallaxValues;
  readonly depth: number;
  readonly className?: string;
  readonly children: ReactNode;
}

/** Applies a per-layer translate offset (transform-only, GPU friendly). */
export function ParallaxWrapper({ parallax, depth, className, children }: ParallaxWrapperProps) {
  const translateX = useTransform(parallax.x, (v) => v * depth);
  const translateY = useTransform(parallax.y, (v) => v * depth);

  return (
    <motion.div
      className={className}
      style={{ x: translateX, y: translateY, willChange: "transform" }}
    >
      {children}
    </motion.div>
  );
}

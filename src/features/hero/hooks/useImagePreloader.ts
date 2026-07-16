"use client";

import { useEffect } from "react";

/**
 * Preloads a list of image URLs into the browser cache via native Image
 * objects, so later crossfades/transitions don't show a blank frame.
 */
export function useImagePreloader(srcs: readonly string[]): void {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const images = srcs.map((src) => {
      const img = new window.Image();
      img.src = src;
      return img;
    });
    return () => {
      images.forEach((img) => {
        img.src = "";
      });
    };
  }, [srcs]);
}

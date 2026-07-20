import { describe, expect, it } from "vitest";
import { SHOWCASE_SLIDES, SHOWCASE_SLIDE_COUNT } from "@/features/menu-showcase/constants/slides";
import { PALETTES } from "@/features/hero/constants/palettes";

describe("SHOWCASE_SLIDES", () => {
  it("has exactly 9 entries", () => {
    expect(SHOWCASE_SLIDES).toHaveLength(9);
  });

  it("has SHOWCASE_SLIDE_COUNT equal to the array length", () => {
    expect(SHOWCASE_SLIDE_COUNT).toBe(SHOWCASE_SLIDES.length);
  });

  it("every slide's paletteId is a valid key in PALETTES", () => {
    for (const slide of SHOWCASE_SLIDES) {
      expect(Object.prototype.hasOwnProperty.call(PALETTES, slide.paletteId)).toBe(true);
    }
  });

  it("every slide's plateSrc matches the /images/showcase/plate-N.webp pattern", () => {
    for (const slide of SHOWCASE_SLIDES) {
      expect(slide.plateSrc).toMatch(/^\/images\/showcase\/plate-\d+\.webp$/);
    }
  });

  it("groups labels in the intended sequence: SUNDAY/COLORS x2, HEARTY/FLAVORS x3, SWEET/GREENS x2, HEALTHY/GO-TO x2", () => {
    const labels = SHOWCASE_SLIDES.map((slide) => `${slide.label.lineOne}/${slide.label.lineTwo}`);
    expect(labels).toEqual([
      "SUNDAY/COLORS",
      "SUNDAY/COLORS",
      "HEARTY/FLAVORS",
      "HEARTY/FLAVORS",
      "HEARTY/FLAVORS",
      "SWEET/GREENS",
      "SWEET/GREENS",
      "HEALTHY/GO-TO",
      "HEALTHY/GO-TO",
    ]);
  });

  it("has unique slide ids", () => {
    const ids = SHOWCASE_SLIDES.map((slide) => slide.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

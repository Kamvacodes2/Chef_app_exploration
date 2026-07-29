import { describe, expect, it } from "vitest";
import { PALETTES } from "@/features/hero/constants/palettes";

describe("PALETTES", () => {
  it("uses only the approved oxblood, maize, and bone colors", () => {
    const approved = new Set(["#7E2422", "#E4C66A", "#F7F0E4"]);
    Object.values(PALETTES).forEach((palette) => {
      expect(approved.has(palette.from)).toBe(true);
      expect(approved.has(palette.to)).toBe(true);
      expect(approved.has(palette.textColor)).toBe(true);
      expect(approved.has(palette.handColor)).toBe(true);
    });
  });

  it("keeps exactly the nine stable palette IDs", () => {
    expect(Object.keys(PALETTES).sort()).toEqual(
      [
        "bean",
        "blood-red",
        "espresso",
        "lemon-cream",
        "olive",
        "persimmon",
        "strawberry",
        "vanilla",
        "warm-linen",
      ].sort(),
    );
  });

  it("pairs light palettes with oxblood text and dark palettes with bone text", () => {
    Object.values(PALETTES).forEach((palette) => {
      expect(palette.textColor).toBe(palette.tone === "light" ? "#7E2422" : "#F7F0E4");
    });
  });
});

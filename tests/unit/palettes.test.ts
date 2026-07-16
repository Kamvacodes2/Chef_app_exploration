import { describe, expect, it } from "vitest";
import { PALETTES } from "@/features/hero/constants/palettes";

describe("PALETTES", () => {
  it("contains the official vanilla hex value", () => {
    expect(PALETTES.vanilla.from).toBe("#F3E3B2");
  });

  it("renders olive as a flat solid color (unified with How It Works, no gradient)", () => {
    expect(PALETTES.olive.from).toBe("#2A2F18");
    expect(PALETTES.olive.to).toBe("#2A2F18");
  });

  it("contains the official persimmon hex value", () => {
    expect(PALETTES.persimmon.from).toBe("#E88D5F");
  });

  it("contains the official espresso hex value", () => {
    expect(PALETTES.espresso.from).toBe("#3B1E03");
  });

  it("contains the official strawberry hex value", () => {
    expect(PALETTES.strawberry.from).toBe("#F2A7A0");
  });

  it("contains the official blood-red hex value", () => {
    expect(PALETTES["blood-red"].from).toBe("#74070D");
  });

  it("contains the official lemon-cream hex value", () => {
    expect(PALETTES["lemon-cream"].from).toBe("#F3DC99");
  });

  it("contains the official warm-linen hex value", () => {
    expect(PALETTES["warm-linen"].from).toBe("#E1D5BF");
  });

  it("contains the official bean hex value", () => {
    expect(PALETTES.bean.from).toBe("#310F10");
  });

  it("defines exactly the 9 required palettes", () => {
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

  describe("textColor pairing", () => {
    const lightPalettes = ["vanilla", "lemon-cream", "persimmon", "strawberry", "warm-linen"] as const;
    const darkPalettes = ["espresso", "blood-red", "bean", "olive"] as const;

    it.each(lightPalettes)("light palette %s has a dark textColor", (id) => {
      expect(PALETTES[id].textColor).toBe("#1A1208");
    });

    it.each(darkPalettes)("dark palette %s has a light/cream textColor", (id) => {
      expect(PALETTES[id].textColor).toBe("#F3E3B2");
    });

    it("every palette defines a valid hex textColor", () => {
      Object.values(PALETTES).forEach((palette) => {
        expect(palette.textColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });
});

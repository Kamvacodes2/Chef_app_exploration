import type { Palette, PaletteId } from "@/data/types/Palette";

/** The only colors in the Chill Chef visual system. Palette IDs remain stable
 * because they are persisted in meal data and drive the existing hero states. */
export const BRAND_COLORS = Object.freeze({
  oxblood: "#7E2422",
  maize: "#E4C66A",
  bone: "#F7F0E4",
} as const);

const { oxblood: OXBLOOD, maize: MAIZE, bone: BONE } = BRAND_COLORS;
const light = (id: PaletteId, from: string, to: string, mood: string): Palette =>
  Object.freeze({ id, from, to, mood, textColor: OXBLOOD, tone: "light", handColor: OXBLOOD });
const dark = (id: PaletteId, from: string, to: string, mood: string): Palette =>
  Object.freeze({ id, from, to, mood, textColor: BONE, tone: "dark", handColor: BONE });

export const PALETTES: Readonly<Record<PaletteId, Palette>> = Object.freeze({
  vanilla: light("vanilla", BONE, MAIZE, "warm sunlight"),
  olive: dark("olive", OXBLOOD, OXBLOOD, "soft daylight"),
  persimmon: light("persimmon", MAIZE, BONE, "golden hour"),
  espresso: dark("espresso", OXBLOOD, MAIZE, "cozy cafe"),
  strawberry: light("strawberry", BONE, MAIZE, "soft"),
  "blood-red": dark("blood-red", OXBLOOD, OXBLOOD, "elegant evening"),
  "lemon-cream": light("lemon-cream", MAIZE, BONE, "bright citrus morning"),
  "warm-linen": light("warm-linen", BONE, BONE, "soft neutral warmth"),
  bean: dark("bean", OXBLOOD, MAIZE, "deep midnight roast"),
});

export const DEFAULT_PALETTE_ID: PaletteId = "vanilla";
export const WAITING_PALETTE_ID: PaletteId = "olive";
export function getPalette(id: PaletteId): Palette {
  return PALETTES[id];
}

import type { Palette, PaletteId } from "@/data/types/Palette";

/**
 * Official brand hex values confirmed by the client (brand PDF), July 2026
 * color pass. Each palette uses the official color as the DOMINANT gradient
 * stop, paired with a complementary lighter/darker shade of the same hue for
 * a subtle two-stop gradient.
 *
 * `textColor` is the on-background text color for copy that sits directly on
 * the palette gradient (e.g. hero headline) — NOT for text inside the fixed
 * white/cream info card, which always stays dark regardless of palette.
 * Light palettes get a dark neutral; dark palettes get a light/cream tone.
 */
const DARK_TEXT = "#1A1208";
const LIGHT_TEXT = "#F3E3B2"; // Vanilla, used as the light/cream text tone

export const PALETTES: Readonly<Record<PaletteId, Palette>> = Object.freeze({
  vanilla: Object.freeze({
    id: "vanilla",
    from: "#F3E3B2", // Vanilla (official)
    to: "#FAF3DC",
    mood: "warm sunlight",
    textColor: DARK_TEXT,
  }),
  olive: Object.freeze({
    id: "olive",
    // Flat solid color (from === to) — intentionally NOT a gradient.
    // Matches How It Works section background exactly (#2A2F18) to avoid
    // any visible seam/banding between the two sections during WAITING.
    from: "#2A2F18",
    to: "#2A2F18",
    mood: "soft daylight",
    textColor: LIGHT_TEXT,
  }),
  persimmon: Object.freeze({
    id: "persimmon",
    from: "#E88D5F", // Persimmon (official)
    to: "#CC7248",
    mood: "golden hour",
    textColor: DARK_TEXT,
  }),
  espresso: Object.freeze({
    id: "espresso",
    from: "#3B1E03", // Espresso Earth (official)
    to: "#241200",
    mood: "cozy cafe",
    textColor: LIGHT_TEXT,
  }),
  strawberry: Object.freeze({
    id: "strawberry",
    from: "#F2A7A0", // Strawberry Cream (official)
    to: "#E88F87",
    mood: "soft",
    textColor: DARK_TEXT,
  }),
  "blood-red": Object.freeze({
    id: "blood-red",
    from: "#74070D", // Blood Red (official)
    to: "#4D0509",
    mood: "elegant evening",
    textColor: LIGHT_TEXT,
  }),
  "lemon-cream": Object.freeze({
    id: "lemon-cream",
    from: "#F3DC99", // Lemon Cream (official)
    to: "#E9CB7C",
    mood: "bright citrus morning",
    textColor: DARK_TEXT,
  }),
  "warm-linen": Object.freeze({
    id: "warm-linen",
    from: "#E1D5BF", // Warm Linen (official)
    to: "#CBB999",
    mood: "soft neutral warmth",
    textColor: DARK_TEXT,
  }),
  bean: Object.freeze({
    id: "bean",
    from: "#310F10", // Bean (official)
    to: "#1E0909",
    mood: "deep midnight roast",
    textColor: LIGHT_TEXT,
  }),
});

export const DEFAULT_PALETTE_ID: PaletteId = "vanilla";

/**
 * Palette shown during the initial WAITING phase (before any meal category
 * is selected). Deepened olive-green matches the client's brand reference
 * (dark background + cream headline), distinct from `DEFAULT_PALETTE_ID`
 * which remains the out-of-range fallback for BROWSING/DELIGHTED.
 */
export const WAITING_PALETTE_ID: PaletteId = "olive";

export function getPalette(id: PaletteId): Palette {
  return PALETTES[id];
}

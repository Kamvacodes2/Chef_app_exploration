import { z } from "zod";

export const paletteIdSchema = z.enum([
  "vanilla",
  "olive",
  "persimmon",
  "espresso",
  "strawberry",
  "blood-red",
  "lemon-cream",
  "warm-linen",
  "bean",
]);

export const paletteSchema = z.object({
  id: paletteIdSchema,
  from: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  to: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  mood: z.string().min(1),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export type PaletteSchema = z.infer<typeof paletteSchema>;

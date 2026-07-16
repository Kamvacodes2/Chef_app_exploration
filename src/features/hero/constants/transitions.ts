/** Central timing constants for the hero state machine and animations. */
export const CTA_TRANSITION_MS = 700;
export const DWELL_TO_DELIGHT_MS = 2500;
export const MEAL_TRANSITION_MS = 500;
export const MODEL_CROSSFADE_MS = 600;
export const LOOP_ADVANCE_INTERVAL_MS = 3000;
export const LOOP_TRACK_TRANSITION_MS = 600;

export const SPRING_TRANSITION = Object.freeze({
  type: "spring" as const,
  stiffness: 120,
  damping: 18,
  duration: CTA_TRANSITION_MS / 1000,
});

export const MEAL_CARD_VARIANTS = Object.freeze({
  enter: { opacity: 0, y: -40, scale: 1.0 },
  center: { opacity: 1, y: 0, scale: 1.0 },
  exit: { opacity: 0, y: 40, scale: 0.95 },
});

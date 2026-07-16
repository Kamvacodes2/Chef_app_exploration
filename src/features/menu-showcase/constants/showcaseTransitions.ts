/** Central timing constants for the menu showcase animation cycle. */
export const PLATE_ENTER_MS = 800;
export const HOLD_MS = 3000;
export const PLATE_EXIT_MS = 800;

/**
 * EXITING is split into two back-to-back, non-overlapping sub-steps:
 *  1. HANDS_ABOVE_ARRIVE_MS: the above-hands descend from off-screen top to
 *     the "grab" position while the plate stays at rest (does not move yet).
 *  2. PLATE_PULL_AWAY_MS: ONLY once step 1 finishes, the plate and the
 *     above-hands move up together, off-screen — the actual "exit" of the
 *     old slide. This reuses the previous PLATE_EXIT_MS duration/semantics
 *     for the plate's own upward motion.
 * The controller's total EXITING duration is the sum of these two.
 */
export const HANDS_ABOVE_ARRIVE_MS = 600;
export const PLATE_PULL_AWAY_MS = PLATE_EXIT_MS;

/**
 * Below-hands "let go" timing during HOLDING, measured from the start of
 * HOLDING: at HANDS_RECEDE_DELAY_MS, the hands recede fully back down to
 * their original off-screen entry point (the plate stays resting,
 * untouched) and then stay there — they do NOT rise back up to meet the
 * plate again before EXITING. Only the above-hands are involved in taking
 * the plate away; the below-hands next rise only as part of the NEXT
 * slide's own ENTERING. Must fit inside HOLD_MS.
 */
export const HANDS_RECEDE_DELAY_MS = 1000;

/**
 * Fixed plate size as a percent of the stage height — never scales
 * dynamically. Constrained to stay <= PLATE_BOTTOM_PCT so the plate's top
 * edge never rises above the stage (top = PLATE_BOTTOM_PCT - PLATE_HEIGHT_PCT
 * must stay >= 0).
 *
 * The plate source images (public/images/showcase/plate-1..9.webp) are
 * pre-trimmed (tight-cropped, no transparent padding — see the trim step in
 * scripts/convert-assets.mjs) specifically so this percentage maps directly
 * to the VISIBLE plate size, not a padded bounding box. Do not swap in the
 * untrimmed /images/loop/meal-N.webp assets here without re-deriving these
 * constants — those have ~20-40% internal transparent padding that silently
 * shrinks/mispositions the visible circle relative to this math.
 */
export const PLATE_HEIGHT_PCT = 68;

/** Horizontal offset of the plate's center within the stage, as a percent of stage width. */
export const PLATE_LEFT_PCT = 70;

/**
 * Vertical position of the plate's BOTTOM edge, as a percent of stage height
 * from the top. The below-hands art (/public/images/showcase/hands-below.webp)
 * has its topmost fingertip pixels at ~54.4% of its 1280x720 canvas height,
 * but the plate should rest down in the palm/cradle formed by the curled
 * fingers — well below the fingertip tips themselves — with only the
 * fingertips peeking above the plate's lower edge (matching the reference
 * composition in Assets/Slide_prototype/7.png, where the plate sits low and
 * large, with finger tips visible overlapping its bottom-left/right rim).
 * 80% places the plate's bottom in that cradle zone while leaving room
 * (100% - 80% = 20% of stage height) for the visible wrist below it, and
 * keeping the box's top (80 - 68 = 12%) safely on-canvas.
 */
export const PLATE_BOTTOM_PCT = 80;

const EASE_STANDARD = [0.4, 0.0, 0.2, 1] as const;

export const PLATE_BELOW_VARIANTS = Object.freeze({
  enter: { y: "115%", opacity: 0 },
  rest: { y: "0%", opacity: 1, transition: { duration: PLATE_ENTER_MS / 1000, ease: EASE_STANDARD } },
  exit: { y: "-120%", opacity: 0, transition: { duration: PLATE_EXIT_MS / 1000, ease: EASE_STANDARD } },
});

export const HANDS_BELOW_VARIANTS = Object.freeze({
  enter: { y: "115%", opacity: 0 },
  rest: { y: "0%", opacity: 1, transition: { duration: PLATE_ENTER_MS / 1000, ease: EASE_STANDARD } },
  // Hands "let go" and sink back down to the same off-screen point they
  // entered from, fading out — and simply STAY there (they never rise back
  // up to meet the plate again). The below-hands NEVER travel upward with
  // the plate/above-hands during EXITING either — only the plate and
  // above-hands do that. So the same off-screen "exit" target covers both
  // "let go mid-hold" and "sink away during EXITING": the same pair of
  // hands appears to loop in place at the bottom of the frame across every
  // slide, rather than floating away with each plate or bobbing back up.
  exit: { y: "115%", opacity: 0, transition: { duration: PLATE_EXIT_MS / 1000, ease: EASE_STANDARD } },
});

export const HANDS_ABOVE_VARIANTS = Object.freeze({
  enter: { y: "-115%" },
  // Step 1 (EXITING_HANDS_ARRIVING): descend to the grab position; the
  // plate stays put throughout this transition.
  grab: { y: "0%", transition: { duration: HANDS_ABOVE_ARRIVE_MS / 1000, ease: EASE_STANDARD } },
  // Step 2 (EXITING_PULLING_AWAY): continue up and off-screen together with
  // the plate's own "exit" motion below.
  pullAway: { y: "-115%", transition: { duration: PLATE_PULL_AWAY_MS / 1000, ease: EASE_STANDARD } },
});

export const LABEL_VARIANTS = Object.freeze({
  enter: { opacity: 0, x: -24 },
  rest: { opacity: 1, x: 0, transition: { duration: PLATE_ENTER_MS / 1000, ease: EASE_STANDARD } },
  exit: { opacity: 0, x: -24, transition: { duration: PLATE_EXIT_MS / 1000, ease: EASE_STANDARD } },
});

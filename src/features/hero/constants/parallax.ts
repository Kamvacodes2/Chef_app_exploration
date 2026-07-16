/** Per-layer parallax translation depth in pixels (desktop only). */
export const PARALLAX_DEPTH = Object.freeze({
  background: 2,
  ambient: 5,
  model: 8,
  meal: 12,
});

export const PARALLAX_SPRING = Object.freeze({
  stiffness: 100,
  damping: 20,
  mass: 0.5,
});

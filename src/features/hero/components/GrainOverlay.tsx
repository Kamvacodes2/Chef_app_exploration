export function GrainOverlay() {
  return (
    <svg
      className="grain-overlay pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <filter id="hero-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#hero-grain)" />
    </svg>
  );
}

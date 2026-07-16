import type { Palette } from "@/data/types/Palette";

export interface AmbientGlowLayerProps {
  readonly palette: Palette;
}

export function AmbientGlowLayer({ palette }: AmbientGlowLayerProps) {
  return (
    <div
      className="ambient-glow pointer-events-none absolute inset-0"
      data-testid="ambient-glow-layer"
      style={{
        background: `radial-gradient(circle at 50% 40%, ${palette.to}aa, transparent 65%)`,
      }}
    />
  );
}

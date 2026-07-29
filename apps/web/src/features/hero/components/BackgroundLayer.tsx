import type { CSSProperties } from "react";
import type { Palette } from "@/data/types/Palette";

export interface BackgroundLayerProps {
  readonly palette: Palette;
}

export function BackgroundLayer({ palette }: BackgroundLayerProps) {
  const style = {
    "--palette-from": palette.from,
    "--palette-to": palette.to,
  } as CSSProperties;

  return (
    <div
      className="bg-gradient-hero absolute inset-0"
      style={style}
      data-testid="background-layer"
      data-palette={palette.id}
    />
  );
}

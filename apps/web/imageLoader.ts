import manifest from "./image-manifest.json";

export interface ImageManifestEntry {
  readonly hash: string;
  readonly widths: Record<number, boolean>;
}
export type ImageManifest = Record<string, ImageManifestEntry>;

const DEFAULT_MANIFEST: ImageManifest = manifest;

interface ImageLoaderProps {
  src: string;
  width: number;
  quality?: number;
}

const SORTED_WIDTHS = Object.freeze([256, 384, 640, 1080] as const);

export function resolveImageUrl(
  src: string,
  width: number,
  manifest: ImageManifest = DEFAULT_MANIFEST,
): string {
  const entry = manifest[src];
  if (!entry) return src;

  const availableWidths = SORTED_WIDTHS.filter((w) => entry.widths[w]);
  if (availableWidths.length === 0) return src;

  const match =
    availableWidths.find((w) => w >= width) ?? availableWidths[availableWidths.length - 1];

  const base = src.replace(/\.\w+$/, "");
  return `${base}.${entry.hash}.${match}w.webp`;
}

export default function imageLoader({ src, width }: ImageLoaderProps): string {
  return resolveImageUrl(src, width);
}

import { describe, expect, it } from "vitest";
import { resolveImageUrl, type ImageManifest } from "../../imageLoader";

const TEST_MANIFEST: ImageManifest = {
  "/images/meals/chicken/peri-peri-chicken.webp": {
    hash: "a1b2c3d4",
    widths: { 256: true, 384: true, 640: true, 1080: true },
  },
  "/images/model/frame-1.webp": {
    hash: "e5f6g7h8",
    widths: { 256: true, 384: true, 640: true },
  },
};

describe("image loader", () => {
  it("returns static URLs with content hash instead of /_next/image query strings", () => {
    const url = resolveImageUrl("/images/meals/chicken/peri-peri-chicken.webp", 384, TEST_MANIFEST);

    expect(url).not.toContain("/_next/image");
    expect(url).toContain("a1b2c3d4");
    expect(url).toContain(".384w.");
    expect(url).toMatch(/\.webp$/);
    expect(url.startsWith("/images/")).toBe(true);
    expect(url.startsWith("http")).toBe(false);
  });

  it("rounds up to the next available variant width", () => {
    const url = resolveImageUrl("/images/meals/chicken/peri-peri-chicken.webp", 300, TEST_MANIFEST);
    expect(url).toContain(".384w.");
  });

  it("falls back to the largest variant when requesting beyond available widths", () => {
    const url = resolveImageUrl("/images/model/frame-1.webp", 4000, TEST_MANIFEST);
    expect(url).toContain(".640w.");
  });

  it("falls back to the original src when the image is not in the manifest", () => {
    const url = resolveImageUrl("/images/unknown-photo.jpg", 384, TEST_MANIFEST);
    expect(url).toBe("/images/unknown-photo.jpg");
  });

  it("generates the correct filename format for a meal image", () => {
    const url = resolveImageUrl("/images/meals/chicken/peri-peri-chicken.webp", 256, TEST_MANIFEST);
    expect(url).toBe("/images/meals/chicken/peri-peri-chicken.a1b2c3d4.256w.webp");
  });
});

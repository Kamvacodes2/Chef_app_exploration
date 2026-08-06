import { describe, expect, it } from "vitest";
import { HERO_STORIES, HOW_IT_WORKS, LANDING_ASSETS } from "@/features/landing/content";

function assetSourceToString(source: unknown): string {
  if (typeof source === "string") {
    return source;
  }

  if (typeof source === "object" && source !== null && "src" in source) {
    const { src } = source as { src?: unknown };
    return typeof src === "string" ? src : "";
  }

  return "";
}
describe("landing content", () => {
  it("uses the requested new How It Works images for the first and last steps", () => {
    expect(HOW_IT_WORKS[0]?.image).toBe("/images/chefmate/how-it-works/book-a-time.jpg");
    expect(HOW_IT_WORKS[1]?.image).toBe("/images/chefmate/how-it-works/shopping.jpg");
    expect(HOW_IT_WORKS.at(-1)?.image).toBe(
      "/images/chefmate/how-it-works/family-relax-while-chef-cleans.jpg",
    );
  });

  it("uses the tinified JPG hero story images", () => {
    const heroSources = HERO_STORIES.map((story) => assetSourceToString(story.asset.src));

    expect(heroSources[0]).toContain("hero_mom_child_daddy.jpg");
    expect(heroSources[1]).toContain("hero_mom_and_child.jpg");
    expect(heroSources[2]).toContain("come_home_switchoff.jpg");
    expect(heroSources[3]).toContain("hero_couple.jpg");
  });

  it("uses the sharper chef cooking image in the kitchen trust card", () => {
    expect(LANDING_ASSETS.chefCooking.src).toBe("/images/chefmate/trust-chef-sprinkling-salt.png");
  });
});

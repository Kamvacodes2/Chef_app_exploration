import { describe, expect, it } from "vitest";
import { HOW_IT_WORKS, LANDING_ASSETS } from "@/features/landing/content";

describe("landing content", () => {
  it("uses the requested new How It Works images for the first and last steps", () => {
    expect(HOW_IT_WORKS[0]?.image).toBe("/images/chefmate/how-it-works/book-a-time.jpg");
    expect(HOW_IT_WORKS[1]?.image).toBe("/images/chefmate/how-it-works/shopping.jpg");
    expect(HOW_IT_WORKS.at(-1)?.image).toBe(
      "/images/chefmate/how-it-works/family-relax-while-chef-cleans.jpg",
    );
  });

  it("uses the sharper chef cooking image in the kitchen trust card", () => {
    expect(LANDING_ASSETS.chefCooking.src).toBe("/images/chefmate/trust-chef-sprinkling-salt.png");
  });
});

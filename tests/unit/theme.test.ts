import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(path, "utf8");

describe("site theme", () => {
  it("centralizes the approved brand colors as global CSS tokens", () => {
    const css = source("src/app/globals.css").toLowerCase();
    expect(css).toContain("--color-oxblood: #7e2422");
    expect(css).toContain("--color-maize: #e4c66a");
    expect(css).toContain("--color-bone: #f7f0e4");
  });

  it("removes legacy theme hex colors from owned visible UI", () => {
    const paths = [
      "src/components/SiteHeader.tsx",
      "src/features/hero/components/BrandMark.tsx",
      "src/features/hero/components/PrimaryCta.tsx",
      "src/features/how-it-works/HowItWorks.tsx",
      "src/features/how-it-works/components/MobileStepFeed.tsx",
      "src/features/how-it-works/components/StepTimeline.tsx",
      "src/features/order-flow/OrderFlow.tsx",
      "src/features/order-flow/components/AddressForm.tsx",
      "src/features/order-flow/components/Confirmation.tsx",
      "src/features/order-flow/components/DishCard.tsx",
      "src/features/order-flow/components/GoalSelect.tsx",
      "src/features/order-flow/components/MealSelect.tsx",
      "src/features/order-flow/components/ReviewStep.tsx",
      "src/features/order-flow/components/ScheduleSelect.tsx",
      "src/features/order-flow/components/SidesSelect.tsx",
    ];
    const legacyHex = /#(?:F3E3B2|1A1208|2A2F18|E1D5BF|E88D5F|74070D)/i;
    paths.forEach((path) => expect(source(path), path).not.toMatch(legacyHex));
  });
});

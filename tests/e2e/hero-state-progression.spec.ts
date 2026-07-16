import { expect, test } from "@playwright/test";

test("progresses WAITING -> BROWSING -> DELIGHTED", async ({ page }) => {
  await page.goto("/");

  const main = page.locator("main");
  await expect(main).toHaveAttribute("data-phase", "WAITING");

  await page.getByText("Choose Your Meal").click();
  await expect(main).toHaveAttribute("data-phase", "BROWSING");

  await page.waitForTimeout(3000);
  await expect(main).toHaveAttribute("data-phase", "DELIGHTED");
});

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const;

for (const viewport of VIEWPORTS) {
  test(`CTA is not obscured by overlapping layers and is clickable (${viewport.name})`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.goto("/");

    const main = page.locator("main");
    const cta = page.getByText("Choose Your Meal");
    await expect(cta).toBeVisible();

    const box = await cta.boundingBox();
    if (!box) {
      throw new Error("CTA bounding box not found");
    }
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    // Real hit-test: what element is actually stacked on top at the CTA's
    // rendered center point? A decorative overlapping layer (e.g. the
    // model image) intercepting pointer events here is exactly the
    // regression class this guards against; `pointer-events: none` on
    // decorative layers is required for this to resolve to the button.
    const hitTestPassed = await page.evaluate(
      ({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        const button = el?.closest("button, a, [role='button']");
        return (
          button?.textContent?.includes("Choose Your Meal") ?? false
        );
      },
      { x: centerX, y: centerY },
    );
    expect(hitTestPassed).toBe(true);

    await expect(main).toHaveAttribute("data-phase", "WAITING");
    await cta.click();
    await expect(main).toHaveAttribute("data-phase", "BROWSING");
  });
}

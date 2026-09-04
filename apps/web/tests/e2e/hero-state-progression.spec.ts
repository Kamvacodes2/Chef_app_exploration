import { expect, test } from "@playwright/test";

test("landing page uses the requested section order and live CTA destinations", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /It's handled\.\s+Your evening\s+is yours\./ }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your evening, made simple." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Real meals, cooked at home." })).toBeVisible();
  await expect(page.getByTestId("order-flow")).toBeAttached();
  await expect(
    page.getByRole("heading", { name: "Give yourself the evening back." }),
  ).toBeVisible();

  await expect(
    page.getByTestId("landing-hero-carousel").getByRole("link", { name: "How it works" }),
  ).toHaveAttribute("href", "#how-it-works");
  await expect(page.getByRole("link", { name: "Explore meals" })).toHaveAttribute(
    "href",
    "#order-flow",
  );

  await expect(page.getByRole("button", { name: "Previous story" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Next story" })).toHaveCount(0);
  await expect(page.getByText("1 / 4")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /story rotation/i })).toHaveCount(0);
  await expect(page.getByTestId("landing-hero-dots").getByRole("tab")).toHaveCount(4);
  await page.getByRole("tab", { name: /Show story 2:/ }).click();
  await expect(
    page.getByRole("heading", { name: /More time\s+to hear about\s+their day\./ }),
  ).toBeVisible();
  await expect(page.getByTestId("landing-hero-media")).toBeVisible();
});

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
] as const;

for (const viewport of VIEWPORTS) {
  test(`landing page has no horizontal overflow and keeps CTAs clickable (${viewport.name})`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.goto("/");

    const cta = page.getByRole("link", { name: "Book a Chefmate" }).first();
    await expect(cta).toBeVisible();
    await cta.scrollIntoViewIfNeeded();

    const box = await cta.boundingBox();
    if (!box) {
      throw new Error("CTA bounding box not found");
    }
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    const hitTestPassed = await page.evaluate(
      ({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        const button = el?.closest("button, a, [role='button']");
        return button?.textContent?.includes("Book a Chefmate") ?? false;
      },
      { x: centerX, y: centerY },
    );
    expect(hitTestPassed).toBe(true);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

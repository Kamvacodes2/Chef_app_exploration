import { expect, test } from "@playwright/test";

test("Popular meals loops horizontally and leads into the order flow", async ({ page }) => {
  await page.goto("/");

  const popular = page.getByTestId("popular-meals");
  const orderFlow = page.getByTestId("order-flow");

  await expect(popular).toBeVisible();
  await expect(page.getByRole("heading", { name: "Real meals, cooked at home." })).toBeVisible();
  await expect(popular.getByTestId("popular-meal-loop")).toBeVisible();
  await expect(popular.getByTestId("popular-meal-card")).toHaveCount(4);
  await expect(popular.getByRole("link", { name: "Explore meals" })).toHaveAttribute(
    "href",
    "#order-flow",
  );

  expect(
    await popular.evaluate((element) =>
      Boolean(
        element.compareDocumentPosition(document.querySelector('[data-testid="order-flow"]')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ),
  ).toBe(true);
  await expect(orderFlow).toBeAttached();
});

test("Popular meal rail stays filled at its wide-screen wrap point", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 900 });
  await page.goto("/");

  const coverage = await page.getByTestId("popular-meal-loop").evaluate((loop) => {
    const rail = loop.firstElementChild as HTMLElement;
    rail.style.animation = "none";
    rail.style.transform = "translate3d(-20%, 0, 0)";

    const rect = rail.getBoundingClientRect();
    return { left: rect.left, right: rect.right, viewportWidth: window.innerWidth };
  });

  expect(coverage.left).toBeLessThanOrEqual(0);
  expect(coverage.right).toBeGreaterThanOrEqual(coverage.viewportWidth);
});

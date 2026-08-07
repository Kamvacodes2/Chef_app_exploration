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

test("Popular meal rail stays filled at its wide-screen wrap point", async ({ page }, testInfo) => {
  // Desktop-only: skip if mobile project or viewport under 1920px.
  test.skip(!!testInfo.project.use.isMobile, "desktop-only test");
  const innerWidth = await page.evaluate(() => window.innerWidth);
  test.skip(innerWidth < 1920, `viewport ${innerWidth}px < 1920px; desktop-only test`);

  await page.setViewportSize({ width: 1920, height: 900 });
  await page.goto("/");

  const coverage = await page.getByTestId("popular-meal-loop").evaluate((loop) => {
    // The loop is the scrolling container itself (no nested rail): 5 duplicated
    // segments animate via scrollLeft and snap back after one full segment.
    const segment = loop.firstElementChild;
    return {
      clientWidth: loop.clientWidth,
      scrollWidth: loop.scrollWidth,
      segmentWidth: segment ? segment.getBoundingClientRect().width : 0,
    };
  });

  // Wrap-point invariant: at the snap moment the rightmost visible content sits
  // one segment in from the start, so the content must extend at least a full
  // segment past the container width — otherwise the wrap exposes a gap.
  expect(coverage.scrollWidth).toBeGreaterThanOrEqual(coverage.clientWidth + coverage.segmentWidth);
});

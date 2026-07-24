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

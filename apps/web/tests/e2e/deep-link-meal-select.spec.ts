import { expect, test } from "@playwright/test";

test("a popular meal opens its detail drawer and continues into the session flow", async ({
  page,
}) => {
  await page.goto("/");

  const popular = page.getByTestId("popular-meals");
  const popularMeal = popular.getByTestId("popular-meal-card").first();
  await expect(popularMeal).toBeVisible();
  await expect(popularMeal).toHaveAttribute("href", /#order-flow\?meal=.+&details=1/);

  await popularMeal.click();

  const orderFlow = page.getByTestId("order-flow");
  await expect(orderFlow).toHaveAttribute("data-step", "meal");
  const drawer = page.getByTestId("meal-detail-drawer");
  await expect(drawer).toBeVisible();

  const selectedMeal = await drawer.locator("h2").textContent();
  expect(selectedMeal?.trim()).toBeTruthy();
  await expect(
    orderFlow.getByText(`Selected: ${selectedMeal?.trim()}`, { exact: true }),
  ).toBeVisible();

  await drawer.getByRole("button", { name: "Continue to session" }).click();
  await expect(orderFlow).toHaveAttribute("data-step", "second-meal");
  await expect(page.getByTestId("meal-detail-drawer")).not.toBeVisible();
});

test("an invalid deep link meal slug does not select anything", async ({ page }) => {
  await page.goto("/#order-flow?meal=winter-oxtail-stew");

  await expect(page.getByRole("heading", { name: "Find what you want to eat." })).toBeVisible();

  await expect(page.getByTestId("order-flow")).toHaveAttribute("data-step", "meal");

  await expect(page.getByText(/^Selected: /)).not.toBeVisible();
});

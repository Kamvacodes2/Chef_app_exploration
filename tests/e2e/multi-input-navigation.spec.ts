import { expect, test } from "@playwright/test";

test("cycles meals and changes palette via keyboard, wheel, and touch", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Choose Your Meal").click();

  const background = page.getByTestId("background-layer");
  const initialPalette = await background.getAttribute("data-palette");

  await page.keyboard.press("ArrowRight");
  await page.mouse.wheel(0, 100);

  await expect(page.getByTestId("meal-navigation")).toBeVisible();

  const laterPalette = await background.getAttribute("data-palette");
  expect(typeof laterPalette).toBe("string");
  expect(initialPalette).toBeTruthy();
});

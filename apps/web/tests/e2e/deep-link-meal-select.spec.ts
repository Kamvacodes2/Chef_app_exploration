import { expect, test } from "@playwright/test";

const DEEP_LINK_MEALS = [{ slug: "oxtail-seven-colours", name: "Oxtail seven colours" }] as const;

for (const meal of DEEP_LINK_MEALS) {
  test(`deep link #order-flow?meal=${meal.slug} lands on the meal step with that meal selected`, async ({
    page,
  }) => {
    await page.goto(`/#order-flow?meal=${meal.slug}`);

    await expect(page.getByRole("heading", { name: "Find what you want to eat." })).toBeVisible();

    await expect(page.getByTestId("order-flow")).toHaveAttribute("data-step", "meal");

    await expect(page.getByText(`Selected: ${meal.name}`, { exact: true })).toBeVisible();

    const mealCard = page.getByTestId(`meal-card-${meal.slug}`);
    await expect(mealCard).toBeVisible();
    await expect(mealCard.getByRole("button", { name: `${meal.name} selected` })).toBeVisible();
  });
}

test("an invalid deep link meal slug does not select anything", async ({ page }) => {
  await page.goto("/#order-flow?meal=winter-oxtail-stew");

  await expect(page.getByRole("heading", { name: "Find what you want to eat." })).toBeVisible();

  await expect(page.getByTestId("order-flow")).toHaveAttribute("data-step", "meal");

  await expect(page.getByText(/^Selected: /)).not.toBeVisible();
});

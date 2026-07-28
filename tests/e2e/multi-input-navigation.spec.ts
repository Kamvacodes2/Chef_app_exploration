import { expect, test } from "@playwright/test";

test("order flow supports focused meal search and custom request interactions", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Book a chef" }).first().click();
  await expect(page.getByTestId("order-flow")).toBeVisible();

  await expect(page.getByRole("heading", { name: "Find what you want to eat." })).toBeVisible();
  await expect(page.getByTestId("order-flow")).toHaveAttribute("data-step", "meal");
  await expect
    .poll(async () =>
      page
        .locator("#order-flow")
        .evaluate((element) => Math.abs(Math.round(element.getBoundingClientRect().top))),
    )
    .toBeLessThanOrEqual(2);
  await page.getByLabel("Search meals or ingredients").fill("TikTok");
  await expect(page.getByText("0 meals found")).toBeVisible();

  await page.getByRole("button", { name: /Can't find what you want/ }).click();
  await page
    .getByLabel("Tell the kitchen what you're craving")
    .fill("A TikTok pasta bake with extra vegetables");
  await page.getByRole("button", { name: "Request this" }).click();

  await expect(page.getByRole("heading", { name: "Add some sides?" })).toBeVisible();
});

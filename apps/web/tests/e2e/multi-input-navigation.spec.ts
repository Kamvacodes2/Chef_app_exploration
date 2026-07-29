import { expect, test } from "@playwright/test";

const ORDER_FLOW_TOP_ALIGNMENT_TOLERANCE_PX = 32;

test("order flow supports focused meal search and custom request interactions", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Book a chef" }).first().click();
  await expect(page.getByTestId("order-flow")).toBeVisible();

  await expect(page.getByRole("heading", { name: "What are you feeding?" })).toBeVisible();
  await expect(page.getByTestId("order-flow")).toHaveAttribute("data-step", "goal");
  await page.getByTestId("goal-tile-track").getByRole("button").first().click();

  await expect(page.getByRole("heading", { name: "Find what you want to eat." })).toBeVisible();
  await expect(page.getByTestId("order-flow")).toHaveAttribute("data-step", "meal");
  const orderFlow = page.locator("#order-flow");
  await expect
    .poll(
      async () =>
        orderFlow.evaluate((element) => Math.abs(Math.round(element.getBoundingClientRect().top))),
      { timeout: 5_000, interval: 100 },
    )
    .toBeLessThanOrEqual(ORDER_FLOW_TOP_ALIGNMENT_TOLERANCE_PX);
  await page.getByLabel("Search meals or ingredients").fill("TikTok");
  await expect(page.getByText("0 meals found")).toBeVisible();

  await page.getByRole("button", { name: /Can't find what you want/ }).click();
  await page
    .getByLabel("Tell the kitchen what you're craving")
    .fill("A TikTok pasta bake with extra vegetables");
  await page.getByRole("button", { name: "Request this" }).click();

  await expect(page.getByRole("heading", { name: "Add some sides?" })).toBeVisible();
});

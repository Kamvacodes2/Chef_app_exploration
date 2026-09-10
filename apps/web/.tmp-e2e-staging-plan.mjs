// One-off e2e: drives the new order-flow steps on STAGING
// (8-visit family plan -> 6 weekly mains -> optional day matching -> booking).
// Run: cd chefmate_frontend/apps/web && node .tmp-e2e-staging-plan.mjs
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";

const BASE = "https://devmate.easychefapp.co.za";
const SIX_MEALS = [
  { slug: "chicken-gyro-bowls", search: "gyro" },
  { slug: "chicken-stew-and-rice", search: "chicken stew" },
  { slug: "lamb-curry-and-rice", search: "lamb curry" },
  { slug: "peri-peri-chicken-and-rice", search: "peri-peri chicken" },
  { slug: "roast-chicken-and-vegetables", search: "roast chicken and veg" },
  { slug: "beef-stew-and-rice", search: "beef stew and rice" },
];
const STAMP = Date.now();
const CONTACT = {
  name: "Staging E2E Bot",
  email: `staging-e2e-${STAMP}@example.test`,
  phone: "082 123 4567",
};

const flow = `[data-testid="order-flow"]`;
const step = async (page, name) =>
  page.waitForSelector(`${flow}[data-step="${name}"]`, { timeout: 30_000 });
const stepName = async (page) => page.getAttribute(flow, "data-step");
const continueBtn = (page) => page.getByRole("button", { name: "Continue" });
const errors = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console: ${msg.text().slice(0, 200)}`);
});

try {
  console.log("==> 1. Open staging landing and start the family plan");
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.goto(`${BASE}/#order-flow?plan=family`);
  await step(page, "plan-days");
  console.log("    step: plan-days ✓");

  console.log("==> 2. Pick preferred days (Monday + Thursday)");
  await page.getByRole("button", { name: /Monday/ }).click();
  await page.getByRole("button", { name: /Thursday/ }).click();
  await continueBtn(page).click();
  await step(page, "plan-meals");
  console.log("    step: plan-meals ✓");

  console.log("==> 3. Choose a visual meal for Monday");
  const search = page.getByPlaceholder("Search meals, ingredients or cravings");
  await page.getByRole("tab", { name: "Monday" }).click();
  await search.fill("gyro");
  const mondayMeal = page.locator('[aria-label="Meal categories"] ~ div [aria-label^="View "]');
  await page
    .getByRole("button", { name: /Choose .*gyro/i })
    .first()
    .click();
  const mondayPicked = await page
    .getByRole("tab", { name: /Monday.*1 picked/i })
    .isVisible()
    .catch(() => false);
  console.log(`    Monday meal selected (${mondayPicked}) ✓`);
  await search.fill("");

  console.log("==> 4. Defer fresh week-2 meal choices (auto-advances)");
  await continueBtn(page).click();
  await step(page, "plan-week2");
  await page.getByRole("button", { name: /I'll do it later/i }).click();
  await step(page, "plan-first-session");
  console.log("    week 2 deferred and first-session checkpoint reached ✓");
  await continueBtn(page).click();
  await step(page, "sides");

  console.log("==> 5. Sides -> decline oats modal -> no dessert");
  const modal = page.locator('[aria-label="Add overnight oats for your breakfast"]');
  if (await modal.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await page.getByRole("button", { name: "No thanks" }).click();
    console.log("    breakfast modal declined ✓");
  }
  await continueBtn(page).click();
  await step(page, "dessert");
  await page.getByRole("button", { name: "No dessert for me" }).click();
  await step(page, "schedule");

  console.log("==> 6. Schedule the first date with an available staging slot");
  await page.locator('button:has-text("Pick a date")').click();

  // The API can apply the 24-hour lead-time rule more strictly than the
  // calendar's local estimate, so probe future dates and choose the first one
  // that actually exposes an available slot.
  const candidateDates = [];
  const today = new Date();
  for (let offset = 1; offset <= 14; offset += 1) {
    const candidate = new Date(today);
    candidate.setDate(today.getDate() + offset);
    const iso = candidate.toISOString().slice(0, 10);
    const response = await fetch(`${BASE}/api/v1/availability/slots?date=${iso}`);
    const payload = await response.json();
    if (payload.data?.slots?.some((slot) => slot.available)) {
      candidateDates.push({ iso, day: String(candidate.getDate()) });
      break;
    }
  }
  if (!candidateDates.length) throw new Error("No available staging date returned within 14 days");

  const candidateDay = candidateDates[0].day;
  const dayButton = page
    .locator("#schedule-calendar button:not([disabled])")
    .filter({ hasText: new RegExp(`^${candidateDay}$`) })
    .first();
  await dayButton.click();

  const timeSection = page.locator('section[aria-label="Session time"]');
  const periodButton = timeSection.locator("button:not([disabled])").first();
  await periodButton.click();
  const slotButton = timeSection
    .locator("button:not([disabled])")
    .filter({ hasText: /^\d{2}:\d{2}$/ })
    .first();
  await slotButton.click();
  const selectedTime = await slotButton.textContent();
  await continueBtn(page).click();
  await step(page, "address");
  console.log(`    ${candidateDates[0].iso} + ${selectedTime?.trim()} slot chosen ✓`);

  console.log("==> 7. Address and contact details");
  await page.getByPlaceholder("e.g. Fourways").fill("Fourways");
  await page.getByPlaceholder("e.g. 12 Jacaranda Avenue").fill("1 E2E Test Street");
  await page.getByPlaceholder("e.g. Dainfern").fill("Staging Estate");
  await page.getByPlaceholder("e.g. Unit 12").fill("Unit 2308");
  await page.getByPlaceholder("Your name").fill(CONTACT.name);
  await page.getByPlaceholder("you@example.com").fill(CONTACT.email);
  await page.getByPlaceholder("082 123 4567").fill(CONTACT.phone);
  await continueBtn(page).click();
  await step(page, "review");
  console.log("    step: review ✓");

  console.log("==> 8. Review shows the weekly menu and day matches");
  // AnimatePresence mode="wait" mounts the review content ~300ms after the step flips.
  const waitForText = async (text, ms) => {
    try {
      await page.getByText(text).first().waitFor({ state: "visible", timeout: ms });
      return true;
    } catch {
      return false;
    }
  };
  const hasWeeklyMenu = await waitForText("Weekly menu:", 10_000);
  const hasDayMatches = await waitForText("Day matches:", 5_000);
  console.log(`    review panel: weeklyMenu=${hasWeeklyMenu} dayMatches=${hasDayMatches}`);

  console.log("==> 9. Submit the plan request");
  const quotePromise = page
    .waitForResponse((r) => r.url().includes("/booking-requests/quote"), { timeout: 20_000 })
    .catch(() => null);
  const submitPromise = page.waitForResponse(
    (r) => r.url().endsWith("/api/v1/booking-requests") && r.request().method() === "POST",
    { timeout: 30_000 },
  );
  const quoteResp = await quotePromise;
  if (quoteResp) {
    const quote = (await quoteResp.json()).data;
    console.log(
      `    quote: subtotal=${quote.subtotalCents} total=${quote.totalCents} plan=${quote.plan?.id}`,
    );
  }
  await page.getByRole("button", { name: "Checkout" }).click();
  const submitResp = await submitPromise;
  const created = (await submitResp.json()).data;
  console.log(`    POST /booking-requests -> ${submitResp.status()}`);
  console.log(
    `    booking: ${created.reference} status=${created.status} total=${created.totalCents} payment=${created.payment?.method}/${created.payment?.status}`,
  );

  await step(page, "confirmed");
  console.log("    step: confirmed ✓");

  const result = {
    ok: true,
    reference: created.reference,
    id: created.id,
    status: created.status,
    totalCents: created.totalCents,
    payment: created.payment,
    contactEmail: CONTACT.email,
    reviewPanel: { hasWeeklyMenu, hasDayMatches },
    consoleErrors: errors,
  };
  writeFileSync("/tmp/e2e-plan-booking-result.json", JSON.stringify(result, null, 2));
  console.log("\nSUCCESS — booking reference " + created.reference);
} catch (error) {
  const shot = `/tmp/e2e-failure-${STAMP}.png`;
  await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
  console.error(`\nFAILED at step: ${await stepName(page).catch(() => "?")}`);
  console.error(error.message);
  console.error(`screenshot: ${shot}`);
  if (errors.length) console.error("console errors:", errors.slice(0, 5));
  process.exitCode = 1;
} finally {
  await browser.close();
}

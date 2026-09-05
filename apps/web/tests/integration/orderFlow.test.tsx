import { describe, expect, it, vi } from "vitest";
import {
  INITIAL_ORDER_STATE,
  orderReducer,
  selectCanContinue,
  selectSubtotal,
  selectTotal,
  selectDiscount,
  type OrderState,
} from "@/features/order-flow/state/orderReducer";
import { MAINS, SIDES, DESSERTS } from "@/features/order-flow/constants/menu";
import {
  buildBookingRequestPayload,
  submitBookingRequestPayload,
} from "@/features/order-flow/api/bookingRequestClient";
import { buildPricingQuotePayload } from "@/features/order-flow/api/pricingQuoteClient";

const main = MAINS.find((m) => m.id === "chicken-peri-peri")!;
const side = SIDES.find((s) => s.id === "side-coleslaw")!;
const dessert = DESSERTS.find((d) => d.id === "dessert-malva")!;

/** Drive the reducer through a complete order and assert every transition. */
describe("order flow end-to-end", () => {
  it("walks goal -> meal -> second-meal -> sides -> dessert -> schedule -> address -> review -> confirmed", () => {
    let s: OrderState = INITIAL_ORDER_STATE;
    expect(s.step).toBe("goal");

    s = orderReducer(s, { type: "SELECT_GOAL", goalId: "build-muscle" });
    expect(s.step).toBe("meal");
    expect(s.goalId).toBe("build-muscle");

    s = orderReducer(s, { type: "SELECT_MAIN", item: main });
    expect(s.step).toBe("second-meal");
    expect(s.main?.id).toBe("chicken-peri-peri");

    // The second meal is optional; continue without one.
    expect(selectCanContinue(s)).toBe(true);
    s = orderReducer(s, { type: "NEXT" });
    expect(s.step).toBe("sides");

    s = orderReducer(s, { type: "TOGGLE_SIDE", item: side });
    expect(s.sides).toHaveLength(1);
    // Toggling the same side removes it.
    s = orderReducer(s, { type: "TOGGLE_SIDE", item: side });
    expect(s.sides).toHaveLength(0);
    // Add it back for the rest of the walk.
    s = orderReducer(s, { type: "TOGGLE_SIDE", item: side });

    s = orderReducer(s, { type: "NEXT" }); // sides -> dessert
    expect(s.step).toBe("dessert");

    s = orderReducer(s, { type: "SELECT_DESSERT", item: dessert });
    expect(s.step).toBe("schedule");
    expect(s.dessert?.id).toBe("dessert-malva");

    // Schedule requires both date and time.
    expect(selectCanContinue(s)).toBe(false);
    s = orderReducer(s, { type: "SET_DATE", date: "2026-07-20" });
    expect(selectCanContinue(s)).toBe(false);
    s = orderReducer(s, { type: "SET_TIME", time: "18:30" });
    expect(selectCanContinue(s)).toBe(true);

    s = orderReducer(s, { type: "NEXT" }); // schedule -> address
    expect(s.step).toBe("address");
    expect(selectCanContinue(s)).toBe(false);
    s = orderReducer(s, { type: "SET_ADDRESS_FIELD", field: "street", value: "12 Jacaranda Ave" });
    s = orderReducer(s, { type: "SET_ADDRESS_FIELD", field: "area", value: "Fourways" });
    s = orderReducer(s, { type: "SET_ADDRESS_FIELD", field: "estate", value: "Dainfern" });
    // Signed-in customers use the account identity instead of duplicate contact fields.
    expect(selectCanContinue(s, true)).toBe(true);
    s = orderReducer(s, { type: "SET_CONTACT_FIELD", field: "name", value: "Test Customer" });
    s = orderReducer(s, {
      type: "SET_CONTACT_FIELD",
      field: "email",
      value: "customer@example.test",
    });
    s = orderReducer(s, { type: "SET_CONTACT_FIELD", field: "phone", value: "082 123 4567" });
    expect(selectCanContinue(s)).toBe(true);

    s = orderReducer(s, { type: "NEXT" }); // address -> review
    expect(s.step).toBe("review");

    s = orderReducer(s, { type: "CONFIRM" });
    expect(s.step).toBe("confirmed");
  });

  it("offers an optional meal-prep second meal after the main is picked", () => {
    let s: OrderState = INITIAL_ORDER_STATE;
    s = orderReducer(s, { type: "SELECT_GOAL", goalId: "just-good-food" });
    s = orderReducer(s, { type: "SELECT_MAIN", item: main });

    const second = MAINS.find((m) => m.id === "sa-oxtail-seven-colours")!;
    s = orderReducer(s, { type: "SELECT_PLAN_SECOND_FAVORITE", item: second });
    expect(s.secondFavoriteMealId).toBe("sa-oxtail-seven-colours");
    expect(s.secondFavoriteMeal?.id).toBe("sa-oxtail-seven-colours");

    // Tapping the same meal again removes it.
    s = orderReducer(s, { type: "SELECT_PLAN_SECOND_FAVORITE", item: second });
    expect(s.secondFavoriteMealId).toBeNull();

    // The main meal cannot be doubled up as the second meal.
    const blocked = orderReducer(
      { ...INITIAL_ORDER_STATE, step: "second-meal", main },
      { type: "SELECT_PLAN_SECOND_FAVORITE", item: main },
    );
    expect(blocked.secondFavoriteMealId).toBeNull();

    // Choosing the second meal as a new main clears it from the second slot.
    s = orderReducer(
      { ...INITIAL_ORDER_STATE, step: "second-meal", main },
      { type: "SELECT_PLAN_SECOND_FAVORITE", item: second },
    );
    s = orderReducer(s, { type: "BACK" });
    expect(s.step).toBe("meal");
    s = orderReducer(s, { type: "SELECT_MAIN", item: second });
    expect(s.secondFavoriteMealId).toBeNull();
    expect(s.secondFavoriteMeal).toBeNull();
  });

  it("computes fallback totals from the package model with a gift-code discount", () => {
    let s: OrderState = INITIAL_ORDER_STATE;
    s = orderReducer(s, { type: "SELECT_MAIN", item: main });
    s = orderReducer(s, { type: "TOGGLE_SIDE", item: side });
    s = orderReducer(s, { type: "SELECT_DESSERT", item: dessert });
    expect(selectSubtotal(s)).toBeCloseTo(527.85 + 90);

    s = orderReducer(s, { type: "SET_GIFT_INPUT", value: "chill10" });
    s = orderReducer(s, { type: "APPLY_GIFT" });
    expect(s.appliedGift?.code).toBe("CHILL10");
    expect(s.appliedGift?.discountFraction).toBeCloseTo(0.1);
    expect(selectDiscount(s)).toBe(Math.round(617.85 * 0.1));
    expect(selectTotal(s)).toBeCloseTo(617.85 - 62);
  });

  it("prices the meal-prep second meal as a once-off fee, included on plans", () => {
    const second = MAINS.find((item) => item.id === "sa-oxtail-seven-colours")!;

    // Once-off (no plan): the second meal adds R175 to the tonight base.
    const s: OrderState = {
      ...INITIAL_ORDER_STATE,
      step: "second-meal",
      planId: null,
      main,
      secondFavoriteMealId: second.id,
      secondFavoriteMeal: second,
    };
    expect(selectSubtotal(s)).toBeCloseTo(527.85 + 175);

    // Subscription plan: included at no charge.
    const planned: OrderState = {
      ...s,
      planId: "rhythm",
    };
    expect(selectSubtotal(planned)).toBeCloseTo(1999);

    // One-off tonight plan: still pays the second-meal fee.
    const tonight: OrderState = { ...s, planId: "tonight" };
    expect(selectSubtotal(tonight)).toBeCloseTo(527.85 + 175);
  });

  it("sends the second meal as secondMainSlug when no plan is selected", () => {
    const second = MAINS.find((item) => item.id === "sa-oxtail-seven-colours")!;
    const s: OrderState = {
      ...INITIAL_ORDER_STATE,
      step: "second-meal",
      planId: null,
      main,
      secondFavoriteMealId: second.id,
      secondFavoriteMeal: second,
    };

    expect(buildPricingQuotePayload(s)).toMatchObject({
      mainSlug: "chicken-peri-peri",
      secondMainSlug: "sa-oxtail-seven-colours",
    });
    expect(buildPricingQuotePayload(s)).not.toHaveProperty("planSelection");
  });

  it("applies the CHEFMATE50 launch code at 50% off", () => {
    let s: OrderState = INITIAL_ORDER_STATE;
    const main = MAINS.find((item) => item.id === "winter-oxtail-stew")!;
    s = orderReducer(s, { type: "SELECT_MAIN", item: main });
    s = orderReducer(s, { type: "SET_GIFT_INPUT", value: "chefmate50" });
    s = orderReducer(s, { type: "APPLY_GIFT" });
    expect(s.appliedGift?.code).toBe("CHEFMATE50");
    expect(s.appliedGift?.discountFraction).toBeCloseTo(0.5);
    expect(selectDiscount(s)).toBe(Math.round(527.85 * 0.5));
  });

  it("applies the CHEFMATE15 launch code at 15% off", () => {
    let s: OrderState = INITIAL_ORDER_STATE;
    const main = MAINS.find((item) => item.id === "winter-oxtail-stew")!;
    s = orderReducer(s, { type: "SELECT_MAIN", item: main });
    s = orderReducer(s, { type: "SET_GIFT_INPUT", value: "chefmate15" });
    s = orderReducer(s, { type: "APPLY_GIFT" });
    expect(s.appliedGift?.code).toBe("CHEFMATE15");
    expect(s.appliedGift?.discountFraction).toBeCloseTo(0.15);
    expect(selectDiscount(s)).toBe(Math.round(527.85 * 0.15));
  });

  it("rejects an unknown gift code", () => {
    let s: OrderState = INITIAL_ORDER_STATE;
    s = orderReducer(s, { type: "SET_GIFT_INPUT", value: "NOPE" });
    s = orderReducer(s, { type: "APPLY_GIFT" });
    expect(s.appliedGift).toBeNull();
    expect(s.giftMessage).toContain("doesn't look right");
  });

  it("a custom request replaces the selected main", () => {
    let s: OrderState = INITIAL_ORDER_STATE;
    s = orderReducer(s, { type: "SELECT_MAIN", item: main });
    s = orderReducer(s, { type: "SET_CUSTOM_REQUEST", text: "Ouma's chicken curry" });
    expect(s.customRequest).toBe("Ouma's chicken curry");
    expect(s.main?.id).toBe("custom-request");
    expect(selectCanContinue({ ...s, step: "meal" })).toBe(true);
  });

  it("BACK from meal returns to goal", () => {
    let s: OrderState = INITIAL_ORDER_STATE;
    s = orderReducer(s, { type: "SELECT_GOAL", goalId: "lose-weight" });
    expect(s.step).toBe("meal");
    s = orderReducer(s, { type: "BACK" });
    expect(s.step).toBe("goal");
  });

  it("guides recurring plans through preferred days and a favourite first meal", () => {
    let s: OrderState = INITIAL_ORDER_STATE;

    s = orderReducer(s, { type: "START_PLAN_SETUP", planId: "family" });
    expect(s.step).toBe("plan-days");
    expect(selectCanContinue(s)).toBe(false);

    s = orderReducer(s, { type: "TOGGLE_PREFERRED_DAY", day: "monday" });
    s = orderReducer(s, { type: "TOGGLE_PREFERRED_DAY", day: "thursday" });
    expect(s.preferredDays).toEqual(["monday", "thursday"]);
    expect(selectCanContinue(s)).toBe(true);

    s = orderReducer(s, { type: "NEXT" });
    expect(s.step).toBe("plan-favorite");

    s = orderReducer(s, { type: "SELECT_PLAN_FAVORITE", item: main });
    expect(s.favoriteMealId).toBe("chicken-peri-peri");
    expect(s.main?.id).toBe("chicken-peri-peri");

    s = orderReducer(s, { type: "NEXT" });
    expect(s.step).toBe("sides");
  });

  it("lets a customer defer a plan day and first-meal choice without blocking the flow", () => {
    let s: OrderState = INITIAL_ORDER_STATE;

    s = orderReducer(s, { type: "START_PLAN_SETUP", planId: "rhythm" });
    s = orderReducer(s, { type: "DECIDE_PLAN_DAYS" });
    expect(s.planScheduleDeferred).toBe(true);
    expect(selectCanContinue(s)).toBe(true);

    s = orderReducer(s, { type: "NEXT" });
    s = orderReducer(s, { type: "DECIDE_PLAN_FAVORITE" });
    expect(s.favoriteMealDeferred).toBe(true);
    expect(selectCanContinue(s)).toBe(true);

    s = orderReducer(s, { type: "NEXT" });
    expect(s.step).toBe("meal");
  });

  it("takes the one-off package straight to meal discovery", () => {
    const s = orderReducer(INITIAL_ORDER_STATE, { type: "START_PLAN_SETUP", planId: "tonight" });

    expect(s.step).toBe("meal");
    expect(s.goalId).toBe("just-good-food");
    expect(s.planId).toBe("tonight");
  });

  it("returns recurring customers to their day choices from favourite selection", () => {
    let s: OrderState = INITIAL_ORDER_STATE;
    s = orderReducer(s, { type: "START_PLAN_SETUP", planId: "family" });
    s = orderReducer(s, { type: "TOGGLE_PREFERRED_DAY", day: "monday" });
    s = orderReducer(s, { type: "NEXT" });
    s = orderReducer(s, { type: "SELECT_PLAN_FAVORITE", item: main });
    s = orderReducer(s, { type: "BACK" });

    expect(s.step).toBe("plan-days");
    expect(s.preferredDays).toEqual(["monday"]);
    expect(s.planId).toBe("family");
  });
  it("clears package choices when a customer backs out of package setup", () => {
    let s: OrderState = INITIAL_ORDER_STATE;
    s = orderReducer(s, { type: "START_PLAN_SETUP", planId: "rhythm" });
    s = orderReducer(s, { type: "TOGGLE_PREFERRED_DAY", day: "monday" });
    s = orderReducer(s, { type: "BACK" });

    expect(s).toEqual(INITIAL_ORDER_STATE);

    s = orderReducer(s, { type: "SELECT_GOAL", goalId: "just-good-food" });
    s = orderReducer(s, { type: "SELECT_MAIN", item: main });
    s = orderReducer(s, { type: "BACK" });
    s = orderReducer(s, { type: "BACK" });

    expect(s.step).toBe("goal");
    expect(s.planId).toBeNull();
  });

  it("starts direct meal discovery only for explicit meal links", () => {
    let s: OrderState = INITIAL_ORDER_STATE;
    s = orderReducer(s, { type: "SELECT_MAIN", item: main });
    s = orderReducer(s, { type: "TOGGLE_SIDE", item: side });

    s = orderReducer(s, { type: "START_MEAL_DISCOVERY" });

    expect(s.step).toBe("meal");
    expect(s.goalId).toBe("just-good-food");
    expect(s.main).toBeNull();
    expect(s.sides).toHaveLength(0);
  });
  it("builds the backend booking payload from the completed order flow", () => {
    let s: OrderState = INITIAL_ORDER_STATE;
    s = orderReducer(s, { type: "SELECT_GOAL", goalId: "just-good-food" });
    s = orderReducer(s, { type: "SELECT_MAIN", item: main });
    s = orderReducer(s, { type: "TOGGLE_SIDE", item: side });
    s = orderReducer(s, { type: "SELECT_DESSERT", item: dessert });
    s = orderReducer(s, { type: "SET_DATE", date: "2026-08-15" });
    s = orderReducer(s, { type: "SET_TIME", time: "18:30" });
    s = orderReducer(s, { type: "SET_ADDRESS_FIELD", field: "street", value: "12 Jacaranda Ave" });
    s = orderReducer(s, { type: "SET_ADDRESS_FIELD", field: "area", value: "Fourways" });
    s = orderReducer(s, { type: "SET_ADDRESS_FIELD", field: "estate", value: "Dainfern" });
    // Signed-in customers use the account identity instead of duplicate contact fields.
    expect(selectCanContinue(s, true)).toBe(true);
    s = orderReducer(s, { type: "SET_CONTACT_FIELD", field: "name", value: "Test Customer" });
    s = orderReducer(s, {
      type: "SET_CONTACT_FIELD",
      field: "email",
      value: "customer@example.test",
    });
    s = orderReducer(s, { type: "SET_CONTACT_FIELD", field: "phone", value: "082 123 4567" });

    expect(buildBookingRequestPayload(s)).toMatchObject({
      source: "landing-order-flow",
      goalId: "just-good-food",
      mainSlug: "chicken-peri-peri",
      sideSlugs: ["side-coleslaw"],
      dessertSlug: "dessert-malva",
      scheduledDate: "2026-08-15",
      timeSlot: "18:30",
      address: {
        estate: "Dainfern",
        street: "12 Jacaranda Ave",
      },
    });
  });
  it("includes package preferences in quote and booking payloads", () => {
    let s: OrderState = INITIAL_ORDER_STATE;
    s = orderReducer(s, { type: "START_PLAN_SETUP", planId: "family" });
    s = orderReducer(s, { type: "TOGGLE_PREFERRED_DAY", day: "monday" });
    s = orderReducer(s, { type: "TOGGLE_PREFERRED_DAY", day: "thursday" });
    s = orderReducer(s, { type: "NEXT" });
    s = orderReducer(s, { type: "SELECT_PLAN_FAVORITE", item: main });
    s = orderReducer(s, { type: "NEXT" });
    s = orderReducer(s, { type: "SELECT_DESSERT", item: dessert });
    s = orderReducer(s, { type: "SET_DATE", date: "2026-08-15" });
    s = orderReducer(s, { type: "SET_TIME", time: "18:30" });
    s = orderReducer(s, { type: "SET_ADDRESS_FIELD", field: "street", value: "12 Jacaranda Ave" });
    s = orderReducer(s, { type: "SET_ADDRESS_FIELD", field: "area", value: "Fourways" });
    s = orderReducer(s, { type: "SET_CONTACT_FIELD", field: "name", value: "Test Customer" });
    s = orderReducer(s, {
      type: "SET_CONTACT_FIELD",
      field: "email",
      value: "customer@example.test",
    });
    s = orderReducer(s, { type: "SET_CONTACT_FIELD", field: "phone", value: "082 123 4567" });

    const expectedPlanSelection = {
      planId: "family",
      preferredDays: ["monday", "thursday"],
      schedulePreference: "SELECTED_DAYS",
      favoriteMealSlug: "chicken-peri-peri",
    };

    expect(buildPricingQuotePayload(s)).toMatchObject({ planSelection: expectedPlanSelection });
    expect(buildBookingRequestPayload(s)).toMatchObject({ planSelection: expectedPlanSelection });
  });

  it("records the free breakfast add-on answer in state (unasked -> yes -> no)", () => {
    expect(INITIAL_ORDER_STATE.breakfastAddOn).toBeNull();

    const answered = orderReducer(INITIAL_ORDER_STATE, {
      type: "SET_BREAKFAST_ADD_ON",
      value: true,
    });
    expect(answered.breakfastAddOn).toBe(true);

    const declined = orderReducer(answered, { type: "SET_BREAKFAST_ADD_ON", value: false });
    expect(declined.breakfastAddOn).toBe(false);

    const reset = orderReducer(declined, { type: "RESET" });
    expect(reset.breakfastAddOn).toBeNull();
  });

  it("sends the free overnight oats add-on slug when the customer accepts it", () => {
    let s: OrderState = INITIAL_ORDER_STATE;
    s = orderReducer(s, { type: "START_PLAN_SETUP", planId: "rhythm" });
    s = orderReducer(s, { type: "DECIDE_PLAN_DAYS" });
    s = orderReducer(s, { type: "DECIDE_PLAN_FAVORITE" });
    s = orderReducer(s, { type: "SELECT_MAIN", item: main });
    s = orderReducer(s, { type: "SET_BREAKFAST_ADD_ON", value: true });
    s = orderReducer(s, { type: "SET_DATE", date: "2026-08-15" });
    s = orderReducer(s, { type: "SET_TIME", time: "18:30" });
    s = orderReducer(s, { type: "SET_ADDRESS_FIELD", field: "street", value: "12 Jacaranda Ave" });
    s = orderReducer(s, { type: "SET_ADDRESS_FIELD", field: "area", value: "Fourways" });
    s = orderReducer(s, { type: "SET_CONTACT_FIELD", field: "name", value: "Test Customer" });
    s = orderReducer(s, {
      type: "SET_CONTACT_FIELD",
      field: "email",
      value: "customer@example.test",
    });
    s = orderReducer(s, { type: "SET_CONTACT_FIELD", field: "phone", value: "082 123 4567" });

    expect(buildPricingQuotePayload(s)).toMatchObject({
      breakfastAddOnSlug: "overnight-oats-trio",
      planSelection: expect.objectContaining({ planId: "rhythm" }),
    });
    expect(buildBookingRequestPayload(s)).toMatchObject({
      breakfastAddOnSlug: "overnight-oats-trio",
      planSelection: expect.objectContaining({ planId: "rhythm" }),
    });
  });

  it("omits the breakfast add-on when the customer declines it", () => {
    let s: OrderState = INITIAL_ORDER_STATE;
    s = orderReducer(s, { type: "START_PLAN_SETUP", planId: "rhythm" });
    s = orderReducer(s, { type: "DECIDE_PLAN_DAYS" });
    s = orderReducer(s, { type: "DECIDE_PLAN_FAVORITE" });
    s = orderReducer(s, { type: "SELECT_MAIN", item: main });
    s = orderReducer(s, { type: "SET_BREAKFAST_ADD_ON", value: false });
    s = orderReducer(s, { type: "SET_DATE", date: "2026-08-15" });
    s = orderReducer(s, { type: "SET_TIME", time: "18:30" });
    s = orderReducer(s, { type: "SET_ADDRESS_FIELD", field: "street", value: "12 Jacaranda Ave" });
    s = orderReducer(s, { type: "SET_ADDRESS_FIELD", field: "area", value: "Fourways" });
    s = orderReducer(s, { type: "SET_CONTACT_FIELD", field: "name", value: "Test Customer" });
    s = orderReducer(s, {
      type: "SET_CONTACT_FIELD",
      field: "email",
      value: "customer@example.test",
    });
    s = orderReducer(s, { type: "SET_CONTACT_FIELD", field: "phone", value: "082 123 4567" });

    expect(buildPricingQuotePayload(s)).not.toHaveProperty("breakfastAddOnSlug");
    expect(buildBookingRequestPayload(s)).not.toHaveProperty("breakfastAddOnSlug");
  });

  it("rejects incomplete booking payloads before sending a request", () => {
    const validState: OrderState = {
      ...INITIAL_ORDER_STATE,
      main,
      date: "2026-08-15",
      time: "18:30",
      address: { estate: "", unit: "", street: "12 Jacaranda Ave", area: "Fourways" },
      contact: { name: "Test Customer", email: "customer@example.test", phone: "082 123 4567" },
    };

    expect(() => buildBookingRequestPayload({ ...validState, main: null })).toThrow(
      "Choose a main meal",
    );
    expect(() => buildBookingRequestPayload({ ...validState, date: "" })).toThrow("Choose a date");
    expect(() => buildBookingRequestPayload({ ...validState, time: null })).toThrow(
      "Choose a time",
    );
    expect(() =>
      buildBookingRequestPayload({
        ...validState,
        address: { ...validState.address, street: "  " },
      }),
    ).toThrow("Street address is required");
    expect(() =>
      buildBookingRequestPayload({
        ...validState,
        address: { ...validState.address, area: " " },
      }),
    ).toThrow("Area or suburb is required");
    expect(() =>
      buildBookingRequestPayload({
        ...validState,
        contact: { ...validState.contact, name: " " },
      }),
    ).toThrow("Contact name is required");
    expect(() =>
      buildBookingRequestPayload({
        ...validState,
        contact: { ...validState.contact, email: "not-an-email" },
      }),
    ).toThrow("A valid contact email is required");
    expect(() =>
      buildBookingRequestPayload({
        ...validState,
        contact: { ...validState.contact, phone: "12" },
      }),
    ).toThrow("A valid contact phone number is required");
  });

  it("normalizes guest phone formats and omits duplicate contact for account checkout", () => {
    const validState: OrderState = {
      ...INITIAL_ORDER_STATE,
      main,
      date: "2026-08-15",
      time: "18:30",
      address: {
        estate: " Dainfern ",
        unit: " 42 ",
        street: " 12 Jacaranda Ave ",
        area: " Fourways ",
      },
      contact: {
        name: " Test Customer ",
        email: " CUSTOMER@EXAMPLE.TEST ",
        phone: "0027821234567",
      },
    };

    expect(buildBookingRequestPayload(validState).contact).toEqual({
      name: "Test Customer",
      email: "customer@example.test",
      phone: "+27821234567",
    });
    expect(
      buildBookingRequestPayload({
        ...validState,
        contact: { ...validState.contact, phone: "+27821234567" },
      }).contact?.phone,
    ).toBe("+27821234567");
    expect(buildBookingRequestPayload(validState, { useAccountContact: true })).not.toHaveProperty(
      "contact",
    );
    expect(buildBookingRequestPayload(validState).address).toMatchObject({
      estate: "Dainfern",
      unit: "42",
      street: "12 Jacaranda Ave",
      area: "Fourways",
    });
  });
  it("sends the backend booking request with an idempotency key before confirming", async () => {
    const fetchImpl = vi.fn(
      async () =>
        ({
          ok: true,
          status: 201,
          json: async () => ({
            data: {
              id: "booking-1",
              reference: "CM-20260815-ABCD1234",
              status: "REQUESTED",
              subtotalCents: 18000,
              discountCents: 0,
              totalCents: 18000,
              payment: { method: "BANK_TRANSFER", status: "PENDING", bankTransfer: null },
            },
          }),
        }) as Response,
    );

    const payload = buildBookingRequestPayload({
      ...INITIAL_ORDER_STATE,
      main,
      sides: [side],
      dessert,
      date: "2026-08-15",
      time: "18:30",
      address: { estate: "Dainfern", unit: "", street: "12 Jacaranda Ave", area: "Fourways" },
      contact: { name: "Test Customer", email: "customer@example.test", phone: "082 123 4567" },
    });

    await expect(
      submitBookingRequestPayload(payload, {
        idempotencyKey: "flow-submit-1",
        baseUrl: "https://api.example.com",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).resolves.toMatchObject({ reference: "CM-20260815-ABCD1234" });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.com/api/v1/booking-requests",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Idempotency-Key": "flow-submit-1" }),
      }),
    );
  });

  it("keeps failed Send request attempts from becoming confirmations", async () => {
    const payload = buildBookingRequestPayload({
      ...INITIAL_ORDER_STATE,
      main,
      date: "2026-08-15",
      time: "18:30",
      address: { estate: "", unit: "", street: "12 Jacaranda Ave", area: "Fourways" },
      contact: { name: "Test Customer", email: "customer@example.test", phone: "082 123 4567" },
    });
    const fetchImpl = vi.fn(
      async () => ({ ok: false, status: 503, json: async () => ({}) }) as Response,
    );

    await expect(
      submitBookingRequestPayload(payload, {
        idempotencyKey: "flow-submit-fail",
        baseUrl: "https://api.example.com",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toThrow("Chefmate booking request failed (503)");
  });
  it("uses the safe local backend default when no API URL is configured", async () => {
    const fetchImpl = vi.fn(
      async () =>
        ({
          ok: true,
          status: 201,
          json: async () => ({
            data: {
              id: "booking-local-default",
              reference: "CM-LOCAL-0001",
              status: "REQUESTED",
              subtotalCents: 18000,
              discountCents: 0,
              totalCents: 18000,
              payment: { method: "BANK_TRANSFER", status: "PENDING", bankTransfer: null },
            },
          }),
        }) as Response,
    );

    const payload = buildBookingRequestPayload({
      ...INITIAL_ORDER_STATE,
      main,
      sides: [side],
      dessert,
      date: "2026-08-15",
      time: "18:30",
      address: { estate: "Dainfern", unit: "", street: "12 Jacaranda Ave", area: "Fourways" },
      contact: { name: "Test Customer", email: "customer@example.test", phone: "082 123 4567" },
    });

    await submitBookingRequestPayload(payload, {
      idempotencyKey: "flow-submit-local-default",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3001/api/v1/booking-requests",
      expect.objectContaining({ method: "POST" }),
    );
  });
  it("does not turn a legacy catalog URL into the booking endpoint", async () => {
    const originalChefmateApiUrl = process.env.NEXT_PUBLIC_CHEFMATE_API_URL;
    const originalMealsApiUrl = process.env.NEXT_PUBLIC_MEALS_API_URL;
    delete process.env.NEXT_PUBLIC_CHEFMATE_API_URL;
    process.env.NEXT_PUBLIC_MEALS_API_URL = "https://catalog.example/api/v1/catalog";

    try {
      const fetchImpl = vi.fn(
        async () =>
          ({
            ok: true,
            status: 201,
            json: async () => ({
              data: {
                id: "booking-no-catalog-leak",
                reference: "CM-NO-CATALOG-0001",
                status: "REQUESTED",
                subtotalCents: 18000,
                discountCents: 0,
                totalCents: 18000,
                payment: { method: "BANK_TRANSFER", status: "PENDING", bankTransfer: null },
              },
            }),
          }) as Response,
      );

      const payload = buildBookingRequestPayload({
        ...INITIAL_ORDER_STATE,
        main,
        sides: [side],
        dessert,
        date: "2026-08-15",
        time: "18:30",
        address: { estate: "Dainfern", unit: "", street: "12 Jacaranda Ave", area: "Fourways" },
        contact: { name: "Test Customer", email: "customer@example.test", phone: "082 123 4567" },
      });

      await submitBookingRequestPayload(payload, {
        idempotencyKey: "flow-submit-catalog-url-isolated",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      });

      expect(fetchImpl).toHaveBeenCalledWith(
        "http://localhost:3001/api/v1/booking-requests",
        expect.objectContaining({ method: "POST" }),
      );
      expect(fetchImpl).not.toHaveBeenCalledWith(
        "https://catalog.example/api/v1/catalog/api/v1/booking-requests",
        expect.anything(),
      );
    } finally {
      if (originalChefmateApiUrl === undefined) delete process.env.NEXT_PUBLIC_CHEFMATE_API_URL;
      else process.env.NEXT_PUBLIC_CHEFMATE_API_URL = originalChefmateApiUrl;
      if (originalMealsApiUrl === undefined) delete process.env.NEXT_PUBLIC_MEALS_API_URL;
      else process.env.NEXT_PUBLIC_MEALS_API_URL = originalMealsApiUrl;
    }
  });
});

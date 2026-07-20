import { describe, expect, it } from "vitest";
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

const main = MAINS.find((m) => m.id === "chicken-peri-peri")!;
const side = SIDES.find((s) => s.id === "side-chakalaka")!;
const dessert = DESSERTS.find((d) => d.id === "dessert-malva")!;

/** Drive the reducer through a complete order and assert every transition. */
describe("order flow end-to-end", () => {
  it("walks goal -> meal -> sides -> dessert -> schedule -> address -> review -> confirmed", () => {
    let s: OrderState = INITIAL_ORDER_STATE;
    expect(s.step).toBe("goal");

    s = orderReducer(s, { type: "SELECT_GOAL", goalId: "build-muscle" });
    expect(s.step).toBe("meal");
    expect(s.goalId).toBe("build-muscle");

    s = orderReducer(s, { type: "SELECT_MAIN", item: main });
    expect(s.step).toBe("sides");
    expect(s.main?.id).toBe("chicken-peri-peri");

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
    s = orderReducer(s, { type: "SET_ADDRESS_FIELD", field: "estate", value: "Dainfern" });
    expect(selectCanContinue(s)).toBe(true);

    s = orderReducer(s, { type: "NEXT" }); // address -> review
    expect(s.step).toBe("review");

    s = orderReducer(s, { type: "CONFIRM" });
    expect(s.step).toBe("confirmed");
  });

  it("computes totals with a gift-code discount", () => {
    let s: OrderState = INITIAL_ORDER_STATE;
    s = orderReducer(s, { type: "SELECT_MAIN", item: main }); // R95
    s = orderReducer(s, { type: "TOGGLE_SIDE", item: side }); // R30
    s = orderReducer(s, { type: "SELECT_DESSERT", item: dessert }); // R55
    expect(selectSubtotal(s)).toBe(95 + 30 + 55);

    s = orderReducer(s, { type: "SET_GIFT_INPUT", value: "chill10" });
    s = orderReducer(s, { type: "APPLY_GIFT" });
    expect(s.appliedGift?.code).toBe("CHILL10");
    expect(s.appliedGift?.discountFraction).toBeCloseTo(0.1);
    expect(selectDiscount(s)).toBe(Math.round(180 * 0.1));
    expect(selectTotal(s)).toBe(180 - 18);
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
});

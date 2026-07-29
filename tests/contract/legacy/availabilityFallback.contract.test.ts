import { createElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScheduleSelect } from "@/features/order-flow/components/ScheduleSelect";
import { OrderContext } from "@/features/order-flow/state/OrderContext";
import { INITIAL_ORDER_STATE } from "@/features/order-flow/state/orderReducer";
import type { OrderController } from "@/features/order-flow/state/useOrderController";
import { fakeResponse } from "./support/fakeFetch";
import { LEGACY_BASE_URL } from "./support/fixtures";

/**
 * Legacy contract 7, consumer-side consequence: availability is ADVISORY.
 *
 * `ScheduleSelect` seeds a local same-day rule, overwrites it when the API
 * answers, and silently no-ops with `.catch(() => {})` when the API fails.
 * S01 characterizes this as-is; making availability authoritative is S08 work.
 */
function renderScheduleAtDate(date: string): void {
  const controller = {
    state: { ...INITIAL_ORDER_STATE, step: "schedule", date },
    subtotal: 0,
    discount: 0,
    total: 0,
    canContinue: false,
    stepIndex: 4,
    isSubmittingRequest: false,
    submissionError: null,
    bookingConfirmation: null,
    setTime: vi.fn(),
    setDate: vi.fn(),
  } as unknown as OrderController;

  render(
    createElement(OrderContext.Provider, { value: controller }, createElement(ScheduleSelect)),
  );
}

describe("legacy contract: availability is advisory, not authoritative", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  function freezeAndStub(fetchImpl: () => Promise<Response>): void {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-08-15T13:19:00.000Z"));
    vi.stubEnv("NEXT_PUBLIC_CHEFMATE_API_URL", LEGACY_BASE_URL);
    vi.stubGlobal("fetch", vi.fn(fetchImpl));
  }

  it("keeps the local same-day rule when the availability request fails", async () => {
    freezeAndStub(async () => {
      throw new TypeError("Failed to fetch");
    });

    renderScheduleAtDate("2026-08-15");
    fireEvent.click(screen.getByRole("button", { name: /afternoon/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "16:00" })).toBeEnabled();
    });
    expect(screen.getByRole("button", { name: "15:00" })).toBeDisabled();
    // The swallowed failure surfaces no error text to the customer.
    expect(screen.queryByText(/availability request failed/i)).not.toBeInTheDocument();
  });

  it("lets a successful availability response overwrite the local rule", async () => {
    freezeAndStub(async () =>
      fakeResponse({
        body: {
          data: {
            date: "2026-08-15",
            slots: [{ period: "afternoon", time: "16:00", label: "4:00 PM", available: false }],
          },
        },
      }),
    );

    renderScheduleAtDate("2026-08-15");
    fireEvent.click(screen.getByRole("button", { name: /afternoon/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "16:00" })).toBeDisabled();
    });
  });
});

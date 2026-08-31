import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerOverview } from "@/features/customer/CustomerOverview";
import type { PolicyStatusItem } from "@/features/platform/api/platformClient";

const api = vi.hoisted(() => ({
  acceptPolicy: vi.fn(),
  fetchPolicyStatus: vi.fn(),
}));

vi.mock("@/features/platform/api/platformClient", () => api);

vi.mock("@/features/customer/api/customerBookingsClient", () => ({
  fetchCustomerBookings: vi.fn(async () => []),
}));

const pendingCustomerTerms: PolicyStatusItem = {
  policyKey: "CUSTOMER_TERMS",
  title: "Customer Terms",
  documentPath: "/legal/customer-terms",
  requiredVersion: "2026-08-19",
  effectiveAt: "2026-08-19T00:00:00.000Z",
  required: false,
  accepted: false,
  stale: false,
  acceptedVersion: null,
  acceptedAt: null,
};

describe("CustomerOverview optional policy completion", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.acceptPolicy.mockResolvedValue({
      id: "acceptance-customer-1",
      userId: "customer-1",
      policyKey: "CUSTOMER_TERMS",
      version: "2026-08-19",
      acceptedAt: "2026-08-19T12:00:00.000Z",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns focus to the persistent dashboard heading after server-confirmed completion removes the opener", async () => {
    let animationFrame: FrameRequestCallback | undefined;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      animationFrame = callback;
      return 1;
    });
    api.fetchPolicyStatus
      .mockResolvedValueOnce([pendingCustomerTerms])
      .mockResolvedValueOnce([
        { ...pendingCustomerTerms, accepted: true, acceptedVersion: "2026-08-19" },
      ]);

    render(<CustomerOverview />);
    const review = await screen.findByRole("button", { name: "Review Now" });
    fireEvent.click(review);
    await screen.findByRole("dialog", { name: "Customer Terms" });

    fireEvent.click(screen.getByRole("checkbox", { name: /accept Customer Terms/ }));
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));

    await waitFor(() => expect(api.fetchPolicyStatus).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Review Now" })).not.toBeInTheDocument();
    expect(animationFrame).toBeTypeOf("function");

    act(() => animationFrame?.(0));

    expect(screen.getByRole("heading", { name: /Welcome back/ })).toHaveFocus();
  });
});

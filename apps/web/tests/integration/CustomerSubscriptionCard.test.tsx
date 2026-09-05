import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerOverview } from "@/features/customer/CustomerOverview";

const api = vi.hoisted(() => ({
  acceptPolicy: vi.fn(),
  fetchPolicyStatus: vi.fn(),
}));

const client = vi.hoisted(() => ({
  fetchCustomerBookings: vi.fn(),
  fetchCustomerSubscription: vi.fn(),
}));

vi.mock("@/features/platform/api/platformClient", async () => {
  const { z } = await import("zod");
  return {
    ...api,
    platformRoleSchema: z.preprocess(
      (value) => (value === "COOK" ? "CHEF" : value),
      z.enum(["CUSTOMER", "CHEF", "ADMIN", "SUPPORT"]),
    ),
  };
});

vi.mock("@/features/customer/api/customerBookingsClient", () => client);

const rhythmSubscription = {
  planId: "rhythm",
  planName: "chefmate rhythm",
  planPriceCents: 199900,
  totalSessions: 4,
  sessionsUsed: 2,
  sessionsRemaining: 2,
};

describe("CustomerOverview subscription package card", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.fetchPolicyStatus.mockResolvedValue([]);
    api.acceptPolicy.mockResolvedValue({});
    client.fetchCustomerBookings.mockResolvedValue([]);
    client.fetchCustomerSubscription.mockResolvedValue(rhythmSubscription);
  });

  it("shows the package name, sessions used and dinners left for a subscription customer", async () => {
    render(<CustomerOverview />);

    expect(await screen.findByRole("heading", { name: "Chefmate Rhythm" })).toBeInTheDocument();
    // The en-ZA currency formatter separates thousands with a space, so match
    // by content rather than a hard-coded "R1,999" string.
    expect(
      screen.getByText(
        (content) => content.includes("/ month") && content.includes("4 dinners included"),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("dinners left")).toBeInTheDocument();
    expect(
      screen.getByText(
        (content) =>
          content.includes("2 of 4 dinners used") && content.includes("2 dinners left this month"),
      ),
    ).toBeInTheDocument();
  });

  it("does not show the package card for a non-subscription customer", async () => {
    client.fetchCustomerSubscription.mockResolvedValueOnce(null);

    render(<CustomerOverview />);

    await screen.findByRole("heading", { name: /Welcome back/ });
    expect(screen.queryByRole("heading", { name: "Chefmate Rhythm" })).not.toBeInTheDocument();
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerActivationPage } from "@/features/auth/CustomerActivationPage";
import type { CustomerBooking } from "@/features/customer/api/customerBookingsClient";

const activationApi = vi.hoisted(() => ({
  consumeCustomerActivation: vi.fn(),
  updateCustomerProfile: vi.fn(),
  setCustomerPassword: vi.fn(),
}));

const platformApi = vi.hoisted(() => ({
  acceptPolicy: vi.fn(),
  fetchPolicyStatus: vi.fn(),
}));

const bookingsApi = vi.hoisted(() => ({
  fetchCustomerBookings: vi.fn(),
}));

const checkoutApi = vi.hoisted(() => ({
  initializePaystackCheckout: vi.fn(),
}));

vi.mock("@/features/auth/api/customerActivationClient", () => activationApi);
vi.mock("@/features/platform/api/platformClient", () => platformApi);
vi.mock("@/features/customer/api/customerBookingsClient", () => bookingsApi);
vi.mock("@/features/order-flow/api/bookingRequestClient", () => checkoutApi);

const user = {
  id: "customer-1",
  displayName: "Lindi",
  email: "lindi@example.test",
  phone: "+27810439045",
  roles: ["CUSTOMER"],
  status: "ACTIVE",
  emailVerifiedAt: "2026-10-01T17:00:00.000Z",
  createdAt: "2026-10-01T17:00:00.000Z",
};

const unpaidBooking = {
  id: "booking-1",
  reference: "CM00535",
  status: "REQUESTED",
  type: "CUSTOM",
  mainMeal: { slug: "custom-request", name: "Custom Request" },
  meals: [],
  orderItems: [],
  customRequest: "Bespoke two-main session",
  scheduledDate: "2026-10-02",
  timeSlot: "16:00",
  createdAt: "2026-10-01T18:27:00.000Z",
} satisfies CustomerBooking;

describe("CustomerActivationPage save and pay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    activationApi.consumeCustomerActivation.mockResolvedValue(user);
    platformApi.fetchPolicyStatus.mockResolvedValue([]);
    bookingsApi.fetchCustomerBookings.mockResolvedValue([unpaidBooking]);
    checkoutApi.initializePaystackCheckout.mockResolvedValue({
      payment: {
        method: "PAYSTACK",
        provider: "PAYSTACK",
        status: "PENDING",
        bankTransfer: null,
        paystack: { authorizationUrl: "https://checkout.paystack.com/test", accessCode: "test" },
      },
      authorizationUrl: "https://checkout.paystack.com/test",
    });
    Object.defineProperty(window, "location", {
      value: { assign: vi.fn() },
      writable: true,
    });
  });

  it("ends at payment instead of stranding the customer on the dashboard link", async () => {
    render(<CustomerActivationPage token="activation-token" />);

    const payButton = await screen.findByRole("button", { name: /Save and pay/ });
    expect(payButton).toBeInTheDocument();
    expect(screen.getByText(/CM00535 is waiting for payment/)).toBeInTheDocument();

    fireEvent.click(payButton);
    await waitFor(() =>
      expect(checkoutApi.initializePaystackCheckout).toHaveBeenCalledWith("CM00535"),
    );
    expect(window.location.assign).toHaveBeenCalledWith("https://checkout.paystack.com/test");
  });

  it("falls back to the dashboard link when nothing is owed", async () => {
    bookingsApi.fetchCustomerBookings.mockResolvedValue([]);
    render(<CustomerActivationPage token="activation-token" />);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Open my customer dashboard" })).toBeInTheDocument(),
    );
    expect(screen.queryByRole("button", { name: /Save and pay/ })).not.toBeInTheDocument();
  });
});

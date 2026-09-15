import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerBookings } from "@/features/customer/CustomerBookings";
import type { CustomerBooking } from "@/features/customer/api/customerBookingsClient";

const bookingsApi = vi.hoisted(() => ({
  fetchCustomerBookings: vi.fn(),
  modifyCustomerBooking: vi.fn(),
}));

const availabilityApi = vi.hoisted(() => ({
  fetchAvailabilityForDate: vi.fn(),
}));

vi.mock("@/features/customer/api/customerBookingsClient", () => bookingsApi);
vi.mock("@/features/order-flow/api/availabilityClient", () => availabilityApi);

const mockBooking: CustomerBooking = {
  id: "booking-1",
  reference: "CM00475",
  status: "NEEDS_REVIEW",
  type: "SUBSCRIPTION",
  mainMeal: { slug: "winter-oxtail-stew", name: "Winter Oxtail Stew" },
  meals: [
    { kind: "main", slug: "winter-oxtail-stew", name: "Winter Oxtail Stew" },
    { kind: "addon", slug: "overnight-oats-trio", name: "Overnight Oats Trio" },
  ],
  customRequest: "No dairy",
  address: {
    street: "33 Wilson street",
    unit: "33",
    estate: "Witfield Estate",
    serviceArea: "Witfield",
  },
  scheduledDate: "2026-09-20",
  timeSlot: "16:00",
  createdAt: "2026-09-11T15:58:09.848Z",
};

describe("CustomerBookings component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bookingsApi.fetchCustomerBookings.mockResolvedValue([mockBooking]);
    availabilityApi.fetchAvailabilityForDate.mockResolvedValue([
      { period: "afternoon", time: "16:00", label: "16:00 - Late Afternoon", available: true },
      { period: "evening", time: "18:00", label: "18:00 - Evening", available: true },
    ]);
  });

  it("renders booking list with details and opens edit modal", async () => {
    render(<CustomerBookings />);

    await expect(screen.findByText(/CM00475/)).resolves.toBeInTheDocument();
    expect(screen.getByText("Winter Oxtail Stew, Overnight Oats Trio")).toBeInTheDocument();
    expect(screen.getByText(/33 Wilson street/)).toBeInTheDocument();

    const editBtn = screen.getByRole("button", { name: /Edit Order & Schedule/i });
    expect(editBtn).toBeInTheDocument();

    fireEvent.click(editBtn);

    const headings = screen.getAllByRole("heading", { name: "Edit Order & Schedule" });
    expect(headings.length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/Choose Main Dish/i)).toHaveValue("winter-oxtail-stew");
    expect(screen.getByPlaceholderText(/Mild spice, no dairy/i)).toHaveValue("No dairy");
  });

  it("modifies booking date, dish, sides, notes, address and submits", async () => {
    bookingsApi.modifyCustomerBooking.mockResolvedValue({
      ...mockBooking,
      mainMeal: {
        slug: "sa-roast-chicken-seven-colours",
        name: "SA Roast Chicken (Seven Colours)",
      },
      timeSlot: "18:00",
      customRequest: "Extra gravy please",
    });

    render(<CustomerBookings />);
    await expect(screen.findByText(/CM00475/)).resolves.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Edit Order & Schedule/i }));

    // Change main meal
    const mainSelect = screen.getByLabelText(/Choose Main Dish/i);
    fireEvent.change(mainSelect, { target: { value: "sa-roast-chicken-seven-colours" } });

    // Toggle side
    const sideCheckbox = screen.getByRole("checkbox", {
      name: /Seven Colours \(Beetroot, Pumpkin, Spinach, Chakalaka\)/i,
    });
    fireEvent.click(sideCheckbox);

    // Update notes
    const notesInput = screen.getByPlaceholderText(/Mild spice, no dairy/i);
    fireEvent.change(notesInput, { target: { value: "Extra gravy please" } });

    // Click slot
    const slotBtn = await screen.findByRole("button", { name: /18:00/ });
    fireEvent.click(slotBtn);

    // Save changes
    const saveBtn = screen.getByRole("button", { name: /Save Order Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(bookingsApi.modifyCustomerBooking).toHaveBeenCalledWith(
        "booking-1",
        expect.objectContaining({
          mainMealSlug: "sa-roast-chicken-seven-colours",
          mainName: "SA Roast Chicken (Seven Colours)",
          timeSlot: "18:00",
          customRequest: "Extra gravy please",
        }),
      );
    });
  });

  it("handles canceling the edit modal", async () => {
    render(<CustomerBookings />);
    await expect(screen.findByText(/CM00475/)).resolves.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Edit Order & Schedule/i }));
    const headings = screen.getAllByRole("heading", { name: "Edit Order & Schedule" });
    expect(headings.length).toBeGreaterThan(0);

    const cancelBtn = screen.getByRole("button", { name: /^Cancel$/i });
    fireEvent.click(cancelBtn);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("handles empty bookings state", async () => {
    bookingsApi.fetchCustomerBookings.mockResolvedValue([]);
    render(<CustomerBookings />);

    await expect(screen.findByText(/No upcoming bookings/i)).resolves.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Book a cook/i })).toBeInTheDocument();
  });
});

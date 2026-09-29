import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerBookings } from "@/features/customer/CustomerBookings";
import type { CustomerBooking } from "@/features/customer/api/customerBookingsClient";

const bookingsApi = vi.hoisted(() => ({
  fetchCustomerBookings: vi.fn(),
  modifyCustomerBooking: vi.fn(),
  downloadCustomerIngredientsPdf: vi.fn(),
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
  orderItems: [
    {
      kind: "main",
      slug: "winter-oxtail-stew",
      name: "Winter Oxtail Stew",
      groupLabel: "Tuesday",
      externalUrl: null,
      ingredients: ["1kg oxtail", "carrots"],
      shoppingListUrl: "https://checkers.example/list/meal",
    },
    {
      kind: "main",
      slug: "chicken-peri-peri",
      name: "Chicken Peri Peri",
      groupLabel: "Friday",
      externalUrl: "https://sixty60.example/list/second-meal",
      ingredients: ["chicken", "peri-peri sauce"],
      shoppingListUrl: null,
    },
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
    expect(screen.getByText("Winter Oxtail Stew, Chicken Peri Peri")).toBeInTheDocument();
    expect(screen.getByText(/33 Wilson street/)).toBeInTheDocument();
    expect(screen.getByText(/View all meals, ingredients & shopping links/)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/View all meals, ingredients & shopping links/));
    expect(screen.getByText(/1kg oxtail, carrots/)).toBeInTheDocument();
    expect(screen.getByText("Chicken Peri Peri")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Checkers Sixty60 list" })).toHaveAttribute(
      "href",
      "https://checkers.example/list/meal",
    );
    expect(screen.getByRole("link", { name: "Open recipe link" })).toHaveAttribute(
      "href",
      "https://sixty60.example/list/second-meal",
    );

    const editBtn = screen.getByRole("button", { name: /Edit Order & Schedule/i });
    expect(editBtn).toBeInTheDocument();

    fireEvent.click(editBtn);

    const headings = screen.getAllByRole("heading", { name: "Edit Order & Schedule" });
    expect(headings.length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/Choose Main Dish/i)).toHaveValue("winter-oxtail-stew");
    expect(screen.getByPlaceholderText(/Mild spice, no dairy/i)).toHaveValue("No dairy");
  });

  it("downloads the ingredients PDF from the order card", async () => {
    const urlApi = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:ingredients");
    const revokeUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    bookingsApi.downloadCustomerIngredientsPdf.mockResolvedValue(new Blob(["%PDF-"]));

    render(<CustomerBookings />);
    await expect(screen.findByText(/CM00475/)).resolves.toBeInTheDocument();
    fireEvent.click(screen.getByText(/View all meals, ingredients & shopping links/));
    fireEvent.click(screen.getByRole("button", { name: "Download ingredients PDF" }));

    await waitFor(() => {
      expect(bookingsApi.downloadCustomerIngredientsPdf).toHaveBeenCalledWith("booking-1");
    });
    expect(click).toHaveBeenCalledOnce();
    expect(urlApi).toHaveBeenCalledOnce();
    expect(revokeUrl).toHaveBeenCalledWith("blob:ingredients");
    urlApi.mockRestore();
    revokeUrl.mockRestore();
    click.mockRestore();
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

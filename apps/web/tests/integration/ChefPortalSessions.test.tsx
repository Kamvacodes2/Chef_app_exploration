import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChefOverview } from "@/features/platform/ChefOverview";
import { ChefProfileEditor } from "@/features/platform/ChefProfileEditor";

const api = vi.hoisted(() => {
  const availabilityDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const availabilityFromRecord = (record: Record<string, unknown> | null | undefined) => {
    const rawWindows = Array.isArray(record?.windows) ? record.windows : [];
    const windows = rawWindows.flatMap((candidate) => {
      if (!candidate || typeof candidate !== "object") return [];
      const entry = candidate as Record<string, unknown>;
      const days = Array.isArray(entry.days)
        ? entry.days.filter((day) => availabilityDays.includes(day as string))
        : [];
      if (days.length === 0) return [];
      return [
        {
          days,
          from: typeof entry.from === "string" ? entry.from : "09:00",
          to: typeof entry.to === "string" ? entry.to : "17:00",
        },
      ];
    });
    const notes = typeof record?.notes === "string" ? record.notes : "";
    return { notes, windows };
  };
  const isWithinAvailability = (
    weekday: string,
    time: string,
    availability: { windows: readonly { days: readonly string[]; from: string; to: string }[] },
  ): boolean =>
    availability.windows.some(
      (window) => window.days.includes(weekday) && window.from <= time && time <= window.to,
    );
  return {
    acceptChefOffer: vi.fn(),
    alignSessionAvailability: vi.fn(),
    releaseSessionClaim: vi.fn(),
    availabilityDays,
    availabilityFromRecord,
    isWithinAvailability,
    claimAvailableSession: vi.fn(),
    completeChefBooking: vi.fn(),
    declineChefOffer: vi.fn(),
    fetchAvailableSessions: vi.fn(),
    fetchChefBookings: vi.fn(),
    fetchChefOffers: vi.fn(),
    fetchChefProfile: vi.fn(),
    markChefEnRoute: vi.fn(),
    updateChefBankDetails: vi.fn(),
    updateChefProfile: vi.fn(),
  };
});

vi.mock("@/features/platform/api/platformClient", () => api);

const chefProfile = {
  userId: "chef-1",
  displayName: "Test Chef",
  email: "chef@example.test",
  isAvailable: true,
  serviceArea: "Fourways",
  serviceAreas: ["Fourways"],
  bio: "Private chef.",
  latitude: null,
  longitude: null,
  maxTravelKm: 30,
  availability: null,
  bankAccount: null,
  createdAt: "2026-09-01T08:00:00.000Z",
  updatedAt: "2026-09-01T08:00:00.000Z",
};

const session = {
  id: "booking-grabs-1",
  reference: "CM-GRAB-01",
  status: "AWAITING_CHEF",
  mainName: "Lamb curry and rice",
  scheduledDate: "2026-09-12",
  timeSlot: "18:30",
  serviceArea: "Randburg",
  estate: null,
  unit: null,
  street: null,
  chefPayoutCents: 34310,
  paymentStatus: "VERIFIED",
  claimedAt: null,
  repeatVisits: 0,
};

describe("Chef portal sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.fetchChefProfile.mockResolvedValue(chefProfile);
    api.fetchChefOffers.mockResolvedValue([]);
    api.fetchChefBookings.mockResolvedValue([]);
  });

  it("lists up-for-grabs sessions and claims one only after the availability confirmation", async () => {
    api.fetchAvailableSessions.mockResolvedValue([session]);
    api.claimAvailableSession.mockResolvedValue({
      status: "claimed",
      booking: { ...session, status: "CHEF_MATCHED" },
    });
    render(<ChefOverview />);

    await screen.findByText("Lamb curry and rice");
    expect(screen.getByText(/CM-GRAB-01/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Claim this session" }));

    const confirmButton = screen.getByRole("button", {
      name: "Yes, I confirm — take the session",
    });
    expect(confirmButton).toBeDisabled();
    fireEvent.click(
      screen.getByRole("checkbox", { name: /I confirm I am available to cook this session/ }),
    );
    expect(confirmButton).toBeEnabled();
    fireEvent.click(confirmButton);

    await waitFor(() => expect(api.claimAvailableSession).toHaveBeenCalledWith("booking-grabs-1"));
  });

  it("offers Align availability for unpaid sessions and surfaces the claim after confirming", async () => {
    api.fetchAvailableSessions.mockResolvedValue([{ ...session, paymentStatus: "PENDING" }]);
    api.alignSessionAvailability.mockResolvedValue({
      bookingId: "booking-grabs-1",
      reference: "CM-GRAB-01",
      claimedAt: "2026-09-10T08:00:00.000Z",
    });
    render(<ChefOverview />);

    await screen.findByText("Lamb curry and rice");
    expect(screen.getByText("Awaiting payment")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Align availability" }));
    fireEvent.click(
      screen.getByRole("checkbox", { name: /I confirm I am available to cook this session/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Yes, I confirm — take the session" }));

    await waitFor(() =>
      expect(api.alignSessionAvailability).toHaveBeenCalledWith("booking-grabs-1"),
    );
    expect(await screen.findByText(/Availability aligned for CM-GRAB-01/i)).toBeInTheDocument();
  });

  it("shows the aligned state with a release option for a session this chef has aligned", async () => {
    api.fetchAvailableSessions.mockResolvedValue([
      {
        ...session,
        paymentStatus: "PENDING",
        claimedAt: "2026-09-10T08:00:00.000Z",
      },
    ]);
    api.releaseSessionClaim.mockResolvedValue({
      bookingId: "booking-grabs-1",
      reference: "CM-GRAB-01",
      releasedAt: "2026-09-10T09:00:00.000Z",
      rebroadcastOffers: 3,
    });
    render(<ChefOverview />);

    await screen.findByText("Availability aligned");
    fireEvent.click(screen.getByRole("button", { name: "Release availability" }));
    fireEvent.click(
      screen.getByRole("checkbox", { name: /I confirm I am available to cook this session/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Yes, I confirm — take the session" }));

    await waitFor(() => expect(api.releaseSessionClaim).toHaveBeenCalledWith("booking-grabs-1"));
    expect(await screen.findByText(/Availability released for CM-GRAB-01/i)).toBeInTheDocument();
    expect(screen.getByText(/back out to 3 chefs/i)).toBeInTheDocument();
  });

  it("flags repeat customers with their completed visit count", async () => {
    api.fetchAvailableSessions.mockResolvedValue([{ ...session, repeatVisits: 4 }]);
    render(<ChefOverview />);

    await screen.findByText("Lamb curry and rice");
    expect(screen.getByText(/Repeat customer · 4 completed visits/)).toBeInTheDocument();
  });

  it("warns when a session falls outside the chef's declared availability windows", async () => {
    api.fetchChefProfile.mockResolvedValue({
      ...chefProfile,
      availability: {
        windows: [{ days: ["MON", "TUE"], from: "09:00", to: "17:00" }],
      },
    });
    api.fetchAvailableSessions.mockResolvedValue([session]);
    render(<ChefOverview />);

    await screen.findByText("Lamb curry and rice");
    fireEvent.click(screen.getByRole("button", { name: "Claim this session" }));

    // Session is Friday 18:30 — outside Mon/Tue 09:00-17:00.
    expect(
      await screen.findByText(/This falls outside your declared availability/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Yes, I confirm — take the session" }),
    ).toBeDisabled();
  });

  it("saves availability windows and clicked service areas through the profile editor", async () => {
    api.updateChefProfile.mockResolvedValue(chefProfile);
    const saved = vi.fn();
    render(<ChefProfileEditor onSaved={saved} profile={chefProfile} />);

    // Availability can be changed independently of the other profile fields.
    fireEvent.click(screen.getByRole("checkbox", { name: "Available for new bookings" }));
    expect(screen.getByRole("checkbox", { name: "Available for new bookings" })).not.toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: "Available for new bookings" }));
    expect(screen.getByRole("checkbox", { name: "Available for new bookings" })).toBeChecked();

    // Selecting a region picks every suburb under it, Sandton included.
    fireEvent.click(screen.getByRole("button", { name: /JHB NORTH/ }));

    // Open a window and toggle a weekday.
    fireEvent.click(screen.getByRole("button", { name: "+ Add another window" }));
    fireEvent.click(screen.getByRole("button", { name: "Sat" }));
    const from = screen.getByLabelText("Window 1 start time");
    fireEvent.change(from, { target: { value: "08:00" } });
    const to = screen.getByLabelText("Window 1 end time");
    fireEvent.change(to, { target: { value: "16:00" } });

    fireEvent.click(screen.getByRole("button", { name: "Save profile & availability" }));

    await waitFor(() => expect(api.updateChefProfile).toHaveBeenCalled());
    expect(api.updateChefProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        isAvailable: true,
        serviceAreas: expect.arrayContaining(["Fourways", "Sandton"]),
        availability: {
          notes: "",
          windows: [{ days: ["SAT"], from: "08:00", to: "16:00" }],
        },
      }),
    );
    await waitFor(() => expect(saved).toHaveBeenCalled());
  });

  it("saves bank details through the live profile editor", async () => {
    api.updateChefBankDetails.mockResolvedValue({
      accountHolder: "Test Chef",
      bankName: "Capitec",
      branchCode: "470010",
      accountNumberLast4: "1234",
      accountType: "Savings",
      updatedAt: "2026-09-13T08:00:00.000Z",
    });
    render(<ChefProfileEditor onSaved={vi.fn()} profile={chefProfile} />);

    fireEvent.change(screen.getByLabelText("Account holder"), {
      target: { value: "Test Chef" },
    });
    fireEvent.change(screen.getByLabelText("Bank name"), { target: { value: "Capitec" } });
    fireEvent.change(screen.getByLabelText("Branch code"), { target: { value: "470010" } });
    fireEvent.change(screen.getByLabelText("Account number"), { target: { value: "1234561234" } });
    fireEvent.change(screen.getByLabelText("Account type"), { target: { value: "Savings" } });
    fireEvent.click(screen.getByRole("button", { name: "Save bank details" }));

    await waitFor(() =>
      expect(api.updateChefBankDetails).toHaveBeenCalledWith({
        accountHolder: "Test Chef",
        bankName: "Capitec",
        branchCode: "470010",
        accountNumber: "1234561234",
        accountType: "Savings",
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "✓ Bank details updated successfully!",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Account number")).toHaveTextContent("••••1234");
    expect(screen.getByRole("button", { name: "Change account number" })).toBeInTheDocument();
  });

  it("shows the masked last four digits after a profile reload and only reveals a blank replacement field", () => {
    const profileWithBankAccount = {
      ...chefProfile,
      bankAccount: {
        accountHolder: "Test Chef",
        bankName: "Capitec",
        branchCode: "470010",
        accountNumberLast4: "1234",
        accountType: "Savings",
        updatedAt: "2026-09-13T08:00:00.000Z",
      },
    };
    render(<ChefProfileEditor onSaved={vi.fn()} profile={profileWithBankAccount} />);

    expect(screen.getByLabelText("Account number")).toHaveTextContent("••••1234");
    expect(screen.queryByDisplayValue("1234561234")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Change account number" }));
    expect(screen.getByLabelText("Account number")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Hide account number" })).toBeInTheDocument();
  });
  it("blocks saving until a service area is selected", async () => {
    api.updateChefProfile.mockResolvedValue(chefProfile);
    const profileWithoutAreas = {
      ...chefProfile,
      serviceArea: null,
      serviceAreas: [],
      availability: null,
    };
    render(<ChefProfileEditor onSaved={vi.fn()} profile={profileWithoutAreas} />);

    fireEvent.click(screen.getByRole("button", { name: "Save profile & availability" }));

    expect(
      await screen.findByText("Select at least one service area so we know where you can cook."),
    ).toBeInTheDocument();
    expect(api.updateChefProfile).not.toHaveBeenCalled();
  });
});

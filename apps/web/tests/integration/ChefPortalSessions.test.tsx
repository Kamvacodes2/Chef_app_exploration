import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChefPortalPage } from "@/features/platform/ChefPortalPage";
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
    render(<ChefPortalPage />);

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

  it("warns when a session falls outside the chef's declared availability windows", async () => {
    api.fetchChefProfile.mockResolvedValue({
      ...chefProfile,
      availability: {
        windows: [{ days: ["MON", "TUE"], from: "09:00", to: "17:00" }],
      },
    });
    api.fetchAvailableSessions.mockResolvedValue([session]);
    render(<ChefPortalPage />);

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

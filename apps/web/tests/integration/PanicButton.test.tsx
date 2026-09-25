import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PanicButton } from "@/features/safety/PanicButton";
import * as safetyClient from "@/features/safety/api/safetyClient";

vi.mock("@/features/safety/api/safetyClient", () => ({
  raisePanicAlert: vi.fn(),
  streamPanicLocation: vi.fn(),
  fetchMyOpenAlert: vi.fn().mockResolvedValue(null),
  cancelMyPanicAlert: vi.fn(),
}));

const alertFixture = {
  id: "alert-1",
  status: "ACTIVE" as const,
  source: "CHEF" as const,
  raisedBy: { id: "u1", displayName: "Chef Thando", email: "t@x.test", phone: null },
  booking: null,
  latitude: -26.1,
  longitude: 28.0,
  accuracyMeters: 10,
  note: null,
  firstPingAt: "2026-09-25T09:00:00.000Z",
  lastPingAt: "2026-09-25T09:00:05.000Z",
  acknowledgedAt: null,
  resolvedAt: null,
  mapUrl: "https://www.google.com/maps?q=-26.1,28.0",
  pingCount: 1,
};

const geolocationMock = {
  getCurrentPosition: vi.fn(),
};

beforeEach(() => {
  vi.stubGlobal("navigator", { ...navigator, geolocation: geolocationMock });
  geolocationMock.getCurrentPosition.mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function positionAt(latitude: number, longitude: number): GeolocationPosition {
  return {
    coords: {
      latitude,
      longitude,
      accuracy: 9,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  } as GeolocationPosition;
}

describe("PanicButton", () => {
  it("walks locate → confirm → active and shows the live-tracking panel", async () => {
    const user = userEvent.setup();
    geolocationMock.getCurrentPosition.mockImplementationOnce(
      (success: (p: GeolocationPosition) => void) => success(positionAt(-26.1076, 28.0567)),
    );
    vi.mocked(safetyClient.raisePanicAlert).mockResolvedValueOnce(alertFixture);

    render(<PanicButton />);

    const button = screen.getByRole("button", { name: /panic button/i });
    await user.click(button);
    await user.click(screen.getByRole("button", { name: /send alert/i }));

    await waitFor(() => {
      expect(screen.getByText(/safety alert active/i)).toBeInTheDocument();
    });
    expect(safetyClient.raisePanicAlert).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: -26.1076, longitude: 28.0567, accuracyMeters: 9 }),
      {},
    );
  });

  it("shows a permission-denied message and never sends when location is blocked", async () => {
    const user = userEvent.setup();
    geolocationMock.getCurrentPosition.mockImplementationOnce(
      (_success: unknown, failure: (e: { code: number }) => void) => failure({ code: 1 }),
    );

    render(<PanicButton />);
    await user.click(screen.getByRole("button", { name: /panic button/i }));
    await user.click(screen.getByRole("button", { name: /send alert/i }));

    await waitFor(() => {
      expect(screen.getByText(/location permission was denied/i)).toBeInTheDocument();
    });
    expect(safetyClient.raisePanicAlert).not.toHaveBeenCalled();
    // The panic button returns so the user can retry after enabling permission.
    expect(screen.getByRole("button", { name: /panic button/i })).toBeInTheDocument();
  });

  it("resumes streaming when an alert is already open on load", async () => {
    vi.mocked(safetyClient.fetchMyOpenAlert).mockResolvedValueOnce(alertFixture);

    render(<PanicButton />);

    await waitFor(() => {
      expect(screen.getByText(/safety alert active/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /i'm safe/i })).toBeInTheDocument();
  });

  it("cancels the alert when the user says they are safe", async () => {
    vi.mocked(safetyClient.fetchMyOpenAlert).mockResolvedValueOnce(alertFixture);
    vi.mocked(safetyClient.cancelMyPanicAlert).mockResolvedValueOnce(undefined);

    render(<PanicButton />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /i'm safe/i })).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /i'm safe/i }));

    await waitFor(() => {
      expect(safetyClient.cancelMyPanicAlert).toHaveBeenCalledWith("alert-1");
    });
    expect(screen.getByRole("button", { name: /panic button/i })).toBeInTheDocument();
  });
});

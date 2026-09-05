import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OfferClaimPage } from "@/features/platform/OfferClaimPage";

const fetchMock = vi.hoisted(() => vi.fn());

beforeEach(() => {
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  fetchMock.mockReset();
});

const availableOffer = {
  id: "offer-1",
  status: "PENDING",
  chefPayoutCents: 34310,
  expiresAt: "2026-09-08T14:00:00.000Z",
  booking: {
    id: "booking-1",
    reference: "CM00365",
    mainName: "Lamb curry and rice",
    scheduledDate: "2026-09-08T00:00:00.000Z",
    timeSlot: "14:00",
    serviceArea: "Randburg",
  },
};

describe("OfferClaimPage", () => {
  it("shows the session and chef fee when the link is available, then claims it on accept", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { status: "available", offer: availableOffer } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { status: "claimed", offer: availableOffer } }),
      });

    render(<OfferClaimPage token="some.valid.token.value" />);

    expect(
      await screen.findByRole("heading", { name: /Lamb curry and rice/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/CM00365/)).toBeInTheDocument();
    expect(screen.getByText(/R343/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Accept this session/i }));
    fireEvent.click(
      screen.getByRole("checkbox", { name: /I confirm I am available to cook this session/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Yes, I confirm — take the session" }));
    expect(await screen.findByRole("heading", { name: /Session claimed!/i })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]![0]).toContain(
      "/api/v1/chef/offers/claim/some.valid.token.value",
    );
    expect(fetchMock.mock.calls[1]![1]).toMatchObject({ method: "POST" });
  });

  it("shows the already-accepted message when another chef got the session first", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { status: "accepted", offer: { ...availableOffer, status: "ACCEPTED" } },
      }),
    });

    render(<OfferClaimPage token="some.valid.token.value" />);

    expect(
      await screen.findByRole("heading", { name: /Session already accepted/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Another chef claimed this session first/i)).toBeInTheDocument();
  });

  it("shows the unavailable message for expired or invalid links", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { status: "expired", offer: null } }),
    });

    render(<OfferClaimPage token="some.valid.token.value" />);

    expect(
      await screen.findByRole("heading", { name: /Session unavailable/i }),
    ).toBeInTheDocument();
  });

  it("handles a missing token", async () => {
    render(<OfferClaimPage token={null} />);
    expect(
      await screen.findByRole("heading", { name: /Session unavailable/i }),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("claims with a server-declared claimed response even if the lookup was stale", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { status: "available", offer: availableOffer } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { status: "claimed", offer: availableOffer } }),
      });

    render(<OfferClaimPage token="some.valid.token.value" />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Accept this session/i })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: /Accept this session/i }));
    fireEvent.click(
      screen.getByRole("checkbox", { name: /I confirm I am available to cook this session/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Yes, I confirm — take the session" }));
    expect(await screen.findByRole("heading", { name: /Session claimed!/i })).toBeInTheDocument();
  });
});

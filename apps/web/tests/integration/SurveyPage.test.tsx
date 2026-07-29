import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SurveyPage } from "@/features/survey/SurveyPage";

/**
 * The tokenized survey route is the one existing purpose-bound-token surface in
 * the product (ADR-0007) and had no component coverage at all. These tests pin
 * its load, prefill, validation, submit and failure behaviour against a stubbed
 * `fetch`, complementing the S01 wire-level fixtures in
 * `tests/contract/legacy/survey.contract.test.ts`.
 */

const TOKEN = "survey-token-123";

interface SurveyPayload {
  bookingReference: string;
  recipientRole: "CUSTOMER" | "COOK";
  status: "PENDING" | "COMPLETED" | "EXPIRED";
  expiresAt: string;
  questions: string[];
}

function payload(overrides: Partial<SurveyPayload> = {}): SurveyPayload {
  return {
    bookingReference: "CM-9001",
    recipientRole: "CUSTOMER",
    status: "PENDING",
    expiresAt: "2026-12-31T00:00:00.000Z",
    questions: ["mealRating", "comment"],
    ...overrides,
  };
}

const jsonResponse = (data: SurveyPayload): Response =>
  ({ ok: true, json: () => Promise.resolve({ data }) }) as unknown as Response;

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loading the survey", () => {
  it("shows a loading state before the survey resolves", () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    render(<SurveyPage token={TOKEN} />);

    expect(screen.getByText(/Loading your Chefmate rating/i)).toBeInTheDocument();
  });

  it("renders the customer heading and booking reference once loaded", async () => {
    fetchMock.mockResolvedValue(jsonResponse(payload()));
    render(<SurveyPage token={TOKEN} />);

    expect(await screen.findByRole("heading", { name: "How was your food?" })).toBeInTheDocument();
    expect(screen.getByText(/CM-9001/)).toBeInTheDocument();
  });

  it("uses the chef-facing heading for a COOK recipient", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(payload({ recipientRole: "COOK", questions: ["sessionRating", "comment"] })),
    );
    render(<SurveyPage token={TOKEN} />);

    expect(
      await screen.findByRole("heading", { name: "How did the session go?" }),
    ).toBeInTheDocument();
  });

  it("requests the tokenized survey endpoint", async () => {
    fetchMock.mockResolvedValue(jsonResponse(payload()));
    render(<SurveyPage token={TOKEN} />);

    await screen.findByRole("dialog");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(`/api/v1/surveys/${TOKEN}`);
  });

  it("renders one star rating per non-comment question", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(payload({ questions: ["mealRating", "sessionRating", "comment"] })),
    );
    render(<SurveyPage token={TOKEN} />);

    await screen.findByRole("dialog");
    expect(screen.getAllByRole("radiogroup")).toHaveLength(2);
  });
});

describe("unavailable links", () => {
  it("reports an unavailable survey when the request fails", async () => {
    fetchMock.mockResolvedValue({ ok: false } as unknown as Response);
    render(<SurveyPage token={TOKEN} />);

    expect(await screen.findByRole("heading", { name: "Rating unavailable." })).toBeInTheDocument();
    expect(screen.getByText(/unavailable or has expired/i)).toBeInTheDocument();
  });

  it("treats an already-completed survey as unavailable", async () => {
    fetchMock.mockResolvedValue(jsonResponse(payload({ status: "COMPLETED" })));
    render(<SurveyPage token={TOKEN} />);

    expect(await screen.findByRole("heading", { name: "Rating unavailable." })).toBeInTheDocument();
  });

  it("treats an expired survey as unavailable", async () => {
    fetchMock.mockResolvedValue(jsonResponse(payload({ status: "EXPIRED" })));
    render(<SurveyPage token={TOKEN} />);

    expect(await screen.findByRole("heading", { name: "Rating unavailable." })).toBeInTheDocument();
  });

  it("handles a network rejection without crashing", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    render(<SurveyPage token={TOKEN} />);

    expect(await screen.findByRole("heading", { name: "Rating unavailable." })).toBeInTheDocument();
  });
});

describe("rating prefill from the emailed link", () => {
  it("applies a valid field and rating from the link", async () => {
    fetchMock.mockResolvedValue(jsonResponse(payload()));
    render(<SurveyPage token={TOKEN} initialField="mealRating" initialRating="4" />);

    await screen.findByRole("dialog");
    expect(await screen.findByText("4 out of 5")).toBeInTheDocument();
  });

  it("ignores a rating outside 1-5", async () => {
    fetchMock.mockResolvedValue(jsonResponse(payload()));
    render(<SurveyPage token={TOKEN} initialField="mealRating" initialRating="9" />);

    await screen.findByRole("dialog");
    expect(screen.getByText("Choose a rating")).toBeInTheDocument();
  });

  it("ignores a field the survey does not ask about", async () => {
    fetchMock.mockResolvedValue(jsonResponse(payload()));
    render(<SurveyPage token={TOKEN} initialField="notAQuestion" initialRating="5" />);

    await screen.findByRole("dialog");
    expect(screen.getByText("Choose a rating")).toBeInTheDocument();
  });

  it("ignores a non-numeric rating", async () => {
    fetchMock.mockResolvedValue(jsonResponse(payload()));
    render(<SurveyPage token={TOKEN} initialField="mealRating" initialRating="great" />);

    await screen.findByRole("dialog");
    expect(screen.getByText("Choose a rating")).toBeInTheDocument();
  });
});

describe("submitting a rating", () => {
  it("keeps the submit button disabled until every rating is chosen", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(payload({ questions: ["mealRating", "sessionRating", "comment"] })),
    );
    render(<SurveyPage token={TOKEN} />);

    await screen.findByRole("dialog");
    expect(screen.getByRole("button", { name: "Save rating" })).toBeDisabled();

    fireEvent.click(screen.getAllByRole("button", { name: "Rate 5 out of 5" })[0]!);
    expect(screen.getByRole("button", { name: "Save rating" })).toBeDisabled();

    fireEvent.click(screen.getAllByRole("button", { name: "Rate 3 out of 5" })[1]!);
    expect(screen.getByRole("button", { name: "Save rating" })).toBeEnabled();
  });

  it("posts the numeric ratings and a trimmed comment", async () => {
    fetchMock.mockResolvedValue(jsonResponse(payload()));
    render(<SurveyPage token={TOKEN} />);

    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Rate 4 out of 5" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "  Lovely evening  " } });

    fetchMock.mockResolvedValueOnce({ ok: true } as unknown as Response);
    fireEvent.click(screen.getByRole("button", { name: "Save rating" }));

    await screen.findByRole("heading", { name: "Thank you." });

    const post = fetchMock.mock.calls.find((call) => call[1]?.method === "POST");
    expect(post).toBeDefined();
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      mealRating: 4,
      comment: "Lovely evening",
    });
  });

  it("sends a null comment when the box is left empty", async () => {
    fetchMock.mockResolvedValue(jsonResponse(payload()));
    render(<SurveyPage token={TOKEN} />);

    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Rate 2 out of 5" }));

    fetchMock.mockResolvedValueOnce({ ok: true } as unknown as Response);
    fireEvent.click(screen.getByRole("button", { name: "Save rating" }));

    await screen.findByRole("heading", { name: "Thank you." });
    const post = fetchMock.mock.calls.find((call) => call[1]?.method === "POST");
    expect(JSON.parse(String(post?.[1]?.body)).comment).toBeNull();
  });

  it("surfaces a recoverable error when the submission fails", async () => {
    fetchMock.mockResolvedValue(jsonResponse(payload()));
    render(<SurveyPage token={TOKEN} />);

    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Rate 5 out of 5" }));

    fetchMock.mockResolvedValueOnce({ ok: false } as unknown as Response);
    fireEvent.click(screen.getByRole("button", { name: "Save rating" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/could not save your feedback/i);
    });
    // The form stays usable so the customer can retry.
    expect(screen.getByRole("button", { name: "Save rating" })).toBeEnabled();
  });
});

describe("star rating control", () => {
  it("marks the selected star as pressed and reports the value", async () => {
    fetchMock.mockResolvedValue(jsonResponse(payload()));
    render(<SurveyPage token={TOKEN} />);

    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Rate 3 out of 5" }));

    expect(screen.getByRole("button", { name: "Rate 3 out of 5" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Rate 5 out of 5" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByText("3 out of 5")).toBeInTheDocument();
  });

  it("lets the rating be changed before submitting", async () => {
    fetchMock.mockResolvedValue(jsonResponse(payload()));
    render(<SurveyPage token={TOKEN} />);

    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Rate 1 out of 5" }));
    fireEvent.click(screen.getByRole("button", { name: "Rate 5 out of 5" }));

    expect(screen.getByText("5 out of 5")).toBeInTheDocument();
  });
});

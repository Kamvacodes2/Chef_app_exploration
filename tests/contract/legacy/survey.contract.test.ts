import { createElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SurveyPage } from "@/features/survey/SurveyPage";
import { fakeResponse, recordedCall } from "./support/fakeFetch";
import { LEGACY_BASE_URL, LEGACY_SURVEY_TOKEN, legacySurveyResponse } from "./support/fixtures";

/**
 * Legacy contracts 10-11: GET /api/v1/surveys/{token} and
 * POST /api/v1/surveys/{token}.
 *
 * Provider status: consumer expectation only (D001). The survey client lives
 * inside the page component, sends the token in the path, sends NO credentials,
 * and collapses every failure mode - transport error, non-2xx, and a non-PENDING
 * status - into one message.
 */
const UNAVAILABLE = "This survey link is unavailable or has expired.";

function stubSurveyFetch(responder: (input: string, init?: RequestInit) => Promise<Response>) {
  vi.stubEnv("NEXT_PUBLIC_CHEFMATE_API_URL", LEGACY_BASE_URL);
  const fetchMock = vi.fn(responder);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("legacy contract: survey", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("pins the survey retrieval request: token in path, no credentials, abortable", async () => {
    const fetchMock = stubSurveyFetch(async () => fakeResponse({ body: legacySurveyResponse }));

    render(createElement(SurveyPage, { token: LEGACY_SURVEY_TOKEN }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const { url, init } = recordedCall(fetchMock);
    expect(url).toBe("http://chefmate-api.test/api/v1/surveys/synthetic-survey-token-0000");
    expect(init?.method).toBeUndefined();
    expect(init?.credentials).toBeUndefined();
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("URL-encodes the token path segment", async () => {
    const fetchMock = stubSurveyFetch(async () => fakeResponse({ body: legacySurveyResponse }));

    render(createElement(SurveyPage, { token: "token/with spaces" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(recordedCall(fetchMock).url).toBe(
      "http://chefmate-api.test/api/v1/surveys/token%2Fwith%20spaces",
    );
  });

  it("renders the COOK-role survey heading from the legacy recipientRole value", async () => {
    stubSurveyFetch(async () => fakeResponse({ body: legacySurveyResponse }));

    render(createElement(SurveyPage, { token: LEGACY_SURVEY_TOKEN }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "How did the session go?" })).toBeInTheDocument(),
    );
  });

  it("collapses a non-2xx retrieval into the single unavailable message", async () => {
    stubSurveyFetch(async () =>
      fakeResponse({ status: 404, body: { message: "This detail is discarded" } }),
    );

    render(createElement(SurveyPage, { token: LEGACY_SURVEY_TOKEN }));

    await waitFor(() => expect(screen.getByText(UNAVAILABLE)).toBeInTheDocument());
  });

  it("collapses a COMPLETED or EXPIRED survey into the same unavailable message", async () => {
    for (const status of ["COMPLETED", "EXPIRED"] as const) {
      stubSurveyFetch(async () =>
        fakeResponse({ body: { data: { ...legacySurveyResponse.data, status } } }),
      );

      const view = render(createElement(SurveyPage, { token: LEGACY_SURVEY_TOKEN }));
      await waitFor(() => expect(screen.getByText(UNAVAILABLE)).toBeInTheDocument());
      view.unmount();
      vi.unstubAllGlobals();
    }
  });

  it("collapses a transport failure into the same unavailable message", async () => {
    stubSurveyFetch(async () => {
      throw new TypeError("Failed to fetch");
    });

    render(createElement(SurveyPage, { token: LEGACY_SURVEY_TOKEN }));

    await waitFor(() => expect(screen.getByText(UNAVAILABLE)).toBeInTheDocument());
  });

  it("pins the survey submission wire shape: JSON body of ratings plus comment, no credentials", async () => {
    const fetchMock = stubSurveyFetch(async (_input, init) =>
      init?.method === "POST"
        ? fakeResponse({ status: 204 })
        : fakeResponse({ body: legacySurveyResponse }),
    );

    render(createElement(SurveyPage, { token: LEGACY_SURVEY_TOKEN }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "How did the session go?" })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Rate 4 out of 5" }));
    fireEvent.click(screen.getByRole("button", { name: /save rating/i }));

    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1));
    const { url, init } = recordedCall(fetchMock, 1);
    expect(url).toBe("http://chefmate-api.test/api/v1/surveys/synthetic-survey-token-0000");
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBeUndefined();
    expect(init?.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(String(init?.body))).toEqual({ sessionRating: 4, comment: null });
  });

  it("uses a distinct message when submission fails", async () => {
    stubSurveyFetch(async (_input, init) =>
      init?.method === "POST"
        ? fakeResponse({ status: 500 })
        : fakeResponse({ body: legacySurveyResponse }),
    );

    render(createElement(SurveyPage, { token: LEGACY_SURVEY_TOKEN }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "How did the session go?" })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Rate 4 out of 5" }));
    fireEvent.click(screen.getByRole("button", { name: /save rating/i }));

    await waitFor(() =>
      expect(
        screen.getByText("We could not save your feedback. Please try again."),
      ).toBeInTheDocument(),
    );
  });
});

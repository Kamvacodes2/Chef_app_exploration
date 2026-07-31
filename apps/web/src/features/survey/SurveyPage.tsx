"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactElement } from "react";
import { getChefmateApiUrl } from "@/lib/env";

// This survey payload is fetched directly (no zod schema, no `platformRoleSchema`
// normalization) from a separate, unauthenticated tokenized survey endpoint, so
// it is not guaranteed to have passed through the platformClient compatibility
// layer. "COOK" is kept here defensively as a legacy fallback value the backend
// may still literally send on this independent path.
type SurveyRole = "CUSTOMER" | "CHEF" | "COOK";

interface SurveyDetails {
  readonly bookingReference: string;
  readonly recipientRole: SurveyRole;
  readonly status: "PENDING" | "COMPLETED" | "EXPIRED";
  readonly expiresAt: string;
  readonly questions: readonly string[];
}

interface StarRatingProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
}

const QUESTION_LABELS: Record<string, string> = {
  mealRating: "How was your food?",
  sessionRating: "How did the session go?",
};

function surveyUrl(token: string): string {
  return getChefmateApiUrl() + "/api/v1/surveys/" + encodeURIComponent(token);
}

function unavailableMessage(): string {
  return "This survey link is unavailable or has expired.";
}

function StarRating({ label, value, onChange }: StarRatingProps): ReactElement {
  const selectedRating = Number(value);

  return (
    <fieldset className="flex flex-col items-center gap-3">
      <legend className="font-display text-2xl text-[var(--color-oxblood)]">{label}</legend>
      <div className="flex items-center justify-center gap-1" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((rating) => {
          const selected = rating <= selectedRating;
          return (
            <button
              key={rating}
              type="button"
              onClick={() => onChange(String(rating))}
              aria-label={"Rate " + rating + " out of 5"}
              aria-pressed={rating === selectedRating}
              title={"Rate " + rating + " out of 5"}
              className={
                "flex h-12 w-12 items-center justify-center text-4xl leading-none transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-oxblood)] " +
                (selected ? "text-[var(--color-maize)]" : "text-[var(--color-oxblood)]/20")
              }
            >
              <span aria-hidden="true">{selected ? "\u2605" : "\u2606"}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-oxblood)]/55">
        {value ? value + " out of 5" : "Choose a rating"}
      </p>
    </fieldset>
  );
}

export function SurveyPage({
  token,
  initialField,
  initialRating,
}: {
  readonly token: string;
  readonly initialField?: string;
  readonly initialRating?: string;
}): ReactElement {
  const [details, setDetails] = useState<SurveyDetails | null>(null);
  const [ratings, setRatings] = useState<Record<string, string>>({});
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prefillApplied = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    async function load(): Promise<void> {
      try {
        const response = await fetch(surveyUrl(token), { signal: controller.signal });
        if (!response.ok) throw new Error("survey_unavailable");
        const payload = (await response.json()) as { data: SurveyDetails };
        if (payload.data.status !== "PENDING") throw new Error("survey_unavailable");
        setDetails(payload.data);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error && loadError.message === "survey_unavailable"
              ? unavailableMessage()
              : unavailableMessage(),
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [token]);

  useEffect(() => {
    if (!details || prefillApplied.current) return;
    prefillApplied.current = true;
    const rating = Number(initialRating);
    if (
      !initialField ||
      !details.questions.includes(initialField) ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return;
    }
    setRatings((current) => ({ ...current, [initialField]: String(rating) }));
  }, [details, initialField, initialRating]);

  const ratingQuestions = useMemo(
    () => details?.questions.filter((question) => question !== "comment") ?? [],
    [details],
  );
  const canSubmit = useMemo(
    () =>
      Boolean(
        details &&
        ratingQuestions.every(
          (question) => ratings[question] && !Number.isNaN(Number(ratings[question])),
        ),
      ),
    [details, ratingQuestions, ratings],
  );
  const heading = ["CHEF", "COOK"].includes(details?.recipientRole ?? "CUSTOMER")
    ? "How did the session go?"
    : "How was your food?";

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!details || !canSubmit || submitting) return;

    setSubmitting(true);
    setError(null);
    const response: Record<string, number | string | null> = {};
    for (const question of ratingQuestions) {
      response[question] = Number(ratings[question]);
    }
    response.comment = comment.trim() || null;

    try {
      const request = await fetch(surveyUrl(token), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(response),
      });
      if (!request.ok) throw new Error("survey_submit_failed");
      setSubmitted(true);
    } catch {
      setError("We could not save your feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[var(--color-oxblood)] px-5 text-center text-[var(--color-bone)]">
        <p className="text-sm font-semibold">Loading your Chefmate rating...</p>
      </main>
    );
  }

  if (error && !details) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[var(--color-oxblood)] px-5 text-center text-[var(--color-bone)]">
        <div className="max-w-md">
          <p className="font-brand text-3xl">chefmate</p>
          <h1 className="mt-8 font-display text-3xl">Rating unavailable.</h1>
          <p className="mt-3 text-sm text-[var(--color-bone)]/75">{error}</p>
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[var(--color-oxblood)] px-5 text-center text-[var(--color-bone)]">
        <div className="max-w-md">
          <p className="font-brand text-3xl">chefmate</p>
          <h1 className="mt-8 font-display text-3xl">Thank you.</h1>
          <p className="mt-3 text-sm text-[var(--color-bone)]/75">Your rating has been received.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--color-oxblood)] px-5 py-10 sm:px-8">
      <div className="w-full max-w-md">
        <p className="mb-6 text-center font-brand text-3xl text-[var(--color-bone)]">chefmate</p>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="survey-title"
          className="border border-[var(--color-bone)]/15 bg-[var(--color-bone)] px-5 py-7 text-[var(--color-oxblood)] shadow-xl sm:px-8"
        >
          <p className="text-center text-xs font-bold uppercase tracking-wider text-[var(--color-oxblood)]/60">
            Order {details?.bookingReference}
          </p>
          <h1 id="survey-title" className="mt-2 text-center font-display text-3xl">
            {heading}
          </h1>

          <form className="mt-8 flex flex-col gap-7" onSubmit={(event) => void submit(event)}>
            {ratingQuestions.map((question) => (
              <StarRating
                key={question}
                label={QUESTION_LABELS[question] ?? heading}
                value={ratings[question] ?? ""}
                onChange={(value) => setRatings((current) => ({ ...current, [question]: value }))}
              />
            ))}

            <label className="flex flex-col gap-2 text-sm font-semibold">
              Anything else?{" "}
              <span className="font-normal text-[var(--color-oxblood)]/55">(optional)</span>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                maxLength={2000}
                rows={4}
                className="resize-y border border-[var(--color-oxblood)]/25 bg-[var(--color-warm-white)] p-3 text-sm text-[var(--color-oxblood)] outline-none focus:border-[var(--color-oxblood)] focus:ring-2 focus:ring-[var(--color-maize)]"
              />
            </label>

            {error ? (
              <p role="alert" className="text-sm font-semibold text-[var(--color-oxblood)]">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="h-12 bg-[var(--color-oxblood)] px-5 font-display text-sm text-[var(--color-bone)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? "Saving..." : "Save rating"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

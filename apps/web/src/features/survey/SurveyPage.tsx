"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactElement } from "react";
import { getChefmateApiUrl } from "@/lib/env";
import {
  CUSTOMER_REVIEW_TAGS,
  CHEF_SESSION_TAGS,
  type CustomerSurveySubmission,
  type CookSurveySubmission,
  type SurveyMediaItem,
  type SurveyRole,
  type SurveyCompletionStatus,
  type SurveyIngredientStatus,
  type SurveySpicePreference,
  type SurveyCleaningExpectation,
} from "./surveyTypes";
import { MediaUploader, type AttachedMedia } from "../testimonials/MediaUploader";

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
  readonly size?: "lg" | "sm";
  readonly helperText?: string;
  readonly ariaLabelPrefix?: string;
  readonly layout?: "stacked" | "row";
}

const QUESTION_LABELS: Record<string, string> = {
  mealRating: "How was your food?",
  sessionRating: "How did the session go?",
};

function surveyUrl(token: string): string {
  return getChefmateApiUrl() + "/api/v1/surveys/" + encodeURIComponent(token);
}

function uploadMediaUrl(): string {
  return getChefmateApiUrl() + "/api/v1/testimonials/upload-media";
}

function unavailableMessage(): string {
  return "This survey link is unavailable or has expired.";
}

function StarRating({
  label,
  value,
  onChange,
  size = "lg",
  helperText,
  ariaLabelPrefix,
  layout = size === "lg" ? "stacked" : "row",
}: StarRatingProps): ReactElement {
  const selectedRating = Number(value);
  const isLarge = size === "lg";
  const isRow = layout === "row";

  if (isRow) {
    return (
      <div className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between first:pt-1 last:pb-1">
        <div>
          <span className="text-sm font-semibold text-[var(--color-oxblood)]">{label}</span>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1.5"
            {...(isLarge ? { role: "radiogroup", "aria-label": label } : { "aria-label": label })}
          >
            {[1, 2, 3, 4, 5].map((rating) => {
              const selected = rating <= selectedRating;
              const buttonAriaLabel = ariaLabelPrefix
                ? `${ariaLabelPrefix} ${rating} out of 5`
                : `Rate ${rating} out of 5`;
              return (
                <button
                  key={rating}
                  type="button"
                  onClick={() => onChange(String(rating))}
                  aria-label={buttonAriaLabel}
                  aria-pressed={rating === selectedRating}
                  title={buttonAriaLabel}
                  className={
                    "flex h-9 w-9 items-center justify-center text-2xl leading-none transition-transform hover:scale-115 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-oxblood)] " +
                    (selected ? "text-[var(--color-maize)]" : "text-[var(--color-oxblood)]/20")
                  }
                >
                  <span aria-hidden="true">{selected ? "\u2605" : "\u2606"}</span>
                </button>
              );
            })}
          </div>
          <span className="min-w-[70px] text-right text-xs font-semibold uppercase tracking-wider text-[var(--color-oxblood)]/55">
            {value ? `${value} out of 5` : (helperText ?? "Optional")}
          </span>
        </div>
      </div>
    );
  }

  return (
    <fieldset className="flex flex-col items-center gap-2">
      <legend
        className={
          isLarge
            ? "font-display text-2xl text-[var(--color-oxblood)]"
            : "text-sm font-semibold text-[var(--color-oxblood)]"
        }
      >
        {label}
      </legend>
      <div
        className="flex items-center justify-center gap-1"
        {...(isLarge ? { role: "radiogroup", "aria-label": label } : { "aria-label": label })}
      >
        {[1, 2, 3, 4, 5].map((rating) => {
          const selected = rating <= selectedRating;
          const buttonAriaLabel = ariaLabelPrefix
            ? `${ariaLabelPrefix} ${rating} out of 5`
            : `Rate ${rating} out of 5`;
          return (
            <button
              key={rating}
              type="button"
              onClick={() => onChange(String(rating))}
              aria-label={buttonAriaLabel}
              aria-pressed={rating === selectedRating}
              title={buttonAriaLabel}
              className={
                "flex items-center justify-center leading-none transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-oxblood)] " +
                (isLarge ? "h-12 w-12 text-4xl " : "h-8 w-8 text-2xl ") +
                (selected ? "text-[var(--color-maize)]" : "text-[var(--color-oxblood)]/20")
              }
            >
              <span aria-hidden="true">{selected ? "\u2605" : "\u2606"}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-oxblood)]/55">
        {value ? value + " out of 5" : (helperText ?? (isLarge ? "Choose a rating" : "Optional"))}
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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Customer specific states
  const [cleaningRating, setCleaningRating] = useState<string>("");
  const [punctualityRating, setPunctualityRating] = useState<string>("");
  const [overallRating, setOverallRating] = useState<string>("");
  const [photos, setPhotos] = useState<AttachedMedia[]>([]);
  const [video, setVideo] = useState<AttachedMedia | null>(null);
  const [socialConsent, setSocialConsent] = useState(false);
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerRole, setReviewerRole] = useState("");
  const [reviewerLocation, setReviewerLocation] = useState("");

  // Chef specific states
  const [customerRating, setCustomerRating] = useState<string>("");
  const [sessionCompleted, setSessionCompleted] = useState<SurveyCompletionStatus | "">("");
  const [mealsCompleted, setMealsCompleted] = useState<SurveyCompletionStatus | "">("");
  const [cleaningCompleted, setCleaningCompleted] = useState<SurveyCompletionStatus | "">("");
  const [ingredientsAvailable, setIngredientsAvailable] = useState<SurveyIngredientStatus | "">("");
  const [ingredientNotes, setIngredientNotes] = useState("");
  const [spicePreference, setSpicePreference] = useState<SurveySpicePreference | "">("");
  const [allergyOrDietaryNotes, setAllergyOrDietaryNotes] = useState("");
  const [customerPreferenceNotes, setCustomerPreferenceNotes] = useState("");
  const [cleaningExpectationLevel, setCleaningExpectationLevel] = useState<
    SurveyCleaningExpectation | ""
  >("");
  const [cleaningNotes, setCleaningNotes] = useState("");
  const [kitchenAccessNotes, setKitchenAccessNotes] = useState("");
  const [parkingAccessNotes, setParkingAccessNotes] = useState("");
  const [safetyConcerns, setSafetyConcerns] = useState(false);
  const [safetyDetails, setSafetyDetails] = useState("");
  const [supportFollowUpRequired, setSupportFollowUpRequired] = useState(false);
  const [nextChefNotes, setNextChefNotes] = useState("");

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

  const isChef = ["CHEF", "COOK"].includes(details?.recipientRole ?? "CUSTOMER");
  const heading = isChef ? "How did the session go?" : "How was your food?";

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
    );
  };

  async function uploadMediaFile(file: File): Promise<SurveyMediaItem> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(uploadMediaUrl(), {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error("Failed to upload " + file.name);
    const json = (await response.json()) as { data: SurveyMediaItem };
    return json.data;
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!details || !canSubmit || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const firstQuestion = ratingQuestions[0];
      const fallbackRating = firstQuestion ? ratings[firstQuestion] : undefined;

      if (isChef) {
        // Build cook survey payload
        const response: CookSurveySubmission = {
          sessionRating: Number(ratings.sessionRating ?? fallbackRating ?? 5),
          comment: comment.trim() || null,
        };

        if (customerRating && !Number.isNaN(Number(customerRating))) {
          response.customerRating = Number(customerRating);
        }
        if (sessionCompleted) response.sessionCompleted = sessionCompleted;
        if (mealsCompleted) response.mealsCompleted = mealsCompleted;
        if (cleaningCompleted) response.cleaningCompleted = cleaningCompleted;
        if (ingredientsAvailable) response.ingredientsAvailable = ingredientsAvailable;
        if (ingredientNotes.trim()) response.ingredientNotes = ingredientNotes.trim();
        if (spicePreference) response.spicePreference = spicePreference;
        if (allergyOrDietaryNotes.trim())
          response.allergyOrDietaryNotes = allergyOrDietaryNotes.trim();
        if (customerPreferenceNotes.trim())
          response.customerPreferenceNotes = customerPreferenceNotes.trim();
        if (cleaningExpectationLevel) response.cleaningExpectationLevel = cleaningExpectationLevel;
        if (cleaningNotes.trim()) response.cleaningNotes = cleaningNotes.trim();
        if (kitchenAccessNotes.trim()) response.kitchenAccessNotes = kitchenAccessNotes.trim();
        if (parkingAccessNotes.trim()) response.parkingAccessNotes = parkingAccessNotes.trim();
        if (safetyConcerns) {
          response.safetyConcerns = true;
          if (safetyDetails.trim()) response.safetyDetails = safetyDetails.trim();
        }
        if (supportFollowUpRequired) response.supportFollowUpRequired = true;
        if (nextChefNotes.trim()) response.nextChefNotes = nextChefNotes.trim();
        if (selectedTags.length > 0) response.tags = selectedTags;

        const request = await fetch(surveyUrl(token), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(response),
        });
        if (!request.ok) throw new Error("survey_submit_failed");
      } else {
        // Upload any media files first
        let uploadedMedia: SurveyMediaItem[] | undefined;
        const allFiles: File[] = [];
        photos.forEach((p) => allFiles.push(p.file));
        if (video) allFiles.push(video.file);

        if (allFiles.length > 0) {
          uploadedMedia = [];
          for (const file of allFiles) {
            const item = await uploadMediaFile(file);
            uploadedMedia.push(item);
          }
        }

        // Build customer survey payload
        const response: CustomerSurveySubmission = {
          mealRating: Number(ratings.mealRating ?? fallbackRating ?? 5),
          comment: comment.trim() || null,
        };

        if (cleaningRating && !Number.isNaN(Number(cleaningRating))) {
          response.cleaningRating = Number(cleaningRating);
        }
        if (punctualityRating && !Number.isNaN(Number(punctualityRating))) {
          response.punctualityRating = Number(punctualityRating);
        }
        if (overallRating && !Number.isNaN(Number(overallRating))) {
          response.overallRating = Number(overallRating);
        }
        if (selectedTags.length > 0) response.tags = selectedTags;
        if (uploadedMedia && uploadedMedia.length > 0) response.media = uploadedMedia;
        if (socialConsent) response.socialConsent = true;
        if (reviewerName.trim()) response.reviewerName = reviewerName.trim();
        if (reviewerRole.trim()) response.reviewerRole = reviewerRole.trim();
        if (reviewerLocation.trim()) response.reviewerLocation = reviewerLocation.trim();

        const request = await fetch(surveyUrl(token), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(response),
        });
        if (!request.ok) throw new Error("survey_submit_failed");
      }

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
          <p className="mt-3 text-sm text-[var(--color-bone)]/75">
            Your rating and feedback have been recorded.
          </p>
        </div>
      </main>
    );
  }

  const tagsList = isChef ? CHEF_SESSION_TAGS : CUSTOMER_REVIEW_TAGS;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--color-oxblood)] px-4 py-10 sm:px-8">
      <div className="w-full max-w-xl">
        <p className="mb-6 text-center font-brand text-3xl text-[var(--color-bone)]">chefmate</p>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="survey-title"
          className="rounded-2xl border border-[var(--color-bone)]/15 bg-[var(--color-bone)] px-5 py-8 text-[var(--color-oxblood)] shadow-2xl sm:px-8"
        >
          <p className="text-center text-xs font-bold uppercase tracking-wider text-[var(--color-oxblood)]/60">
            Order {details?.bookingReference}
          </p>
          <h1 id="survey-title" className="mt-2 text-center font-display text-3xl">
            {heading}
          </h1>

          <form className="mt-8 flex flex-col gap-8" onSubmit={(event) => void submit(event)}>
            {/* Primary Rating Question(s) */}
            {ratingQuestions.map((question) => (
              <StarRating
                key={question}
                label={QUESTION_LABELS[question] ?? heading}
                value={ratings[question] ?? ""}
                onChange={(value) => setRatings((current) => ({ ...current, [question]: value }))}
              />
            ))}

            {/* Quick Selection Tag Propositions */}
            <div className="space-y-2">
              <label className="block text-center text-xs font-bold uppercase tracking-wider text-[var(--color-oxblood)]/70">
                {isChef ? "Session Highlights" : "What made this experience stand out?"}
              </label>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {tagsList.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      aria-pressed={isSelected}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                        isSelected
                          ? "bg-[var(--color-oxblood)] text-[var(--color-bone)] shadow-sm scale-105"
                          : "border border-[var(--color-oxblood)]/20 bg-white text-[var(--color-oxblood)]/80 hover:border-[var(--color-oxblood)]/50"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── CUSTOMER EXTENDED RATINGS & TESTIMONIAL ── */}
            {!isChef && (
              <div className="space-y-6 rounded-xl border border-[var(--color-oxblood)]/10 bg-white/70 p-5 shadow-sm sm:p-7">
                <div>
                  <p className="font-display text-lg text-[var(--color-oxblood)]">
                    Detailed Experience{" "}
                    <span className="text-xs font-normal text-stone-500">(Optional)</span>
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    Rate specific parts of your booking to celebrate what your chef did best.
                  </p>
                </div>

                <div className="flex flex-col divide-y divide-[var(--color-oxblood)]/10 rounded-xl border border-stone-200/80 bg-white px-4 py-1">
                  <StarRating
                    label="Cleanliness"
                    value={cleaningRating}
                    onChange={setCleaningRating}
                    size="sm"
                    layout="row"
                    ariaLabelPrefix="Rate Cleanliness"
                  />
                  <StarRating
                    label="Punctuality"
                    value={punctualityRating}
                    onChange={setPunctualityRating}
                    size="sm"
                    layout="row"
                    ariaLabelPrefix="Rate Punctuality"
                  />
                  <StarRating
                    label="Overall"
                    value={overallRating}
                    onChange={setOverallRating}
                    size="sm"
                    layout="row"
                    ariaLabelPrefix="Rate Overall"
                  />
                </div>

                {/* Media Uploader */}
                <div className="pt-2">
                  <MediaUploader
                    photos={photos}
                    video={video}
                    onPhotosChange={setPhotos}
                    onVideoChange={setVideo}
                    disabled={submitting}
                  />
                </div>

                {/* Social Consent and Name */}
                <div className="space-y-3 pt-2">
                  <label className="flex items-start gap-3 cursor-pointer text-xs font-medium text-stone-700">
                    <input
                      type="checkbox"
                      checked={socialConsent}
                      onChange={(e) => setSocialConsent(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-stone-300 text-[var(--color-oxblood)] focus:ring-[var(--color-oxblood)]"
                    />
                    <span>
                      I give Chefmate permission to feature my story, photos, or video on Chefmate
                      stories and marketing.
                    </span>
                  </label>

                  {socialConsent && (
                    <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-3">
                      <div>
                        <label className="block text-xs font-semibold text-stone-700">
                          Your Name
                        </label>
                        <input
                          type="text"
                          value={reviewerName}
                          onChange={(e) => setReviewerName(e.target.value)}
                          placeholder="e.g. Sindi M."
                          className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-2 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-[var(--color-oxblood)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-stone-700">
                          Occasion / Role
                        </label>
                        <input
                          type="text"
                          value={reviewerRole}
                          onChange={(e) => setReviewerRole(e.target.value)}
                          placeholder="e.g. Birthday Host"
                          className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-2 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-[var(--color-oxblood)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-stone-700">
                          Location
                        </label>
                        <input
                          type="text"
                          value={reviewerLocation}
                          onChange={(e) => setReviewerLocation(e.target.value)}
                          placeholder="e.g. Rosebank, JHB"
                          className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-2 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-[var(--color-oxblood)]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── CHEF STRUCTURED SESSION & CUSTOMER KNOWLEDGE ── */}
            {isChef && (
              <div className="space-y-6 rounded-xl border border-[var(--color-oxblood)]/10 bg-white/70 p-5 shadow-sm sm:p-7">
                <p className="font-display text-lg text-[var(--color-oxblood)]">
                  Session & Customer Intelligence
                </p>

                {/* Customer Rating */}
                <div className="rounded-xl border border-stone-200/80 bg-white px-4 py-1">
                  <StarRating
                    label="Customer / Host Rating"
                    value={customerRating}
                    onChange={setCustomerRating}
                    size="sm"
                    layout="row"
                    ariaLabelPrefix="Rate Customer / Host"
                  />
                </div>

                {/* Completion Status Pills */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      Session Completed?
                    </label>
                    <div className="flex gap-2">
                      {(["YES", "PARTIAL", "NO"] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() =>
                            setSessionCompleted((cur) => (cur === status ? "" : status))
                          }
                          className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                            sessionCompleted === status
                              ? "bg-[var(--color-oxblood)] text-white"
                              : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                          }`}
                        >
                          {status === "YES" ? "Yes" : status === "PARTIAL" ? "Partial" : "No"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      All Meals Cooked?
                    </label>
                    <div className="flex gap-2">
                      {(["YES", "PARTIAL", "NO"] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setMealsCompleted((cur) => (cur === status ? "" : status))}
                          className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                            mealsCompleted === status
                              ? "bg-[var(--color-oxblood)] text-white"
                              : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                          }`}
                        >
                          {status === "YES" ? "Yes" : status === "PARTIAL" ? "Partial" : "No"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      Kitchen Cleaned?
                    </label>
                    <div className="flex gap-2">
                      {(["YES", "PARTIAL", "NO"] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() =>
                            setCleaningCompleted((cur) => (cur === status ? "" : status))
                          }
                          className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                            cleaningCompleted === status
                              ? "bg-[var(--color-oxblood)] text-white"
                              : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                          }`}
                        >
                          {status === "YES" ? "Yes" : status === "PARTIAL" ? "Partial" : "No"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      Ingredients Ready?
                    </label>
                    <div className="flex gap-2">
                      {(["YES", "SOME_MISSING", "NO"] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() =>
                            setIngredientsAvailable((cur) => (cur === status ? "" : status))
                          }
                          className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                            ingredientsAvailable === status
                              ? "bg-[var(--color-oxblood)] text-white"
                              : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                          }`}
                        >
                          {status === "YES"
                            ? "All Ready"
                            : status === "SOME_MISSING"
                              ? "Missing Some"
                              : "No"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Dietary & Spice Preferences */}
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      Customer Spice Preference
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(["MILD", "MEDIUM", "HOT", "NO_SPICE"] as const).map((spice) => (
                        <button
                          key={spice}
                          type="button"
                          onClick={() => setSpicePreference((cur) => (cur === spice ? "" : spice))}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            spicePreference === spice
                              ? "bg-[var(--color-oxblood)] text-white"
                              : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                          }`}
                        >
                          {spice === "NO_SPICE"
                            ? "No Spice"
                            : spice.charAt(0) + spice.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700">
                      Dietary or Allergy Discoveries (to inform next chefs)
                    </label>
                    <input
                      type="text"
                      value={allergyOrDietaryNotes}
                      onChange={(e) => setAllergyOrDietaryNotes(e.target.value)}
                      placeholder="e.g. Host mentioned mild lactose sensitivity"
                      className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-2 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-[var(--color-oxblood)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700">
                      Kitchen & Equipment Notes
                    </label>
                    <input
                      type="text"
                      value={kitchenAccessNotes}
                      onChange={(e) => setKitchenAccessNotes(e.target.value)}
                      placeholder="e.g. Gas stove, sharp knives provided, extra pans in lower drawer"
                      className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-2 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-[var(--color-oxblood)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700">
                      Pro-Tips for Next Assigned Chef
                    </label>
                    <input
                      type="text"
                      value={nextChefNotes}
                      onChange={(e) => setNextChefNotes(e.target.value)}
                      placeholder="e.g. Prefer plating at the dining table; loved dessert presentation"
                      className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-2 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-[var(--color-oxblood)]"
                    />
                  </div>

                  {/* Safety Alert Toggle */}
                  <label className="flex items-center gap-3 cursor-pointer pt-2 text-xs font-semibold text-stone-700">
                    <input
                      type="checkbox"
                      checked={safetyConcerns}
                      onChange={(e) => setSafetyConcerns(e.target.checked)}
                      className="h-4 w-4 rounded border-stone-300 text-red-600 focus:ring-red-500"
                    />
                    <span>Report safety / access concern for platform review</span>
                  </label>

                  {safetyConcerns && (
                    <textarea
                      value={safetyDetails}
                      onChange={(e) => setSafetyDetails(e.target.value)}
                      placeholder="Please describe the safety concern in detail..."
                      rows={2}
                      className="mt-2 w-full rounded-lg border border-red-300 bg-white p-2 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  )}
                </div>
              </div>
            )}

            {/* General Free-Form Comment */}
            <label className="flex flex-col gap-2 text-sm font-semibold">
              Anything else?{" "}
              <span className="font-normal text-[var(--color-oxblood)]/55">(optional)</span>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                maxLength={2000}
                rows={3}
                placeholder={
                  isChef
                    ? "Additional notes about the visit..."
                    : "Tell us about the flavours, dishes, or special moments..."
                }
                className="resize-y rounded-xl border border-[var(--color-oxblood)]/25 bg-[var(--color-warm-white)] p-3 text-sm text-[var(--color-oxblood)] outline-none focus:border-[var(--color-oxblood)] focus:ring-2 focus:ring-[var(--color-maize)]"
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
              className="h-12 rounded-xl bg-[var(--color-oxblood)] px-5 font-display text-sm text-[var(--color-bone)] transition-opacity hover:bg-[var(--color-oxblood)]/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? "Saving..." : "Save rating"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

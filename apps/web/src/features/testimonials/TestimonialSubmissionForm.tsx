"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MediaUploader, type AttachedMedia } from "./MediaUploader";
import { submitTestimonialWithProgress } from "./api/testimonialClient";

const RATING_DESCRIPTIONS: Record<number, string> = {
  1: "Disappointing",
  2: "Needs Improvement",
  3: "Good & Reliable",
  4: "Very Satisfied",
  5: "Extraordinary Culinary Experience"
};

export function TestimonialSubmissionForm() {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [narrative, setNarrative] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerRole, setReviewerRole] = useState("");
  const [reviewerLocation, setReviewerLocation] = useState("");
  const [socialConsent, setSocialConsent] = useState(false);

  const [photos, setPhotos] = useState<AttachedMedia[]>([]);
  const [video, setVideo] = useState<AttachedMedia | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (narrative.trim().length < 20) {
      setFormError("Please write at least 20 characters for your review narrative.");
      return;
    }

    if (!socialConsent) {
      setFormError("Please agree to the consent checkbox to share your experience.");
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("narrative", narrative.trim());
      formData.append("rating", String(rating));
      formData.append("reviewerName", reviewerName.trim());
      if (reviewerRole.trim()) formData.append("reviewerRole", reviewerRole.trim());
      if (reviewerLocation.trim()) formData.append("reviewerLocation", reviewerLocation.trim());
      formData.append("socialConsent", "true");

      photos.forEach((photo) => {
        formData.append("photos", photo.file);
      });

      if (video) {
        formData.append("video", video.file);
      }

      await submitTestimonialWithProgress(formData, (percent) => {
        setUploadProgress(percent);
      });

      setIsSuccess(true);
    } catch (err: any) {
      setFormError(err.message || "Failed to submit testimonial. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-lg sm:p-12">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl text-emerald-600">
          ✨
        </div>
        <h2 className="font-display text-3xl font-bold text-[var(--color-oxblood)]">
          Thank You for Sharing!
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-stone-600">
          Your story and media have been received. We review every submission with love before featuring it on our community wall.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-oxblood)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-oxblood)]/90"
          >
            Explore Chefmate Meals
          </Link>
          <button
            type="button"
            onClick={() => {
              setIsSuccess(false);
              setTitle("");
              setNarrative("");
              setPhotos([]);
              setVideo(null);
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-stone-300 bg-white px-6 py-2.5 text-sm font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50"
          >
            Submit Another Review
          </button>
        </div>
      </div>
    );
  }

  const activeRating = hoverRating !== null ? hoverRating : rating;

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-2xl rounded-3xl border border-[var(--color-oxblood)]/15 bg-white p-6 shadow-xl sm:p-10"
    >
      <div className="mb-8 border-b border-stone-100 pb-6 text-center">
        <span className="inline-block rounded-full bg-[var(--color-warm-cream)] px-4 py-1 text-xs font-bold tracking-wider text-[var(--color-oxblood)] uppercase">
          Customer Stories
        </span>
        <h1 className="mt-3 font-display text-3xl font-bold text-[var(--color-oxblood)] sm:text-4xl">
          Share Your Chefmate Experience
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Tell us about your dinner party, family meal, or private chef evening.
        </p>
      </div>

      {formError && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {formError}
        </div>
      )}

      <div className="space-y-6">
        {/* Star Rating Selector */}
        <div>
          <label className="block text-sm font-semibold text-stone-800">
            Your Overall Rating <span className="text-red-500">*</span>
          </label>
          <div className="mt-2 flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                aria-label={`${star} star${star > 1 ? "s" : ""}`}
                disabled={isSubmitting}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(null)}
                className="p-1 text-3xl transition-transform hover:scale-110 focus-visible:outline-none"
              >
                <span className={star <= activeRating ? "text-amber-400" : "text-stone-300"}>
                  ★
                </span>
              </button>
            ))}
            <span className="ml-3 text-xs font-semibold text-stone-600">
              {RATING_DESCRIPTIONS[activeRating]}
            </span>
          </div>
        </div>

        {/* Experience Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-semibold text-stone-800">
            Review Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            required
            maxLength={160}
            disabled={isSubmitting}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Our Friday dinner party was completely effortless!"
            className="mt-1.5 w-full rounded-xl border border-stone-300 px-4 py-3 text-sm text-stone-900 placeholder-stone-400 shadow-sm focus:border-[var(--color-oxblood)] focus:ring-1 focus:ring-[var(--color-oxblood)]"
          />
        </div>

        {/* Review Narrative */}
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="narrative" className="block text-sm font-semibold text-stone-800">
              Your Story <span className="text-red-500">*</span>
            </label>
            <span className="text-xs text-stone-500">
              {narrative.length} / 2000 chars (min 20)
            </span>
          </div>
          <textarea
            id="narrative"
            required
            rows={5}
            minLength={20}
            maxLength={2000}
            disabled={isSubmitting}
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            placeholder="What dishes were cooked? How did your chef handle prep, seasoning, and cleanup? How did it make your evening easier?"
            className="mt-1.5 w-full rounded-xl border border-stone-300 px-4 py-3 text-sm text-stone-900 placeholder-stone-400 shadow-sm focus:border-[var(--color-oxblood)] focus:ring-1 focus:ring-[var(--color-oxblood)]"
          />
        </div>

        {/* Reviewer Details Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="reviewerName" className="block text-sm font-semibold text-stone-800">
              Your Name <span className="text-red-500">*</span>
            </label>
            <input
              id="reviewerName"
              type="text"
              required
              maxLength={120}
              disabled={isSubmitting}
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              placeholder="e.g., Lindiwe Ndlovu"
              className="mt-1.5 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 placeholder-stone-400 shadow-sm focus:border-[var(--color-oxblood)] focus:ring-1 focus:ring-[var(--color-oxblood)]"
            />
          </div>

          <div>
            <label htmlFor="reviewerRole" className="block text-sm font-semibold text-stone-800">
              Role / Context <span className="text-xs font-normal text-stone-500">(Optional)</span>
            </label>
            <input
              id="reviewerRole"
              type="text"
              maxLength={120}
              disabled={isSubmitting}
              value={reviewerRole}
              onChange={(e) => setReviewerRole(e.target.value)}
              placeholder="e.g., Mom of 2, Host"
              className="mt-1.5 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 placeholder-stone-400 shadow-sm focus:border-[var(--color-oxblood)] focus:ring-1 focus:ring-[var(--color-oxblood)]"
            />
          </div>

          <div>
            <label htmlFor="reviewerLocation" className="block text-sm font-semibold text-stone-800">
              City / Suburb <span className="text-xs font-normal text-stone-500">(Optional)</span>
            </label>
            <input
              id="reviewerLocation"
              type="text"
              maxLength={120}
              disabled={isSubmitting}
              value={reviewerLocation}
              onChange={(e) => setReviewerLocation(e.target.value)}
              placeholder="e.g., Camps Bay, CPT"
              className="mt-1.5 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 placeholder-stone-400 shadow-sm focus:border-[var(--color-oxblood)] focus:ring-1 focus:ring-[var(--color-oxblood)]"
            />
          </div>
        </div>

        {/* Media Uploader Dropzone */}
        <div className="pt-2">
          <MediaUploader
            photos={photos}
            video={video}
            onPhotosChange={setPhotos}
            onVideoChange={setVideo}
            disabled={isSubmitting}
          />
        </div>

        {/* Marketing Consent */}
        <div className="rounded-2xl border border-stone-200 bg-[var(--color-warm-cream)]/50 p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              required
              disabled={isSubmitting}
              checked={socialConsent}
              onChange={(e) => setSocialConsent(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-stone-300 text-[var(--color-oxblood)] focus:ring-[var(--color-oxblood)]"
            />
            <span className="text-xs leading-relaxed text-stone-700">
              I agree that Chefmate may feature my review, name, photos, and video on their website, social media, and digital marketing materials. <span className="text-red-500">*</span>
            </span>
          </label>
        </div>

        {/* Upload Progress Bar */}
        {isSubmitting && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-[var(--color-oxblood)]">
              <span>Uploading review and media...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200">
              <div
                className="h-full bg-[var(--color-oxblood)] transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-[var(--color-oxblood)] py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[var(--color-oxblood)]/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Submitting Your Story..." : "Submit Testimonial"}
        </button>
      </div>
    </form>
  );
}

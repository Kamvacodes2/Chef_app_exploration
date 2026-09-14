"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchPublicTestimonials,
  getTestimonialMediaUrl,
  type Testimonial,
} from "./api/testimonialClient";

export function TestimonialShowcase() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchPublicTestimonials()
      .then((items) => {
        if (!isMounted) return;
        setTestimonials(items || []);
      })
      .catch(() => {
        if (isMounted) setTestimonials([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section
      id="testimonials"
      className="bg-[var(--color-warm-white)] py-16 sm:py-20 lg:py-24 border-t border-[var(--color-oxblood)]/10"
      aria-labelledby="testimonials-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          <span className="rounded-full bg-[var(--color-warm-cream)] px-4 py-1 text-xs font-bold tracking-wider text-[var(--color-oxblood)] uppercase">
            Real Stories From Real Kitchens
          </span>
          <h2
            id="testimonials-heading"
            className="mt-3 font-display text-3xl font-bold text-[var(--color-oxblood)] sm:text-4xl lg:text-5xl"
          >
            Loved by Households Across South Africa
          </h2>
          <p className="mt-3 max-w-2xl text-base text-stone-700">
            See how Chefmate private chefs transform weeknight dinners, special celebrations, and
            family gatherings.
          </p>
        </div>

        {testimonials.length === 0 ? (
          /* Empty / Initial State CTA */
          <div className="mt-12 mx-auto max-w-2xl">
            <Link
              href="/share-experience"
              className="group flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[var(--color-oxblood)]/25 bg-[var(--color-warm-cream)] p-8 sm:p-12 text-center transition hover:border-[var(--color-oxblood)] hover:bg-[var(--color-warm-cream)]/90 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-oxblood)]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-oxblood)]/10 text-[var(--color-oxblood)] transition group-hover:scale-110">
                <span className="text-2xl" aria-hidden="true">
                  ✨
                </span>
              </div>
              <h3 className="mt-5 font-display text-2xl font-bold text-[var(--color-oxblood)] sm:text-3xl">
                Experienced Chefmate before? Share your story
              </h3>
              <p className="mt-3 max-w-md text-sm sm:text-base text-stone-700 leading-relaxed">
                Tell us about your private chef experience, favorite dishes, or upload photos and
                videos from your dining session. We would love to feature your story!
              </p>
              <span className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--color-oxblood)] px-6 py-3 text-sm font-bold text-white shadow-sm transition group-hover:bg-[var(--color-oxblood)]/90">
                Share Your Story →
              </span>
            </Link>
          </div>
        ) : (
          /* Populated Testimonials Grid */
          <>
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((item) => {
                const photos = item.media.filter((m) => m.mediaType === "IMAGE");
                const video = item.media.find((m) => m.mediaType === "VIDEO");

                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between rounded-3xl border border-[var(--color-oxblood)]/12 bg-[var(--color-warm-cream)] p-6 shadow-sm transition hover:shadow-md sm:p-8"
                  >
                    <div>
                      {/* Star Rating */}
                      <div
                        role="img"
                        className="flex items-center gap-1 text-amber-600 text-lg"
                        aria-label={`${item.rating} out of 5 stars`}
                      >
                        {Array.from({ length: item.rating }).map((_, i) => (
                          <span key={i} aria-hidden="true">
                            ★
                          </span>
                        ))}
                      </div>

                      {/* Title & Narrative */}
                      <h3 className="mt-4 font-display text-xl font-bold text-[var(--color-oxblood)]">
                        &ldquo;{item.title}&rdquo;
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-stone-800">
                        {item.narrative}
                      </p>

                      {/* Media attachments */}
                      {(photos.length > 0 || video) && (
                        <div className="mt-5 flex flex-wrap items-center gap-2 pt-2">
                          {photos.map((photo) => {
                            const url = getTestimonialMediaUrl(photo.storageKey);
                            return (
                              <button
                                key={photo.id}
                                type="button"
                                onClick={() => setActivePhotoUrl(url)}
                                aria-label={`View full photo ${photo.originalFilename}`}
                                className="relative h-14 w-14 overflow-hidden rounded-xl border border-stone-300 shadow-sm transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-oxblood)]"
                              >
                                <img
                                  src={url}
                                  alt={photo.originalFilename}
                                  className="h-full w-full object-cover"
                                />
                              </button>
                            );
                          })}

                          {video && (
                            <button
                              type="button"
                              onClick={() =>
                                setActiveVideoUrl(getTestimonialMediaUrl(video.storageKey))
                              }
                              aria-label="Watch customer video testimonial"
                              className="flex items-center gap-1.5 rounded-xl bg-[var(--color-oxblood)] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--color-oxblood)]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-oxblood)]"
                            >
                              <span aria-hidden="true">▶</span> Watch Video
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Reviewer Profile */}
                    <div className="mt-6 border-t border-[var(--color-oxblood)]/10 pt-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-oxblood)] font-bold text-white text-sm">
                          {item.reviewerName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-[var(--color-oxblood)]">
                            {item.reviewerName}
                          </div>
                          <div className="text-xs font-medium text-stone-700">
                            {[item.reviewerRole, item.reviewerLocation].filter(Boolean).join(" • ")}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Call to action below populated list */}
            <div className="mt-12 text-center">
              <Link
                href="/share-experience"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-[var(--color-oxblood)] px-6 py-2.5 text-sm font-bold text-[var(--color-oxblood)] transition hover:bg-[var(--color-oxblood)] hover:text-white"
              >
                Experienced Chefmate before? Share your story →
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Video Modal Player */}
      {activeVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-black shadow-2xl">
            <button
              type="button"
              onClick={() => setActiveVideoUrl(null)}
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black"
              aria-label="Close video"
            >
              ✕
            </button>
            <video
              src={activeVideoUrl}
              controls
              autoPlay
              className="max-h-[80vh] w-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Photo Lightbox */}
      {activePhotoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative max-h-[85vh] max-w-3xl overflow-hidden rounded-3xl bg-black">
            <button
              type="button"
              onClick={() => setActivePhotoUrl(null)}
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black"
              aria-label="Close photo"
            >
              ✕
            </button>
            <img
              src={activePhotoUrl}
              alt="Testimonial dish full size"
              className="max-h-[80vh] w-full object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
}

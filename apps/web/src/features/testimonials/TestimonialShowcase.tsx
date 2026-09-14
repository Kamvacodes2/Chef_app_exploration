"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchPublicTestimonials,
  getTestimonialMediaUrl,
  type Testimonial,
} from "./api/testimonialClient";

const FALLBACK_TESTIMONIALS: Testimonial[] = [
  {
    id: "fallback-1",
    title: "Effortless dinner party for 8 guests",
    narrative:
      "Chef Sanelisiwe made our anniversary dinner completely stress-free. The braised lamb shank was restaurant-quality, and the kitchen was left immaculate.",
    rating: 5,
    reviewerName: "Lindiwe Ndlovu",
    reviewerRole: "Dinner Party Host",
    reviewerLocation: "Camps Bay, Cape Town",
    socialConsent: true,
    status: "FEATURED",
    featuredOrder: 1,
    adminNotes: null,
    moderatedAt: null,
    moderatedByUserId: null,
    media: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "fallback-2",
    title: "Weeknight lifesaver for busy parents",
    narrative:
      "Having fresh, wholesome meals prepared in our home weekly has given us back 2 hours every evening with our kids. Unbelievable value.",
    rating: 5,
    reviewerName: "Mark van der Merwe",
    reviewerRole: "Working Father of 3",
    reviewerLocation: "Sandton, Johannesburg",
    socialConsent: true,
    status: "FEATURED",
    featuredOrder: 2,
    adminNotes: null,
    moderatedAt: null,
    moderatedByUserId: null,
    media: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "fallback-3",
    title: "A five-star restaurant in our dining room",
    narrative:
      "Chef Luko's attention to detail, plating, and flavour balance blew everyone away. We are booking every month now.",
    rating: 5,
    reviewerName: "Priya Naidoo",
    reviewerRole: "Food Enthusiast",
    reviewerLocation: "Umhlanga, Durban",
    socialConsent: true,
    status: "FEATURED",
    featuredOrder: 3,
    adminNotes: null,
    moderatedAt: null,
    moderatedByUserId: null,
    media: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function TestimonialShowcase() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchPublicTestimonials()
      .then((items) => {
        if (!isMounted) return;
        if (items && items.length > 0) {
          setTestimonials(items);
        } else {
          setTestimonials(FALLBACK_TESTIMONIALS);
        }
      })
      .catch(() => {
        if (isMounted) setTestimonials(FALLBACK_TESTIMONIALS);
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
            Loved by Busy Households Across South Africa
          </h2>
          <p className="mt-3 max-w-2xl text-base text-stone-600">
            See how Chefmate private chefs transform weeknight dinners, special celebrations, and
            family gatherings.
          </p>
        </div>

        {/* Testimonials Grid */}
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
                  <div className="flex items-center gap-1 text-amber-500 text-lg">
                    {Array.from({ length: item.rating }).map((_, i) => (
                      <span key={i}>★</span>
                    ))}
                  </div>

                  {/* Title & Narrative */}
                  <h3 className="mt-4 font-display text-xl font-bold text-[var(--color-oxblood)]">
                    &ldquo;{item.title}&rdquo;
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-stone-700">{item.narrative}</p>

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
                            className="relative h-14 w-14 overflow-hidden rounded-xl border border-stone-300 shadow-sm transition hover:scale-105"
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
                          className="flex items-center gap-1.5 rounded-xl bg-[var(--color-oxblood)] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--color-oxblood)]/90"
                        >
                          <span>▶</span> Watch Video
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
                      <div className="text-xs text-stone-500">
                        {[item.reviewerRole, item.reviewerLocation].filter(Boolean).join(" • ")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Call to action for sharing experiences */}
        <div className="mt-12 text-center">
          <Link
            href="/share-experience"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-[var(--color-oxblood)] px-6 py-2.5 text-sm font-bold text-[var(--color-oxblood)] transition hover:bg-[var(--color-oxblood)] hover:text-white"
          >
            Have you cooked with us? Share your story →
          </Link>
        </div>
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

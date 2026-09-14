import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { TestimonialShowcase } from "../../src/features/testimonials/TestimonialShowcase";
import * as client from "../../src/features/testimonials/api/testimonialClient";

describe("TestimonialShowcase", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders testimonials and media action buttons", async () => {
    vi.spyOn(client, "fetchPublicTestimonials").mockResolvedValue([
      {
        id: "t-100",
        title: "Spectacular Paella Feast",
        narrative: "Chef Thabo prepared the most flavorful seafood paella we have ever tasted.",
        rating: 5,
        reviewerName: "David Miller",
        reviewerRole: "Dinner Host",
        reviewerLocation: "Clifton, CPT",
        socialConsent: true,
        status: "FEATURED",
        featuredOrder: 1,
        adminNotes: null,
        moderatedAt: null,
        moderatedByUserId: null,
        media: [
          {
            id: "m-1",
            testimonialId: "t-100",
            mediaType: "IMAGE",
            storageKey: "paella.jpg",
            originalFilename: "paella.jpg",
            mimeType: "image/jpeg",
            fileSizeBytes: 500000,
            displayOrder: 0,
            createdAt: "2026-09-13T10:00:00Z",
          },
          {
            id: "m-2",
            testimonialId: "t-100",
            mediaType: "VIDEO",
            storageKey: "review.mp4",
            originalFilename: "review.mp4",
            mimeType: "video/mp4",
            fileSizeBytes: 5000000,
            displayOrder: 1,
            createdAt: "2026-09-13T10:00:00Z",
          },
        ],
        createdAt: "2026-09-13T10:00:00Z",
        updatedAt: "2026-09-13T10:00:00Z",
      },
    ]);

    render(<TestimonialShowcase />);

    await waitFor(() => {
      expect(screen.getByText(/spectacular paella feast/i)).toBeInTheDocument();
      expect(screen.getByText(/david miller/i)).toBeInTheDocument();
      expect(screen.getByText(/watch video/i)).toBeInTheDocument();
      expect(screen.getByAltText(/paella.jpg/i)).toBeInTheDocument();
    });
  });
});

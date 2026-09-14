import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchPublicTestimonials,
  fetchOperationsTestimonials,
  moderateTestimonial,
  deleteOperationsTestimonial,
  getTestimonialMediaUrl,
} from "../../src/features/testimonials/api/testimonialClient";

describe("Testimonial API Client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("generates correct media URLs", () => {
    const url = getTestimonialMediaUrl("abc-123.jpg");
    expect(url).toContain("/api/v1/testimonials/media/abc-123.jpg");
  });

  it("fetches public testimonials", async () => {
    const mockData = [
      {
        id: "t1",
        title: "Superb dinner",
        narrative: "Chef cooked an amazing meal for our family.",
        rating: 5,
        reviewerName: "Lindiwe",
        reviewerRole: "Host",
        reviewerLocation: "Cape Town",
        socialConsent: true,
        status: "APPROVED",
        featuredOrder: null,
        adminNotes: null,
        moderatedAt: null,
        moderatedByUserId: null,
        media: [],
        createdAt: "2026-09-13T10:00:00Z",
        updatedAt: "2026-09-13T10:00:00Z",
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: mockData }),
    } as unknown as Response);

    const result = await fetchPublicTestimonials({ featuredOnly: true });
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Superb dinner");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("featuredOnly=true"),
      expect.any(Object),
    );
  });

  it("fetches operations testimonials with filters", async () => {
    const mockData = [
      {
        id: "t2",
        title: "Great braai",
        narrative: "Wonderful Saturday braai experience.",
        rating: 5,
        reviewerName: "Sipho",
        reviewerRole: "Host",
        reviewerLocation: "Johannesburg",
        socialConsent: true,
        status: "PENDING",
        featuredOrder: null,
        adminNotes: null,
        moderatedAt: null,
        moderatedByUserId: null,
        media: [],
        createdAt: "2026-09-13T10:00:00Z",
        updatedAt: "2026-09-13T10:00:00Z",
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: mockData, meta: { total: 1 } }),
    } as unknown as Response);

    const result = await fetchOperationsTestimonials({ status: "PENDING", search: "Sipho" });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("status=PENDING&search=Sipho"),
      expect.any(Object),
    );
  });

  it("moderates a testimonial", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          id: "t1",
          status: "FEATURED",
          featuredOrder: 1,
        },
      }),
    } as unknown as Response);

    const result = await moderateTestimonial("t1", {
      status: "FEATURED",
      featuredOrder: 1,
      adminNotes: "Featured review",
    });

    expect(result.status).toBe("FEATURED");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/operations/testimonials/t1/moderate"),
      expect.objectContaining({
        method: "PATCH",
      }),
    );
  });

  it("deletes a testimonial", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { success: true } }),
    } as unknown as Response);

    await deleteOperationsTestimonial("t1");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/operations/testimonials/t1"),
      expect.objectContaining({
        method: "DELETE",
      }),
    );
  });
});

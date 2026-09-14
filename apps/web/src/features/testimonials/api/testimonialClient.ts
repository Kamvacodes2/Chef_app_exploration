import { z } from "zod";
import { getChefmateApiUrl } from "@/lib/env";

export const testimonialMediaSchema = z.object({
  id: z.string(),
  testimonialId: z.string(),
  mediaType: z.enum(["IMAGE", "VIDEO"]),
  storageKey: z.string(),
  originalFilename: z.string(),
  mimeType: z.string(),
  fileSizeBytes: z.number(),
  displayOrder: z.number(),
  createdAt: z.string(),
});

export const testimonialSchema = z.object({
  id: z.string(),
  title: z.string(),
  narrative: z.string(),
  rating: z.number(),
  reviewerName: z.string(),
  reviewerRole: z.string().nullable().optional(),
  reviewerLocation: z.string().nullable().optional(),
  socialConsent: z.boolean(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "FEATURED"]),
  featuredOrder: z.number().nullable().optional(),
  adminNotes: z.string().nullable().optional(),
  moderatedAt: z.string().nullable().optional(),
  moderatedByUserId: z.string().nullable().optional(),
  media: z.array(testimonialMediaSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const publicTestimonialsResponseSchema = z.object({
  data: z.array(testimonialSchema),
});

export const operationsTestimonialsResponseSchema = z.object({
  data: z.array(testimonialSchema),
  meta: z
    .object({
      total: z.number(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    })
    .optional(),
});

export const singleTestimonialResponseSchema = z.object({
  data: testimonialSchema,
});

export type TestimonialMedia = z.infer<typeof testimonialMediaSchema>;
export type Testimonial = z.infer<typeof testimonialSchema>;

export class TestimonialApiError extends Error {
  constructor(
    message: string,
    readonly code: string = "unknown_error",
    readonly status: number = 500,
  ) {
    super(message);
    this.name = "TestimonialApiError";
  }
}

function getBaseUrl(): string {
  return getChefmateApiUrl().replace(/\/$/, "");
}

export function getTestimonialMediaUrl(storageKey: string): string {
  return `${getBaseUrl()}/api/v1/testimonials/media/${encodeURIComponent(storageKey)}`;
}

export async function fetchPublicTestimonials(
  options: {
    featuredOnly?: boolean;
    limit?: number;
  } = {},
): Promise<Testimonial[]> {
  const params = new URLSearchParams();
  if (options.featuredOnly) params.set("featuredOnly", "true");
  if (options.limit) params.set("limit", String(options.limit));

  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`${getBaseUrl()}/api/v1/testimonials/public${query}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new TestimonialApiError(
      `Failed to fetch testimonials (${response.status})`,
      "fetch_failed",
      response.status,
    );
  }

  const json = await response.json();
  const parsed = publicTestimonialsResponseSchema.safeParse(json);
  if (!parsed.success) {
    return (json?.data as Testimonial[]) || [];
  }
  return parsed.data.data;
}

export function submitTestimonialWithProgress(
  formData: FormData,
  onProgress?: (percent: number) => void,
): Promise<Testimonial> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${getBaseUrl()}/api/v1/testimonials/submit`);
    xhr.withCredentials = true;

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          const parsed = singleTestimonialResponseSchema.safeParse(json);
          if (parsed.success) {
            resolve(parsed.data.data);
          } else {
            resolve(json.data as Testimonial);
          }
        } else {
          const message = json?.error?.message || `Submission failed (${xhr.status})`;
          const code = json?.error?.code || "submission_failed";
          reject(new TestimonialApiError(message, code, xhr.status));
        }
      } catch {
        reject(
          new TestimonialApiError(`Server error (${xhr.status})`, "invalid_response", xhr.status),
        );
      }
    };

    xhr.onerror = () => {
      reject(
        new TestimonialApiError("Network error occurred during submission.", "network_error", 0),
      );
    };

    xhr.send(formData);
  });
}

export async function fetchOperationsTestimonials(
  filters: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<{ items: Testimonial[]; total: number }> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.offset) params.set("offset", String(filters.offset));

  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`${getBaseUrl()}/api/v1/operations/testimonials${query}`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new TestimonialApiError(
      `Failed to fetch moderation queue (${response.status})`,
      "fetch_failed",
      response.status,
    );
  }

  const json = await response.json();
  const parsed = operationsTestimonialsResponseSchema.safeParse(json);
  if (parsed.success) {
    return {
      items: parsed.data.data,
      total: parsed.data.meta?.total ?? parsed.data.data.length,
    };
  }
  return { items: (json?.data as Testimonial[]) || [], total: json?.meta?.total ?? 0 };
}

export async function moderateTestimonial(
  id: string,
  update: {
    status: "PENDING" | "APPROVED" | "REJECTED" | "FEATURED";
    featuredOrder?: number | null;
    adminNotes?: string | null;
  },
): Promise<Testimonial> {
  const response = await fetch(
    `${getBaseUrl()}/api/v1/operations/testimonials/${encodeURIComponent(id)}/moderate`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(update),
    },
  );

  if (!response.ok) {
    const json = await response.json().catch(() => ({}));
    throw new TestimonialApiError(
      json?.error?.message || "Failed to update testimonial",
      json?.error?.code || "update_failed",
      response.status,
    );
  }

  const json = await response.json();
  return json.data as Testimonial;
}

export async function deleteOperationsTestimonial(id: string): Promise<void> {
  const response = await fetch(
    `${getBaseUrl()}/api/v1/operations/testimonials/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );

  if (!response.ok) {
    throw new TestimonialApiError(
      `Failed to delete testimonial (${response.status})`,
      "delete_failed",
      response.status,
    );
  }
}

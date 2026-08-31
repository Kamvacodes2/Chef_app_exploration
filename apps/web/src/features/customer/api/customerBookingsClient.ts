import { z } from "zod";
import { getChefmateApiUrl } from "@/lib/env";
import { readApiErrorMessage } from "@/lib/apiError";

export interface CustomerBookingsRequestOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
}

const bookingStatusSchema = z.enum([
  "REQUESTED",
  "NEEDS_REVIEW",
  "CONFIRMED",
  "AWAITING_CHEF",
  "CHEF_MATCHED",
  "EN_ROUTE",
  "CANCELLED",
  "COMPLETED",
]);

const bookingMealSchema = z.object({
  kind: z.enum(["main", "side", "dessert"]),
  slug: z.string(),
  name: z.string(),
});

const customerBookingSchema = z.object({
  id: z.string().min(1),
  reference: z.string().min(1),
  status: bookingStatusSchema,
  type: z.enum(["STANDARD", "CUSTOM", "GIFT", "SUBSCRIPTION"]),
  mainMeal: z.object({ slug: z.string(), name: z.string().min(1) }),
  meals: z.array(bookingMealSchema),
  scheduledDate: z.string().min(1),
  timeSlot: z.string().min(1),
  createdAt: z.string(),
});

const responseSchema = z.object({
  data: z.object({ items: z.array(customerBookingSchema) }),
});

export type CustomerBooking = z.infer<typeof customerBookingSchema>;
export type BookingMeal = z.infer<typeof bookingMealSchema>;
export type CustomerBookingStatus = z.infer<typeof bookingStatusSchema>;

export async function fetchCustomerBookings(
  options: CustomerBookingsRequestOptions = {},
): Promise<CustomerBooking[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(
    apiUrl(options.baseUrl ?? getChefmateApiUrl(), "/api/v1/account/booking-requests"),
    { method: "GET", credentials: "include" },
  );
  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response, "Chefmate could not load your bookings."));
  }
  return responseSchema.parse(await response.json()).data.items;
}

function apiUrl(baseUrl: string, path: string): string {
  const base = baseUrl.trim().replace(/\/$/, "");
  if (!base) throw new Error("Chefmate API URL is not configured.");
  return base + path;
}

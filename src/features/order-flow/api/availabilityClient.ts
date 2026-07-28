import { z } from "zod";
import { getChefmateApiUrl } from "@/lib/env";

const availabilityResponseSchema = z.object({
  data: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    slots: z.array(z.object({
      period: z.enum(["morning", "afternoon", "evening"]),
      time: z.string().regex(/^\d{2}:\d{2}$/),
      label: z.string().min(1),
      available: z.boolean(),
    })),
  }),
});

export interface AvailabilitySlot {
  readonly period: "morning" | "afternoon" | "evening";
  readonly time: string;
  readonly label: string;
  readonly available: boolean;
}

export async function fetchAvailabilityForDate(date: string, signal?: AbortSignal): Promise<readonly AvailabilitySlot[]> {
  const baseUrl = getChefmateApiUrl().trim().replace(/\/$/, "");
  if (!baseUrl) throw new Error("Chefmate API URL is not configured.");

  const response = await fetch(`${baseUrl}/api/v1/availability/slots?date=${encodeURIComponent(date)}`, {
    method: "GET",
    credentials: "include",
    signal,
  });
  if (!response.ok) throw new Error(`Chefmate availability request failed (${response.status})`);
  return availabilityResponseSchema.parse(await response.json()).data.slots;
}
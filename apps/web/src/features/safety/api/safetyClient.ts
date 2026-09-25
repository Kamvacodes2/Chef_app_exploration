import { z } from "zod";
import { requestData, requestNoContent } from "@/features/platform/api/platformClient";
import type { PlatformRequestOptions } from "@/features/platform/api/platformClient";

const envelope = <Schema extends z.ZodTypeAny>(schema: Schema) => z.object({ data: schema });

const panicAlertSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["ACTIVE", "ACKNOWLEDGED", "RESOLVED"]),
  source: z.enum(["CHEF", "CUSTOMER"]),
  raisedBy: z.object({
    id: z.string(),
    displayName: z.string(),
    email: z.string(),
    phone: z.string().nullable(),
  }),
  booking: z
    .object({
      id: z.string(),
      reference: z.string(),
      address: z.string().nullable(),
      scheduledDate: z.string().nullable(),
      timeSlot: z.string().nullable(),
    })
    .nullable(),
  latitude: z.number(),
  longitude: z.number(),
  accuracyMeters: z.number().nullable(),
  note: z.string().nullable(),
  firstPingAt: z.string(),
  lastPingAt: z.string(),
  acknowledgedAt: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  mapUrl: z.string(),
  pingCount: z.number().int(),
});

export type PanicAlert = z.infer<typeof panicAlertSchema>;

export interface DeviceFix {
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracyMeters: number | null;
  readonly speedMps?: number | null;
  readonly headingDeg?: number | null;
}

export async function raisePanicAlert(
  fix: DeviceFix,
  options: { note?: string; bookingRequestId?: string } & PlatformRequestOptions = {},
): Promise<PanicAlert> {
  const { note, bookingRequestId, ...requestOptions } = options;
  const result = await requestData({
    path: "/api/v1/safety/panic",
    method: "POST",
    body: {
      latitude: fix.latitude,
      longitude: fix.longitude,
      accuracyMeters: fix.accuracyMeters,
      ...(note ? { note } : {}),
      ...(bookingRequestId ? { bookingRequestId } : {}),
    },
    schema: envelope(panicAlertSchema),
    options: requestOptions,
  });
  return result;
}

export async function streamPanicLocation(
  alertId: string,
  fix: DeviceFix,
  options: PlatformRequestOptions = {},
): Promise<PanicAlert> {
  return requestData({
    path: `/api/v1/safety/panic/${encodeURIComponent(alertId)}/pings`,
    method: "POST",
    body: {
      latitude: fix.latitude,
      longitude: fix.longitude,
      accuracyMeters: fix.accuracyMeters,
      speedMps: fix.speedMps ?? null,
      headingDeg: fix.headingDeg ?? null,
    },
    schema: envelope(panicAlertSchema),
    options,
  });
}

export async function fetchMyOpenAlert(
  options: PlatformRequestOptions = {},
): Promise<PanicAlert | null> {
  return requestData({
    path: "/api/v1/safety/panic/open",
    method: "GET",
    schema: envelope(panicAlertSchema.nullable()),
    options,
  });
}

export async function cancelMyPanicAlert(
  alertId: string,
  options: PlatformRequestOptions = {},
): Promise<void> {
  await requestNoContent({
    path: `/api/v1/safety/panic/${encodeURIComponent(alertId)}`,
    method: "DELETE",
    options,
  });
}

export async function fetchSafetyAlerts(
  options: {
    status?: "OPEN" | "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
    limit?: number;
  } & PlatformRequestOptions = {},
): Promise<readonly PanicAlert[]> {
  const { status, limit, ...requestOptions } = options;
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (limit) query.set("limit", String(limit));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const result = await requestData({
    path: `/api/v1/safety/alerts${suffix}`,
    method: "GET",
    schema: envelope(z.object({ items: z.array(panicAlertSchema) })),
    options: requestOptions,
  });
  return result.items;
}

export async function acknowledgeSafetyAlert(
  alertId: string,
  options: PlatformRequestOptions = {},
): Promise<PanicAlert> {
  return requestData({
    path: `/api/v1/safety/alerts/${encodeURIComponent(alertId)}/acknowledge`,
    method: "POST",
    schema: envelope(panicAlertSchema),
    options,
  });
}

export async function resolveSafetyAlert(
  alertId: string,
  options: PlatformRequestOptions = {},
): Promise<PanicAlert> {
  return requestData({
    path: `/api/v1/safety/alerts/${encodeURIComponent(alertId)}/resolve`,
    method: "POST",
    schema: envelope(panicAlertSchema),
    options,
  });
}

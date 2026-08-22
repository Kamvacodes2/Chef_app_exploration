import { z } from "zod";
import { readApiErrorMessage } from "@/lib/apiError";
import { getChefmateApiUrl } from "@/lib/env";

export interface PlatformRequestOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
}

export interface ChefReferenceInput {
  readonly name: string;
  readonly relationship: string;
  readonly phone: string;
  readonly email: string;
}

export interface ChefApplicationInput {
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly city: string | null;
  readonly serviceAreas: readonly string[];
  readonly experience: string;
  readonly idNumber?: string | null;
  readonly dateOfBirth?: string | null;
  readonly nationality?: string | null;
  readonly yearsOfExperience?: number | null;
  readonly culinaryEducation?: string | null;
  readonly cuisines?: readonly string[];
  readonly languages?: readonly string[];
  readonly hasFoodSafetyCert?: boolean;
  readonly hasOwnTransport?: boolean;
  readonly references?: readonly ChefReferenceInput[] | null;
  readonly backgroundCheckConsent: true;
  readonly documents?: readonly UploadedApplicationDocument[];
}

export interface ChefApplicationUpdateInput {
  readonly status?: ChefApplicationStatus;
  readonly interviewScheduledAt?: string | null;
  readonly interviewConductedAt?: string | null;
  readonly interviewConducted?: boolean;
  readonly adminNotes?: string | null;
}

export interface ChefApplicationVerificationInput {
  readonly status: ChefVerificationStatus;
  readonly providerReference?: string | null;
  readonly providerOutcome?: ChefVerificationOutcome | null;
  readonly expiresAt?: string | null;
}

export interface ChefProfileInput {
  readonly isAvailable: boolean;
  readonly serviceArea: string | null;
  readonly serviceAreas: readonly string[];
  readonly bio: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly maxTravelKm: number;
  readonly availability: Record<string, unknown> | null;
}

export interface ChefBankDetailsInput {
  readonly accountHolder: string;
  readonly bankName: string;
  readonly branchCode: string;
  readonly accountNumber: string;
  readonly accountType: string | null;
}

export interface WhatsAppPreviewInput {
  readonly recipient: string;
  readonly templateKey: string;
  readonly bodyPreview: string;
  readonly relatedBookingRequestId?: string | null;
  readonly relatedUserId?: string | null;
}

const chefApplicationStatusSchema = z.enum([
  "APPLIED",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_CONDUCTED",
  "APPROVED",
  "INVITED",
  "REJECTED",
]);

const chefVerificationStatusSchema = z.enum([
  "CONSENTED",
  "PENDING",
  "REVIEW_REQUIRED",
  "PASSED",
  "NOT_CLEARED",
  "ERROR",
  "EXPIRED",
  "CANCELLED",
]);

const chefVerificationOutcomeSchema = z.enum(["CLEAR", "HIT", "INCONCLUSIVE"]);

const chefVerificationSchema = z.object({
  provider: z.literal("HURU"),
  status: chefVerificationStatusSchema,
  providerReference: z.string().nullable(),
  providerOutcome: chefVerificationOutcomeSchema.nullable(),
  consentVersion: z.string(),
  consentedAt: z.string(),
  reviewedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
});

const communicationChannelSchema = z.enum(["EMAIL", "WHATSAPP"]);
const communicationStatusSchema = z.enum(["QUEUED", "SENT", "SKIPPED", "FAILED"]);

const platformUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1),
  roles: z.array(z.string()),
  status: z.string().min(1),
  createdAt: z.string(),
});

const bankAccountPreviewSchema = z.object({
  accountHolder: z.string().min(1),
  bankName: z.string().min(1),
  branchCode: z.string().min(1),
  accountNumberLast4: z.string().min(1),
  accountType: z.string().nullable(),
  updatedAt: z.string(),
});
const applicationDocumentSchema = z.object({
  id: z.string().min(1),
  applicationId: z.string().min(1),
  docType: z.enum([
    "ID_DOC",
    "CV",
    "PORTFOLIO",
    "CERTIFICATE",
    "FOOD_SAFETY",
    "FIRST_AID",
    "BACKGROUND_CHECK",
    "OTHER",
  ]),
  storageKey: z.string().min(1),
  originalName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  uploadedAt: z.string(),
});

const uploadedApplicationDocumentSchema = applicationDocumentSchema.omit({
  id: true,
  applicationId: true,
  uploadedAt: true,
});

const chefApplicationSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  city: z.string().nullable(),
  serviceAreas: z.array(z.string()),
  experience: z.string(),
  status: chefApplicationStatusSchema,
  interviewScheduledAt: z.string().nullable(),
  interviewConductedAt: z.string().nullable(),
  adminNotes: z.string().nullable(),
  invitedUserId: z.string().nullable(),
  invitedAt: z.string().nullable(),
  rejectedAt: z.string().nullable(),
  appliedAt: z.string(),
  updatedAt: z.string(),
  verification: chefVerificationSchema.nullable(),
  documents: z.array(applicationDocumentSchema).default([]),
});

const chefProfileSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().min(1),
  email: z.string().email(),
  isAvailable: z.boolean(),
  serviceArea: z.string().nullable(),
  serviceAreas: z.array(z.string()),
  bio: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  maxTravelKm: z.number().int().nonnegative(),
  availability: z.record(z.unknown()).nullable(),
  bankAccount: bankAccountPreviewSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

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

const chefBookingSchema = z.object({
  id: z.string().min(1),
  reference: z.string().min(1),
  status: bookingStatusSchema,
  type: z.string().min(1),
  source: z.literal("LANDING_ORDER_FLOW"),
  idempotencyKey: z.string(),
  idempotencyPayloadHash: z.string(),
  customerId: z.string().nullable(),
  mainMealSlug: z.string().min(1),
  mainName: z.string().min(1),
  customRequest: z.string().nullable(),
  scheduledDate: z.string().min(1),
  timeSlot: z.string().min(1),
  estate: z.string().nullable(),
  unit: z.string().nullable(),
  street: z.string().min(1),
  serviceArea: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  contactName: z.string().nullable(),
  contactEmail: z.string().nullable(),
  contactPhone: z.string().nullable(),
  goalId: z.string().nullable(),
  promotionCodeHash: z.string().nullable(),
  createdAt: z.string(),
  transitions: z.array(
    z.object({
      id: z.string().min(1),
      fromStatus: bookingStatusSchema.nullable(),
      toStatus: bookingStatusSchema,
      actor: z.enum(["SYSTEM", "CUSTOMER", "ADMIN", "CHEF"]),
      actorUserId: z.string().nullable(),
      note: z.string().nullable(),
      metadata: z.record(z.unknown()).nullable(),
      createdAt: z.string(),
    }),
  ),
});

const chefOfferSchema = z.object({
  id: z.string().min(1),
  bookingRequestId: z.string().min(1),
  chefUserId: z.string().min(1),
  status: z.enum(["PENDING", "ACCEPTED", "DECLINED", "EXPIRED", "WITHDRAWN"]),
  rank: z.number().int(),
  distanceKm: z.number().nullable(),
  chefPayoutCents: z.number().int().nonnegative(),
  expiresAt: z.string(),
  createdAt: z.string(),
  booking: z.object({
    id: z.string().min(1),
    reference: z.string().min(1),
    mainName: z.string().min(1),
    scheduledDate: z.string().min(1),
    timeSlot: z.string().min(1),
    serviceArea: z.string().nullable(),
  }),
});

const chefEarningSchema = z.object({
  id: z.string().min(1),
  bookingRequestId: z.string().min(1),
  bookingReference: z.string().min(1),
  chefUserId: z.string().min(1),
  chefDisplayName: z.string().min(1),
  chefPayoutCents: z.number().int().nonnegative(),
  status: z.enum(["PENDING", "PAYABLE", "PAID", "CANCELLED"]),
  payoutReference: z.string().nullable(),
  createdAt: z.string(),
});

const adminDashboardSchema = z.object({
  customersCount: z.number().int().nonnegative(),
  chefsCount: z.number().int().nonnegative(),
  chefApplicationsCount: z.number().int().nonnegative(),
  chefApplicationStatusCounts: z.record(z.string(), z.number().int().nonnegative()),
  bookingsThisMonthCount: z.number().int().nonnegative(),
  collectedThisMonthCents: z.number().int().nonnegative(),
  chefPayableCents: z.number().int().nonnegative(),
  platformRevenueCents: z.number().int().nonnegative(),
  communicationsQueuedCount: z.number().int().nonnegative(),
  communicationsSentCount: z.number().int().nonnegative(),
  whatsAppReady: z.boolean(),
});

const chefSummarySchema = platformUserSchema.extend({
  profile: chefProfileSchema.omit({ displayName: true, email: true, bankAccount: true }).nullable(),
  bankAccount: bankAccountPreviewSchema.nullable(),
});

const communicationLogSchema = z.object({
  id: z.string().min(1),
  channel: communicationChannelSchema,
  status: communicationStatusSchema,
  recipient: z.string().min(1),
  subject: z.string().nullable(),
  templateKey: z.string().min(1),
  bodyPreview: z.string().nullable(),
  provider: z.string().nullable(),
  relatedBookingRequestId: z.string().nullable(),
  relatedUserId: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  sentAt: z.string().nullable(),
  createdAt: z.string(),
});

const popularMealSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  kind: z.string().min(1),
  orderCount: z.number().int().nonnegative(),
  grossCents: z.number().int().nonnegative(),
});

// Legacy providers may still send "COOK" on the wire. Normalize that compatibility
// value to the canonical "CHEF" role so the rest of the frontend has one role name.
const rawPlatformRoleSchema = z.enum(["CUSTOMER", "COOK", "CHEF", "ADMIN", "SUPPORT"]);
export const platformRoleSchema = z.preprocess(
  (value) => (value === "COOK" ? "CHEF" : value),
  rawPlatformRoleSchema.exclude(["COOK"]),
);

const authUserSchema = platformUserSchema.extend({
  status: z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED"]),
  roles: z.array(platformRoleSchema),
  emailVerifiedAt: z.string().nullable(),
});

const envelope = <Schema extends z.ZodTypeAny>(schema: Schema) => z.object({ data: schema });
const itemsEnvelope = <Schema extends z.ZodTypeAny>(schema: Schema) =>
  envelope(z.object({ items: z.array(schema) }));

export type ChefApplicationStatus = z.infer<typeof chefApplicationStatusSchema>;
export type ChefApplication = z.infer<typeof chefApplicationSchema>;
export type ChefVerificationStatus = z.infer<typeof chefVerificationStatusSchema>;
export type ChefVerificationOutcome = z.infer<typeof chefVerificationOutcomeSchema>;
export type ChefVerification = z.infer<typeof chefVerificationSchema>;
export type ChefProfile = z.infer<typeof chefProfileSchema>;
export type BankAccountPreview = z.infer<typeof bankAccountPreviewSchema>;
export type ChefOffer = z.infer<typeof chefOfferSchema>;
export type ChefEarning = z.infer<typeof chefEarningSchema>;
export type ChefBooking = z.infer<typeof chefBookingSchema>;
export type AdminDashboard = z.infer<typeof adminDashboardSchema>;
export type ApplicationDocument = z.infer<typeof applicationDocumentSchema>;
export type UploadedApplicationDocument = z.infer<typeof uploadedApplicationDocumentSchema>;
export type CommunicationLog = z.infer<typeof communicationLogSchema>;
export type PopularMeal = z.infer<typeof popularMealSchema>;

export async function uploadApplicationDocument(
  docType: ApplicationDocument["docType"],
  file: File,
  options: PlatformRequestOptions = {},
): Promise<UploadedApplicationDocument> {
  const formData = new FormData();
  formData.append("file", file, file.name);
  const response = await (options.fetchImpl ?? fetch)(
    apiUrl(
      options.baseUrl ?? getChefmateApiUrl(),
      `/chef-applications/documents?docType=${encodeURIComponent(docType)}`,
    ),
    { method: "POST", credentials: "include", body: formData },
  );
  if (!response.ok) {
    throw new Error(
      await readApiErrorMessage(response, "Document upload failed (" + response.status + ")"),
    );
  }
  return uploadedApplicationDocumentSchema.parse((await response.json()).data);
}

export async function listApplicationDocuments(
  applicationId: string,
  options: PlatformRequestOptions = {},
): Promise<readonly ApplicationDocument[]> {
  const response = await send(
    `/operations/chef-applications/${encodeURIComponent(applicationId)}/documents`,
    "GET",
    undefined,
    options,
  );
  if (!response.ok) {
    throw new Error(
      await readApiErrorMessage(response, "Chefmate request failed (" + response.status + ")"),
    );
  }
  return itemsEnvelope(applicationDocumentSchema).parse(await response.json()).data.items;
}

export function applicationDocumentDownloadUrl(applicationId: string, documentId: string): string {
  return `/api/v1/operations/chef-applications/${encodeURIComponent(applicationId)}/documents/${encodeURIComponent(documentId)}/download`;
}
export type PlatformUser = z.infer<typeof platformUserSchema>;
export type ChefSummary = z.infer<typeof chefSummarySchema>;

export async function submitChefApplication(
  input: ChefApplicationInput,
  options: PlatformRequestOptions = {},
): Promise<ChefApplication> {
  return requestData({
    path: "/api/v1/chef-applications",
    method: "POST",
    body: input,
    schema: envelope(chefApplicationSchema),
    options,
  });
}

export async function consumeChefMagicLink(
  token: string,
  options: PlatformRequestOptions = {},
): Promise<z.infer<typeof authUserSchema>> {
  return requestData({
    path: "/api/v1/chef/magic-login",
    method: "POST",
    body: { token },
    schema: envelope(z.object({ user: authUserSchema })),
    options,
    select: (data) => data.user,
  });
}

export async function fetchChefProfile(options: PlatformRequestOptions = {}): Promise<ChefProfile> {
  return requestData({
    path: "/api/v1/chef/profile",
    method: "GET",
    schema: envelope(chefProfileSchema),
    options,
  });
}

export async function updateChefProfile(
  input: ChefProfileInput,
  options: PlatformRequestOptions = {},
): Promise<ChefProfile> {
  return requestData({
    path: "/api/v1/chef/profile",
    method: "PUT",
    body: input,
    schema: envelope(chefProfileSchema),
    options,
  });
}

export async function updateChefBankDetails(
  input: ChefBankDetailsInput,
  options: PlatformRequestOptions = {},
): Promise<BankAccountPreview> {
  return requestData({
    path: "/api/v1/chef/bank-details",
    method: "PUT",
    body: input,
    schema: envelope(bankAccountPreviewSchema),
    options,
  });
}

export async function fetchChefOffers(options: PlatformRequestOptions = {}): Promise<ChefOffer[]> {
  return requestData({
    path: "/api/v1/chef/offers",
    method: "GET",
    schema: itemsEnvelope(chefOfferSchema),
    options,
    select: (data) => data.items,
  });
}

export async function acceptChefOffer(
  offerId: string,
  options: PlatformRequestOptions = {},
): Promise<{ booking: ChefBooking; offer: ChefOffer }> {
  return requestData({
    path: `/api/v1/chef/offers/${encodeURIComponent(offerId)}/accept`,
    method: "POST",
    schema: envelope(z.object({ booking: chefBookingSchema, offer: chefOfferSchema })),
    options,
  });
}

export async function declineChefOffer(
  offerId: string,
  options: PlatformRequestOptions = {},
): Promise<void> {
  await requestNoContent({
    path: `/api/v1/chef/offers/${encodeURIComponent(offerId)}/decline`,
    method: "POST",
    options,
  });
}

export async function fetchChefBookings(
  options: PlatformRequestOptions = {},
): Promise<ChefBooking[]> {
  return requestData({
    path: "/api/v1/chef/bookings",
    method: "GET",
    schema: itemsEnvelope(chefBookingSchema),
    options,
    select: (data) => data.items,
  });
}

export async function markChefEnRoute(
  bookingId: string,
  note: string | null,
  options: PlatformRequestOptions = {},
): Promise<ChefBooking> {
  return requestData({
    path: `/api/v1/chef/bookings/${encodeURIComponent(bookingId)}/en-route`,
    method: "POST",
    body: { note },
    schema: envelope(chefBookingSchema),
    options,
  });
}

export async function completeChefBooking(
  bookingId: string,
  note: string | null,
  options: PlatformRequestOptions = {},
): Promise<{ booking: ChefBooking; surveysIssued: number; earning: ChefEarning }> {
  return requestData({
    path: `/api/v1/chef/bookings/${encodeURIComponent(bookingId)}/complete`,
    method: "POST",
    body: { note },
    schema: envelope(
      z.object({
        booking: chefBookingSchema,
        surveysIssued: z.number().int().nonnegative(),
        earning: chefEarningSchema,
      }),
    ),
    options,
    select: (data) => ({
      booking: data.booking,
      surveysIssued: data.surveysIssued,
      earning: data.earning,
    }),
  });
}

const operationsBookingSchema = z.object({
  id: z.string().min(1),
  reference: z.string().min(1),
  status: bookingStatusSchema,
  type: z.string().min(1),
  customerId: z.string().nullable(),
  mainMealSlug: z.string().min(1),
  mainName: z.string().min(1),
  customRequest: z.string().nullable(),
  scheduledDate: z.string().min(1),
  timeSlot: z.string().min(1),
  estate: z.string().nullable(),
  unit: z.string().nullable(),
  street: z.string().min(1),
  serviceArea: z.string().nullable(),
  contactName: z.string().nullable(),
  contactEmail: z.string().nullable(),
  contactPhone: z.string().nullable(),
  goalId: z.string().nullable(),
  createdAt: z.string(),
  cook: z
    .object({
      id: z.string(),
      email: z.string(),
      displayName: z.string(),
      roles: z.array(z.string()),
    })
    .nullable(),
});

export type OperationsBooking = z.infer<typeof operationsBookingSchema>;

export async function fetchOperationsBookings(
  options: PlatformRequestOptions = {},
): Promise<OperationsBooking[]> {
  return requestData({
    path: "/api/v1/operations/booking-requests",
    method: "GET",
    schema: itemsEnvelope(operationsBookingSchema),
    options,
    select: (data) => data.items,
  });
}

export async function fetchAdminDashboard(
  options: PlatformRequestOptions = {},
): Promise<AdminDashboard> {
  return requestData({
    path: "/api/v1/operations/dashboard",
    method: "GET",
    schema: envelope(adminDashboardSchema),
    options,
  });
}

export async function fetchChefApplications(
  options: PlatformRequestOptions = {},
): Promise<ChefApplication[]> {
  return requestData({
    path: "/api/v1/operations/chef-applications",
    method: "GET",
    schema: itemsEnvelope(chefApplicationSchema),
    options,
    select: (data) => data.items,
  });
}

export async function updateChefApplication(
  applicationId: string,
  input: ChefApplicationUpdateInput,
  options: PlatformRequestOptions = {},
): Promise<ChefApplication> {
  return requestData({
    path: `/api/v1/operations/chef-applications/${encodeURIComponent(applicationId)}`,
    method: "PATCH",
    body: input,
    schema: envelope(chefApplicationSchema),
    options,
  });
}

export async function updateChefApplicationVerification(
  applicationId: string,
  input: ChefApplicationVerificationInput,
  options: PlatformRequestOptions = {},
): Promise<ChefApplication> {
  return requestData({
    path: `/api/v1/operations/chef-applications/${encodeURIComponent(applicationId)}/verification`,
    method: "PUT",
    body: input,
    schema: envelope(chefApplicationSchema),
    options,
  });
}

export async function markChefApplicationInterviewConducted(
  applicationId: string,
  options: PlatformRequestOptions = {},
): Promise<ChefApplication> {
  return updateChefApplication(applicationId, { interviewConducted: true }, options);
}

export async function inviteChefApplication(
  applicationId: string,
  options: PlatformRequestOptions = {},
): Promise<{ application: ChefApplication; deliveryStatus: "QUEUED" }> {
  return requestData({
    path: `/api/v1/operations/chef-applications/${encodeURIComponent(applicationId)}/invite`,
    method: "POST",
    schema: envelope(
      z.object({ application: chefApplicationSchema, deliveryStatus: z.literal("QUEUED") }),
    ),
    options,
  });
}

export async function fetchCustomers(
  options: PlatformRequestOptions = {},
): Promise<PlatformUser[]> {
  return requestData({
    path: "/api/v1/operations/customers",
    method: "GET",
    schema: itemsEnvelope(platformUserSchema),
    options,
    select: (data) => data.items,
  });
}

export async function fetchChefs(options: PlatformRequestOptions = {}): Promise<ChefSummary[]> {
  return requestData({
    path: "/api/v1/operations/chefs",
    method: "GET",
    schema: itemsEnvelope(chefSummarySchema),
    options,
    select: (data) => data.items,
  });
}

export async function fetchCommunicationLogs(
  options: PlatformRequestOptions = {},
): Promise<CommunicationLog[]> {
  return requestData({
    path: "/api/v1/operations/communications?limit=50",
    method: "GET",
    schema: envelope(
      z.object({ items: z.array(communicationLogSchema), nextCursor: z.string().nullable() }),
    ),
    options,
    select: (data) => data.items,
  });
}

export async function fetchPopularMeals(
  options: PlatformRequestOptions = {},
): Promise<PopularMeal[]> {
  return requestData({
    path: "/api/v1/operations/analytics/popular-meals?limit=10",
    method: "GET",
    schema: itemsEnvelope(popularMealSchema),
    options,
    select: (data) => data.items,
  });
}

export async function logWhatsAppPreview(
  input: WhatsAppPreviewInput,
  options: PlatformRequestOptions = {},
): Promise<CommunicationLog> {
  return requestData({
    path: "/api/v1/operations/communications/whatsapp-preview",
    method: "POST",
    body: input,
    schema: envelope(communicationLogSchema),
    options,
  });
}

type RequestMethod = "GET" | "POST" | "PUT" | "PATCH";

interface RequestDataArgs<Schema extends z.ZodTypeAny, Result> {
  readonly path: string;
  readonly method: RequestMethod;
  readonly body?: unknown;
  readonly schema: Schema;
  readonly options: PlatformRequestOptions;
  readonly select?: (data: z.infer<Schema>["data"]) => Result;
}

async function requestData<Schema extends z.ZodTypeAny, Result = z.infer<Schema>["data"]>({
  path,
  method,
  body,
  schema,
  options,
  select,
}: RequestDataArgs<Schema, Result>): Promise<Result> {
  const response = await send(path, method, body, options);

  if (!response.ok) {
    throw new Error(
      await readApiErrorMessage(response, "Chefmate request failed (" + response.status + ")"),
    );
  }

  const parsed = schema.parse(await response.json());
  return select ? select(parsed.data) : (parsed.data as Result);
}

async function requestNoContent({
  path,
  method,
  options,
}: Pick<RequestDataArgs<z.ZodTypeAny, unknown>, "path" | "method" | "options">): Promise<void> {
  const response = await send(path, method, undefined, options);
  if (!response.ok) {
    throw new Error(
      await readApiErrorMessage(response, "Chefmate request failed (" + response.status + ")"),
    );
  }
}

async function send(
  path: string,
  method: RequestMethod,
  body: unknown,
  options: PlatformRequestOptions,
): Promise<Response> {
  const init: RequestInit = {
    method,
    credentials: "include",
    ...(body === undefined
      ? {}
      : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  };

  return (options.fetchImpl ?? fetch)(apiUrl(options.baseUrl ?? getChefmateApiUrl(), path), init);
}

function apiUrl(baseUrl: string, path: string): string {
  const trimmed = baseUrl.trim().replace(/\/$/, "");
  if (!trimmed) throw new Error("Chefmate API URL is not configured.");
  return trimmed + path;
}

// ── Campaign leads ──────────────────────────────────────────────

export interface CampaignLead {
  readonly id: string;
  readonly campaignCode: string;
  readonly firstName: string | null;
  readonly email: string | null;
  readonly mobileNumber: string | null;
  readonly ageRange: string | null;
  readonly suburb: string | null;
  readonly householdType: string | null;
  readonly lifestyle: string | null;
  readonly cookingFrequency: string | null;
  readonly dinnerPainPoints: readonly string[];
  readonly expectedUseCases: readonly string[];
  readonly intendedBookingFreq: string | null;
  readonly topPriorities: readonly string[];
  readonly selfReportedSource: string | null;
  readonly utmSource: string | null;
  readonly utmMedium: string | null;
  readonly utmCampaign: string | null;
  readonly utmContent: string | null;
  readonly status: string;
  readonly marketingEmailOptIn: boolean;
  readonly marketingWhatsappOptIn: boolean;
  readonly marketingSmsOptIn: boolean;
  readonly promotionExpiry: string | null;
  readonly bookingId: string | null;
  readonly createdAt: string;
}

const campaignLeadSchema = z.object({
  id: z.string(),
  campaignCode: z.string(),
  firstName: z.string().nullable(),
  email: z.string().nullable(),
  mobileNumber: z.string().nullable(),
  ageRange: z.string().nullable(),
  suburb: z.string().nullable(),
  householdType: z.string().nullable(),
  lifestyle: z.string().nullable(),
  cookingFrequency: z.string().nullable(),
  dinnerPainPoints: z.array(z.string()),
  expectedUseCases: z.array(z.string()),
  intendedBookingFreq: z.string().nullable(),
  topPriorities: z.array(z.string()),
  selfReportedSource: z.string().nullable(),
  utmSource: z.string().nullable(),
  utmMedium: z.string().nullable(),
  utmCampaign: z.string().nullable(),
  utmContent: z.string().nullable(),
  status: z.string(),
  marketingEmailOptIn: z.boolean(),
  marketingWhatsappOptIn: z.boolean(),
  marketingSmsOptIn: z.boolean(),
  promotionExpiry: z.string().nullable(),
  bookingId: z.string().nullable(),
  createdAt: z.string(),
});

export async function fetchCampaignLeads(
  campaignCode: string,
  options: PlatformRequestOptions = {},
): Promise<CampaignLead[]> {
  return requestData({
    path: `/api/v1/operations/campaign/leads?campaignCode=${encodeURIComponent(campaignCode)}`,
    method: "GET",
    schema: itemsEnvelope(campaignLeadSchema),
    options,
    select: (data) => data.items,
  });
}

// ── Policy acceptance ──────────────────────────────────────────────

const policyAcceptanceSchema = z.object({
  id: z.string(),
  userId: z.string(),
  policyKey: z.string(),
  version: z.string(),
  acceptedAt: z.string(),
});

const policyStatusSchema = z.object({
  policyKey: z.string(),
  title: z.string(),
  documentPath: z.string(),
  requiredVersion: z.string(),
  effectiveAt: z.string(),
  required: z.boolean(),
  accepted: z.boolean(),
  stale: z.boolean(),
  acceptedVersion: z.string().nullable(),
  acceptedAt: z.string().nullable(),
});

export interface PolicyAcceptResult {
  readonly id: string;
  readonly userId: string;
  readonly policyKey: string;
  readonly version: string;
  readonly acceptedAt: string;
}

export interface PolicyStatusItem {
  readonly policyKey: string;
  readonly title: string;
  readonly documentPath: string;
  readonly requiredVersion: string;
  readonly effectiveAt: string;
  readonly required: boolean;
  readonly accepted: boolean;
  readonly stale: boolean;
  readonly acceptedVersion: string | null;
  readonly acceptedAt: string | null;
}

export async function acceptPolicy(
  policyKey: string,
  expectedVersion: string,
  options: PlatformRequestOptions = {},
): Promise<PolicyAcceptResult> {
  return requestData({
    path: "/api/v1/policies/accept",
    method: "POST",
    body: { policyKey, expectedVersion },
    schema: envelope(policyAcceptanceSchema),
    options,
  });
}

export async function fetchPolicyStatus(
  options: PlatformRequestOptions = {},
): Promise<PolicyStatusItem[]> {
  return requestData({
    path: "/api/v1/policies/status",
    method: "GET",
    schema: envelope(z.object({ items: z.array(policyStatusSchema) })),
    options,
    select: (data) => data.items,
  });
}

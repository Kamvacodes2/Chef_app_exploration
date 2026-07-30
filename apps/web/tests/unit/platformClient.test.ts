import { describe, expect, it, vi } from "vitest";
import {
  acceptChefOffer,
  completeChefBooking,
  consumeChefMagicLink,
  declineChefOffer,
  fetchAdminDashboard,
  fetchChefApplications,
  fetchChefBookings,
  fetchChefOffers,
  fetchChefProfile,
  fetchChefs,
  fetchCommunicationLogs,
  fetchCustomers,
  fetchPopularMeals,
  inviteChefApplication,
  logWhatsAppPreview,
  markChefApplicationInterviewConducted,
  markChefEnRoute,
  submitChefApplication,
  updateChefApplication,
  updateChefBankDetails,
  updateChefProfile,
} from "@/features/platform/api/platformClient";

const application = {
  id: "application-1",
  fullName: "Nomsa Dlamini",
  email: "nomsa@example.test",
  phone: "+27821234567",
  city: "Johannesburg",
  serviceAreas: ["Fourways", "Sandton"],
  experience: "Ten years of private chef and event cooking experience.",
  status: "APPLIED",
  interviewScheduledAt: null,
  interviewConductedAt: null,
  adminNotes: null,
  invitedUserId: null,
  invitedAt: null,
  rejectedAt: null,
  appliedAt: "2026-07-30T08:00:00.000Z",
  updatedAt: "2026-07-30T08:00:00.000Z",
};

const user = {
  id: "chef-1",
  email: "nomsa@example.test",
  displayName: "Nomsa Dlamini",
  roles: ["COOK"],
  status: "ACTIVE",
  emailVerifiedAt: null,
  createdAt: "2026-07-30T08:00:00.000Z",
};

const bankAccount = {
  accountHolder: "Nomsa Dlamini",
  bankName: "Capitec",
  branchCode: "470010",
  accountNumberLast4: "1234",
  accountType: "Savings",
  updatedAt: "2026-07-30T08:30:00.000Z",
};

const profile = {
  userId: "chef-1",
  displayName: "Nomsa Dlamini",
  email: "nomsa@example.test",
  isAvailable: true,
  serviceArea: "Fourways",
  serviceAreas: ["Fourways", "Sandton"],
  bio: "Private chef.",
  latitude: null,
  longitude: null,
  maxTravelKm: 35,
  availability: { notes: "Weekends" },
  bankAccount,
  createdAt: "2026-07-30T08:00:00.000Z",
  updatedAt: "2026-07-30T08:45:00.000Z",
};

const booking = {
  id: "booking-1",
  reference: "CM-0001",
  status: "CHEF_MATCHED",
  type: "STANDARD",
  source: "LANDING_ORDER_FLOW",
  idempotencyKey: "idem-1",
  idempotencyPayloadHash: "hash-1",
  customerId: "customer-1",
  mainMealSlug: "chicken-peri-peri",
  mainName: "Chicken peri-peri",
  customRequest: null,
  scheduledDate: "2026-08-15",
  timeSlot: "18:30",
  estate: "Dainfern",
  unit: null,
  street: "12 Jacaranda Ave",
  serviceArea: "Fourways",
  latitude: null,
  longitude: null,
  contactName: "Test Customer",
  contactEmail: "customer@example.test",
  contactPhone: "+27821234567",
  goalId: null,
  promotionCodeHash: null,
  pricing: {
    subtotalCents: 99500,
    discountCents: 0,
    totalCents: 99500,
    items: [
      {
        kind: "main",
        slug: "chicken-peri-peri",
        name: "Chicken peri-peri",
        priceCents: 0,
        sortOrder: 1,
      },
    ],
  },
  createdAt: "2026-07-30T09:00:00.000Z",
  cook: {
    id: "chef-1",
    email: "nomsa@example.test",
    displayName: "Nomsa Dlamini",
    roles: ["COOK"],
  },
  transitions: [],
};

const offer = {
  id: "offer-1",
  bookingRequestId: "booking-1",
  cookUserId: "chef-1",
  status: "PENDING",
  rank: 1,
  distanceKm: 4.3,
  chefPayoutCents: 64675,
  expiresAt: "2026-08-01T10:00:00.000Z",
  createdAt: "2026-07-30T09:05:00.000Z",
  booking: {
    id: "booking-1",
    reference: "CM-0001",
    mainName: "Chicken peri-peri",
    scheduledDate: "2026-08-15",
    timeSlot: "18:30",
    serviceArea: "Fourways",
    totalCents: 99500,
  },
};

const earning = {
  id: "earning-1",
  bookingRequestId: "booking-1",
  bookingReference: "CM-0001",
  cookUserId: "chef-1",
  cookDisplayName: "Nomsa Dlamini",
  grossCents: 99500,
  chefPayoutCents: 64675,
  platformRevenueCents: 34825,
  chefPayoutShareBasisPoints: 6500,
  status: "PENDING",
  payoutReference: null,
  createdAt: "2026-08-15T20:00:00.000Z",
};

describe("platformClient", () => {
  it("submits chef applications to the public backend pipeline", async () => {
    const fetchImpl = mockFetch({ data: application });

    await expect(
      submitChefApplication(
        {
          fullName: application.fullName,
          email: application.email,
          phone: application.phone,
          city: application.city,
          serviceAreas: application.serviceAreas,
          experience: application.experience,
        },
        { baseUrl: "http://api.test", fetchImpl },
      ),
    ).resolves.toMatchObject({ id: application.id, status: "APPLIED" });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api.test/api/v1/chef-applications",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: expect.stringContaining(application.email),
      }),
    );
  });

  it("consumes chef magic links into an authenticated chef session", async () => {
    const fetchImpl = mockFetch({ data: { user } });

    await expect(
      consumeChefMagicLink("signed-token-for-chef-portal", {
        baseUrl: "http://api.test",
        fetchImpl,
      }),
    ).resolves.toMatchObject({ email: user.email, roles: ["COOK"] });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api.test/api/v1/chef/magic-login",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
  });

  it("saves chef profile and bank details against the chef portal endpoints", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: profile }))
      .mockResolvedValueOnce(jsonResponse({ data: bankAccount })) as unknown as typeof fetch;

    await expect(
      updateChefProfile(
        {
          isAvailable: true,
          serviceArea: "Fourways",
          serviceAreas: ["Fourways"],
          bio: "Private chef.",
          latitude: null,
          longitude: null,
          maxTravelKm: 35,
          availability: { notes: "Weekends" },
        },
        { baseUrl: "http://api.test", fetchImpl },
      ),
    ).resolves.toMatchObject({ serviceArea: "Fourways" });

    await expect(
      updateChefBankDetails(
        {
          accountHolder: bankAccount.accountHolder,
          bankName: bankAccount.bankName,
          branchCode: bankAccount.branchCode,
          accountNumber: "1234561234",
          accountType: "Savings",
        },
        { baseUrl: "http://api.test", fetchImpl },
      ),
    ).resolves.toMatchObject({ accountNumberLast4: "1234" });

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "http://api.test/api/v1/chef/profile",
      expect.objectContaining({ method: "PUT", credentials: "include" }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "http://api.test/api/v1/chef/bank-details",
      expect.objectContaining({ method: "PUT", credentials: "include" }),
    );
  });

  it("connects offer acceptance and booking completion to chef payouts", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: { items: [offer] } }))
      .mockResolvedValueOnce(
        jsonResponse({ data: { booking, offer: { ...offer, status: "ACCEPTED" } } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { booking: { ...booking, status: "COMPLETED" }, surveysIssued: 2, earning },
        }),
      ) as unknown as typeof fetch;

    await expect(fetchChefOffers({ baseUrl: "http://api.test", fetchImpl })).resolves.toHaveLength(
      1,
    );
    await expect(
      acceptChefOffer("offer-1", { baseUrl: "http://api.test", fetchImpl }),
    ).resolves.toMatchObject({
      offer: { chefPayoutCents: 64675 },
    });
    await expect(
      completeChefBooking("booking-1", null, { baseUrl: "http://api.test", fetchImpl }),
    ).resolves.toMatchObject({
      earning: { chefPayoutCents: 64675 },
      surveysIssued: 2,
    });
  });

  it("loads admin metrics and creates portal invites plus WhatsApp preview logs", async () => {
    const dashboard = {
      customersCount: 3,
      chefsCount: 1,
      chefApplicationsCount: 1,
      chefApplicationStatusCounts: { APPLIED: 1 },
      bookingsThisMonthCount: 2,
      collectedThisMonthCents: 199000,
      chefPayableCents: 64675,
      platformRevenueCents: 34825,
      communicationsQueuedCount: 4,
      communicationsSentCount: 1,
      whatsAppReady: false,
    };
    const communicationLog = {
      id: "log-1",
      channel: "WHATSAPP",
      status: "SKIPPED",
      recipient: "+27000000000",
      subject: null,
      templateKey: "admin.whatsapp-preview",
      bodyPreview: "Preview message",
      provider: "meta-whatsapp",
      relatedBookingRequestId: null,
      relatedUserId: null,
      metadata: { reason: "whatsapp_number_not_configured" },
      sentAt: null,
      createdAt: "2026-07-30T10:00:00.000Z",
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: dashboard }))
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            application: { ...application, status: "INVITED" },
            magicLinkUrl: "https://app.test/chef/magic-login?token=abc",
          },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ data: communicationLog })) as unknown as typeof fetch;

    await expect(
      fetchAdminDashboard({ baseUrl: "http://api.test", fetchImpl }),
    ).resolves.toMatchObject({
      platformRevenueCents: 34825,
    });
    await expect(
      inviteChefApplication("application-1", { baseUrl: "http://api.test", fetchImpl }),
    ).resolves.toMatchObject({
      magicLinkUrl: "https://app.test/chef/magic-login?token=abc",
    });
    await expect(
      logWhatsAppPreview(
        {
          recipient: "+27000000000",
          templateKey: "admin.whatsapp-preview",
          bodyPreview: "Preview message",
        },
        { baseUrl: "http://api.test", fetchImpl },
      ),
    ).resolves.toMatchObject({ channel: "WHATSAPP", status: "SKIPPED" });
  });
  it("loads chef portal read endpoints without request bodies", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: profile }))
      .mockResolvedValueOnce(
        jsonResponse({ data: { items: [booking] } }),
      ) as unknown as typeof fetch;

    await expect(
      fetchChefProfile({ baseUrl: "http://api.test/", fetchImpl }),
    ).resolves.toMatchObject({ userId: "chef-1" });
    await expect(fetchChefBookings({ baseUrl: "http://api.test", fetchImpl })).resolves.toEqual([
      expect.objectContaining({ reference: "CM-0001" }),
    ]);

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "http://api.test/api/v1/chef/profile",
      expect.objectContaining({ method: "GET", credentials: "include" }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "http://api.test/api/v1/chef/bookings",
      expect.not.objectContaining({ body: expect.any(String) }),
    );
  });

  it("posts chef action endpoints with encoded identifiers", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: { ...booking, status: "EN_ROUTE" } }))
      .mockResolvedValueOnce({ ok: true, status: 204 }) as unknown as typeof fetch;

    await expect(
      markChefEnRoute("booking/with space", "On my way", { baseUrl: "http://api.test", fetchImpl }),
    ).resolves.toMatchObject({ status: "EN_ROUTE" });
    await expect(
      declineChefOffer("offer/with space", { baseUrl: "http://api.test", fetchImpl }),
    ).resolves.toBeUndefined();

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "http://api.test/api/v1/chef/bookings/booking%2Fwith%20space/en-route",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ note: "On my way" }) }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "http://api.test/api/v1/chef/offers/offer%2Fwith%20space/decline",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
  });

  it("loads admin lists, analytics, and application state transitions", async () => {
    const customer = {
      id: "customer-1",
      email: "customer@example.test",
      displayName: "Test Customer",
      roles: ["CUSTOMER"],
      status: "ACTIVE",
      createdAt: "2026-07-30T08:00:00.000Z",
    };
    const chef = {
      ...user,
      profile: { ...profile, bankAccount: undefined },
      bankAccount,
    };
    const communicationLog = {
      id: "log-1",
      channel: "EMAIL",
      status: "SENT",
      recipient: "customer@example.test",
      subject: "Chefmate booking update",
      templateKey: "booking.customer.confirmed",
      bodyPreview: "Your chef is confirmed.",
      provider: "resend",
      relatedBookingRequestId: "booking-1",
      relatedUserId: "customer-1",
      metadata: { reference: "CM-0001" },
      sentAt: "2026-07-30T10:00:00.000Z",
      createdAt: "2026-07-30T09:59:00.000Z",
    };
    const popularMeal = {
      slug: "chicken-peri-peri",
      name: "Chicken peri-peri",
      kind: "main",
      orderCount: 6,
      grossCents: 597000,
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: { items: [application] } }))
      .mockResolvedValueOnce(
        jsonResponse({ data: { ...application, status: "INTERVIEW_SCHEDULED" } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ data: { ...application, status: "INTERVIEW_CONDUCTED" } }),
      )
      .mockResolvedValueOnce(jsonResponse({ data: { items: [customer] } }))
      .mockResolvedValueOnce(jsonResponse({ data: { items: [chef] } }))
      .mockResolvedValueOnce(
        jsonResponse({ data: { items: [communicationLog], nextCursor: null } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ data: { items: [popularMeal] } }),
      ) as unknown as typeof fetch;

    await expect(fetchChefApplications({ baseUrl: "http://api.test", fetchImpl })).resolves.toEqual(
      [expect.objectContaining({ id: "application-1" })],
    );
    await expect(
      updateChefApplication(
        "application/with space",
        { status: "INTERVIEW_SCHEDULED", interviewScheduledAt: "2026-08-01T10:00:00.000Z" },
        { baseUrl: "http://api.test", fetchImpl },
      ),
    ).resolves.toMatchObject({ status: "INTERVIEW_SCHEDULED" });
    await expect(
      markChefApplicationInterviewConducted("application-1", {
        baseUrl: "http://api.test",
        fetchImpl,
      }),
    ).resolves.toMatchObject({ status: "INTERVIEW_CONDUCTED" });
    await expect(fetchCustomers({ baseUrl: "http://api.test", fetchImpl })).resolves.toHaveLength(
      1,
    );
    await expect(fetchChefs({ baseUrl: "http://api.test", fetchImpl })).resolves.toHaveLength(1);
    await expect(
      fetchCommunicationLogs({ baseUrl: "http://api.test", fetchImpl }),
    ).resolves.toEqual([expect.objectContaining({ templateKey: "booking.customer.confirmed" })]);
    await expect(fetchPopularMeals({ baseUrl: "http://api.test", fetchImpl })).resolves.toEqual([
      expect.objectContaining({ orderCount: 6 }),
    ]);

    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "http://api.test/api/v1/operations/chef-applications/application%2Fwith%20space",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      6,
      "http://api.test/api/v1/operations/communications?limit=50",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("preserves API error messages and rejects empty API URLs", async () => {
    const failedDataRequest = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ message: "Applications are closed for this week" }),
    }) as unknown as typeof fetch;
    const failedNoContentRequest = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: "Offer already expired" }),
    }) as unknown as typeof fetch;

    await expect(
      submitChefApplication(
        {
          fullName: application.fullName,
          email: application.email,
          phone: application.phone,
          city: application.city,
          serviceAreas: application.serviceAreas,
          experience: application.experience,
        },
        { baseUrl: "http://api.test", fetchImpl: failedDataRequest },
      ),
    ).rejects.toThrow("Applications are closed for this week");
    await expect(
      declineChefOffer("offer-1", {
        baseUrl: "http://api.test",
        fetchImpl: failedNoContentRequest,
      }),
    ).rejects.toThrow("Offer already expired");
    await expect(fetchAdminDashboard({ baseUrl: "   ", fetchImpl: vi.fn() })).rejects.toThrow(
      "Chefmate API URL is not configured",
    );
  });
});

function mockFetch(body: unknown): typeof fetch {
  return vi.fn().mockResolvedValue(jsonResponse(body)) as unknown as typeof fetch;
}

function jsonResponse(body: unknown): Pick<Response, "json" | "ok" | "status"> {
  return { ok: true, status: 200, json: async () => body };
}

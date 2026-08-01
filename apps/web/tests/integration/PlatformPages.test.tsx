import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminDashboardPage } from "@/features/platform/AdminDashboardPage";
import { ChefApplicationPage } from "@/features/platform/ChefApplicationPage";
import { ChefMagicLoginPage } from "@/features/platform/ChefMagicLoginPage";
import { ChefPortalPage } from "@/features/platform/ChefPortalPage";

const api = vi.hoisted(() => ({
  acceptChefOffer: vi.fn(),
  completeChefBooking: vi.fn(),
  consumeChefMagicLink: vi.fn(),
  declineChefOffer: vi.fn(),
  fetchAdminDashboard: vi.fn(),
  fetchChefApplications: vi.fn(),
  fetchChefBookings: vi.fn(),
  fetchChefOffers: vi.fn(),
  fetchChefProfile: vi.fn(),
  fetchChefs: vi.fn(),
  fetchCommunicationLogs: vi.fn(),
  fetchCustomers: vi.fn(),
  fetchPopularMeals: vi.fn(),
  inviteChefApplication: vi.fn(),
  logWhatsAppPreview: vi.fn(),
  markChefApplicationInterviewConducted: vi.fn(),
  markChefEnRoute: vi.fn(),
  submitChefApplication: vi.fn(),
  updateChefApplication: vi.fn(),
  updateChefBankDetails: vi.fn(),
  updateChefProfile: vi.fn(),
}));

vi.mock("@/features/platform/api/platformClient", () => api);

const featuredMealsApi = vi.hoisted(() => ({
  FEATURED_MEAL_COUNT: 6,
  fetchCatalogMeals: vi.fn().mockResolvedValue([]),
  fetchFeaturedMeals: vi.fn(),
  updateFeaturedMeals: vi.fn(),
  FeaturedMealsError: class extends Error {},
}));

vi.mock("@/features/featured-meals/api/featuredMealsClient", () => featuredMealsApi);

const application = {
  id: "application-1",
  fullName: "Nomsa Dlamini",
  email: "nomsa@example.test",
  phone: "+27821234567",
  city: "Johannesburg",
  serviceAreas: ["Fourways"],
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

const chefProfile = {
  userId: "chef-1",
  displayName: "Nomsa Dlamini",
  email: "nomsa@example.test",
  isAvailable: true,
  serviceArea: "Fourways",
  serviceAreas: ["Fourways"],
  bio: "Private chef.",
  latitude: null,
  longitude: null,
  maxTravelKm: 30,
  availability: { notes: "Weekends" },
  bankAccount: null,
  createdAt: "2026-07-30T08:00:00.000Z",
  updatedAt: "2026-07-30T08:00:00.000Z",
};

const offer = {
  id: "offer-1",
  bookingRequestId: "booking-1",
  chefUserId: "chef-1",
  status: "PENDING",
  rank: 1,
  distanceKm: 4,
  chefPayoutCents: 64675,
  expiresAt: "2026-08-01T10:00:00.000Z",
  createdAt: "2026-07-30T09:00:00.000Z",
  booking: {
    id: "booking-1",
    reference: "CM-0001",
    mainName: "Chicken peri-peri",
    scheduledDate: "2026-08-15",
    timeSlot: "18:30",
    serviceArea: "Fourways",
  },
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
  createdAt: "2026-07-30T09:00:00.000Z",
  transitions: [],
};

describe("platform pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    featuredMealsApi.fetchCatalogMeals.mockResolvedValue([]);
    window.history.replaceState(null, "", "/");
  });

  it("submits chef applications into the backend pipeline", async () => {
    api.submitChefApplication.mockResolvedValue(application);
    render(<ChefApplicationPage />);

    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Nomsa Dlamini" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "nomsa@example.test" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "+27821234567" } });
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Johannesburg" } });
    fireEvent.change(screen.getByLabelText("Service areas"), {
      target: { value: "Fourways, Sandton" },
    });
    fireEvent.change(screen.getByLabelText("Cooking experience"), {
      target: { value: "Ten years of private chef and event cooking experience." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit application" }));

    await expect(screen.findByRole("status")).resolves.toHaveTextContent("Application received");
    expect(api.submitChefApplication).toHaveBeenCalledWith(
      expect.objectContaining({ serviceAreas: ["Fourways", "Sandton"] }),
    );
  });

  it("consumes chef magic links and sends chefs into the portal", async () => {
    api.consumeChefMagicLink.mockResolvedValue({
      id: "chef-1",
      email: "nomsa@example.test",
      displayName: "Nomsa Dlamini",
      roles: ["CHEF"],
      status: "ACTIVE",
      createdAt: "2026-07-30T08:00:00.000Z",
    });

    render(<ChefMagicLoginPage token="valid-magic-token" />);

    await expect(screen.findByRole("link", { name: "Open chef portal" })).resolves.toHaveAttribute(
      "href",
      "/chef/portal",
    );
    expect(api.consumeChefMagicLink).toHaveBeenCalledWith("valid-magic-token");
  });

  it("consumes fragment chef magic links and clears the browser hash", async () => {
    api.consumeChefMagicLink.mockResolvedValue({
      id: "chef-1",
      email: "nomsa@example.test",
      displayName: "Nomsa Dlamini",
      roles: ["CHEF"],
      status: "ACTIVE",
      createdAt: "2026-07-30T08:00:00.000Z",
    });
    window.history.replaceState(null, "", "/chef/magic-login#token=fragment-magic-token");

    render(<ChefMagicLoginPage token={null} />);

    await waitFor(() =>
      expect(api.consumeChefMagicLink).toHaveBeenCalledWith("fragment-magic-token"),
    );
    expect(window.location.hash).toBe("");
  });

  it("connects chef portal offers, bank details, and session actions", async () => {
    api.fetchChefProfile.mockResolvedValue(chefProfile);
    api.fetchChefOffers.mockResolvedValue([offer]);
    api.fetchChefBookings.mockResolvedValue([booking]);
    api.acceptChefOffer.mockResolvedValue({ booking, offer: { ...offer, status: "ACCEPTED" } });
    api.updateChefBankDetails.mockResolvedValue({
      accountHolder: "Nomsa Dlamini",
      bankName: "Capitec",
      branchCode: "470010",
      accountNumberLast4: "1234",
      accountType: "Savings",
      updatedAt: "2026-07-30T10:00:00.000Z",
    });
    api.completeChefBooking.mockResolvedValue({
      booking: { ...booking, status: "COMPLETED" },
      surveysIssued: 2,
      earning: { chefPayoutCents: 64675 },
    });

    render(<ChefPortalPage />);

    await waitFor(() => expect(screen.getAllByText("Chicken peri-peri").length).toBeGreaterThan(0));
    expect(screen.getByText(/You receive/)).toHaveTextContent("646");

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    await waitFor(() => expect(api.acceptChefOffer).toHaveBeenCalledWith("offer-1"));

    fireEvent.change(screen.getByLabelText("Account holder"), {
      target: { value: "Nomsa Dlamini" },
    });
    fireEvent.change(screen.getByLabelText("Bank name"), { target: { value: "Capitec" } });
    fireEvent.change(screen.getByLabelText("Branch code"), { target: { value: "470010" } });
    fireEvent.change(screen.getByLabelText("Account number"), { target: { value: "1234561234" } });
    fireEvent.change(screen.getByLabelText("Account type"), { target: { value: "Savings" } });
    fireEvent.click(screen.getByRole("button", { name: "Save bank details" }));

    await waitFor(() =>
      expect(api.updateChefBankDetails).toHaveBeenCalledWith(
        expect.objectContaining({ accountNumber: "1234561234" }),
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Complete booking" }));
    await waitFor(() => expect(api.completeChefBooking).toHaveBeenCalledWith("booking-1", null));
  });

  it("connects admin dashboard application invites and communication logs", async () => {
    api.fetchAdminDashboard.mockResolvedValue({
      customersCount: 3,
      chefsCount: 1,
      chefApplicationsCount: 1,
      chefApplicationStatusCounts: { APPROVED: 1 },
      bookingsThisMonthCount: 2,
      collectedThisMonthCents: 199000,
      chefPayableCents: 64675,
      platformRevenueCents: 34825,
      communicationsQueuedCount: 4,
      communicationsSentCount: 1,
      whatsAppReady: false,
    });
    const approvedApplication = { ...application, status: "APPROVED" as const };
    api.fetchChefApplications.mockResolvedValue([approvedApplication]);
    api.fetchCustomers.mockResolvedValue([
      {
        id: "customer-1",
        email: "customer@example.test",
        displayName: "Test Customer",
        roles: ["CUSTOMER"],
        status: "ACTIVE",
        createdAt: "2026-07-30T08:00:00.000Z",
      },
    ]);
    api.fetchChefs.mockResolvedValue([
      {
        id: "chef-1",
        email: "nomsa@example.test",
        displayName: "Nomsa Dlamini",
        roles: ["CHEF"],
        status: "ACTIVE",
        createdAt: "2026-07-30T08:00:00.000Z",
        profile: null,
        bankAccount: null,
      },
    ]);
    api.fetchCommunicationLogs.mockResolvedValue([]);
    api.fetchPopularMeals.mockResolvedValue([
      {
        slug: "chicken-peri-peri",
        name: "Chicken peri-peri",
        kind: "main",
        orderCount: 4,
        grossCents: 398000,
      },
    ]);
    api.inviteChefApplication.mockResolvedValue({
      application: { ...approvedApplication, status: "INVITED" },
      deliveryStatus: "QUEUED",
    });
    api.logWhatsAppPreview.mockResolvedValue({
      id: "log-1",
      channel: "WHATSAPP",
      status: "SKIPPED",
      recipient: "+27000000000",
      templateKey: "admin.whatsapp-preview",
      bodyPreview: "Preview message",
      subject: null,
      provider: "meta-whatsapp",
      relatedBookingRequestId: null,
      relatedUserId: null,
      metadata: null,
      sentAt: null,
      createdAt: "2026-07-30T10:00:00.000Z",
    });

    render(<AdminDashboardPage />);

    await expect(screen.findByText("Platform revenue")).resolves.toBeInTheDocument();
    expect(screen.getAllByText("Nomsa Dlamini").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Send portal access" }));
    await waitFor(() => expect(api.inviteChefApplication).toHaveBeenCalledWith("application-1"));
    expect(await screen.findByRole("status")).toHaveTextContent("invite queued");

    fireEvent.click(screen.getByRole("tab", { name: "Communication controls" }));
    fireEvent.click(screen.getByRole("button", { name: "Log WhatsApp preview" }));
    await waitFor(() => expect(api.logWhatsAppPreview).toHaveBeenCalled());
  });

  it("approves an interview-conducted chef application from the admin dashboard", async () => {
    api.fetchAdminDashboard.mockResolvedValue({
      customersCount: 0,
      chefsCount: 0,
      chefApplicationsCount: 1,
      chefApplicationStatusCounts: { INTERVIEW_CONDUCTED: 1 },
      bookingsThisMonthCount: 0,
      collectedThisMonthCents: 0,
      chefPayableCents: 0,
      platformRevenueCents: 0,
      communicationsQueuedCount: 0,
      communicationsSentCount: 0,
      whatsAppReady: false,
    });
    const interviewedApplication = {
      ...application,
      status: "INTERVIEW_CONDUCTED" as const,
      interviewConductedAt: "2026-07-30T09:00:00.000Z",
    };
    api.fetchChefApplications.mockResolvedValue([interviewedApplication]);
    api.fetchCustomers.mockResolvedValue([]);
    api.fetchChefs.mockResolvedValue([]);
    api.fetchCommunicationLogs.mockResolvedValue([]);
    api.fetchPopularMeals.mockResolvedValue([]);
    api.updateChefApplication.mockResolvedValue({
      ...interviewedApplication,
      status: "APPROVED",
    });

    render(<AdminDashboardPage />);

    await expect(screen.findByText("Platform revenue")).resolves.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() =>
      expect(api.updateChefApplication).toHaveBeenCalledWith("application-1", {
        status: "APPROVED",
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("has been approved");
    expect(await screen.findByText(/Status: APPROVED/)).toBeInTheDocument();
  });

  it("shows one admin section at a time and keeps the metrics strip visible while switching", async () => {
    api.fetchAdminDashboard.mockResolvedValue({
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
    });
    api.fetchChefApplications.mockResolvedValue([application]);
    api.fetchCustomers.mockResolvedValue([
      {
        id: "customer-1",
        email: "customer@example.test",
        displayName: "Test Customer",
        roles: ["CUSTOMER"],
        status: "ACTIVE",
        createdAt: "2026-07-30T08:00:00.000Z",
      },
    ]);
    api.fetchChefs.mockResolvedValue([]);
    api.fetchCommunicationLogs.mockResolvedValue([]);
    api.fetchPopularMeals.mockResolvedValue([
      {
        slug: "chicken-peri-peri",
        name: "Chicken peri-peri",
        kind: "main",
        orderCount: 4,
        grossCents: 398000,
      },
    ]);

    render(<AdminDashboardPage />);

    await expect(screen.findByText("Platform revenue")).resolves.toBeInTheDocument();

    // Default section is the chef applications pipeline; nothing else is rendered.
    expect(screen.getByRole("heading", { name: "Chef applications pipeline" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Chef applications pipeline" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.queryByRole("heading", { name: "Customers" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Popular meals" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("featured-meals-panel")).not.toBeInTheDocument();

    // Switching sections swaps the visible panel.
    fireEvent.click(screen.getByRole("tab", { name: "Customers" }));
    expect(screen.getByRole("heading", { name: "Customers" })).toBeInTheDocument();
    expect(screen.getByText("Test Customer")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Chef applications pipeline" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Featured meals" }));
    expect(await screen.findByTestId("featured-meals-panel")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Customers" })).not.toBeInTheDocument();

    // The metrics strip stays mounted no matter which section is active.
    expect(screen.getByText("Platform revenue")).toBeInTheDocument();
    expect(screen.getByText("Comms queued/sent")).toBeInTheDocument();

    // The single upfront fetch is not repeated when switching sections.
    expect(api.fetchAdminDashboard).toHaveBeenCalledTimes(1);
    expect(api.fetchCustomers).toHaveBeenCalledTimes(1);
  });

  it("moves between admin sections with arrow keys from the tablist", async () => {
    api.fetchAdminDashboard.mockResolvedValue({
      customersCount: 0,
      chefsCount: 0,
      chefApplicationsCount: 0,
      chefApplicationStatusCounts: {},
      bookingsThisMonthCount: 0,
      collectedThisMonthCents: 0,
      chefPayableCents: 0,
      platformRevenueCents: 0,
      communicationsQueuedCount: 0,
      communicationsSentCount: 0,
      whatsAppReady: false,
    });
    api.fetchChefApplications.mockResolvedValue([]);
    api.fetchCustomers.mockResolvedValue([]);
    api.fetchChefs.mockResolvedValue([]);
    api.fetchCommunicationLogs.mockResolvedValue([]);
    api.fetchPopularMeals.mockResolvedValue([]);

    render(<AdminDashboardPage />);
    await expect(screen.findByText("Platform revenue")).resolves.toBeInTheDocument();

    const tablist = screen.getByRole("tablist", { name: "Admin dashboard sections" });
    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    expect(screen.getByRole("heading", { name: "Communication controls" })).toBeInTheDocument();

    fireEvent.keyDown(tablist, { key: "ArrowLeft" });
    expect(screen.getByRole("heading", { name: "Chef applications pipeline" })).toBeInTheDocument();

    fireEvent.keyDown(tablist, { key: "End" });
    expect(screen.getByRole("heading", { name: "Popular meals" })).toBeInTheDocument();

    fireEvent.keyDown(tablist, { key: "Home" });
    expect(screen.getByRole("heading", { name: "Chef applications pipeline" })).toBeInTheDocument();
  });
});

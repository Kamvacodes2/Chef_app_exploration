import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApplications } from "@/features/platform/AdminApplications";
import type { ChefVerification } from "@/features/platform/api/platformClient";

const api = vi.hoisted(() => ({
  fetchChefApplications: vi.fn(),
  inviteChefApplication: vi.fn(),
  listApplicationDocuments: vi.fn(),
  markChefApplicationInterviewConducted: vi.fn(),
  updateChefApplication: vi.fn(),
  updateChefApplicationVerification: vi.fn(),
}));
const authApi = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/platform/api/platformClient", () => api);
vi.mock("@/features/auth/api/authClient", () => authApi);

const baseApplication = {
  id: "application-base",
  fullName: "Nomsa Dlamini",
  email: "nomsa@example.test",
  phone: "+27821234567",
  city: "Johannesburg",
  serviceAreas: ["Fourways"],
  experience: "Ten years of private chef and event cooking experience.",
  status: "INTERVIEW_CONDUCTED",
  interviewScheduledAt: "2026-08-10T09:00:00.000Z",
  interviewConductedAt: "2026-08-12T09:00:00.000Z",
  adminNotes: null,
  invitedUserId: null,
  invitedAt: null,
  rejectedAt: null,
  appliedAt: "2026-08-01T08:00:00.000Z",
  updatedAt: "2026-08-12T09:00:00.000Z",
  verification: null,
};

const verification: ChefVerification = {
  provider: "HURU",
  status: "PASSED",
  providerReference: "HURU-2026-1001",
  providerOutcome: "CLEAR",
  consentVersion: "2026-08-18",
  consentedAt: "2026-08-12T10:00:00.000Z",
  reviewedAt: "2026-08-13T10:00:00.000Z",
  expiresAt: "2099-08-18T23:59:59.999Z",
};

const adminUser = {
  id: "admin-1",
  email: "admin@example.test",
  displayName: "Admin User",
  roles: ["ADMIN"],
  status: "ACTIVE",
  emailVerifiedAt: "2026-08-01T08:00:00.000Z",
  createdAt: "2026-08-01T08:00:00.000Z",
};

describe("HURU application operations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authApi.getCurrentUser.mockResolvedValue(adminUser);
    api.listApplicationDocuments.mockResolvedValue([]);
  });

  it("enables approval and portal invitation only for the correct application stage with a current PASSED check", async () => {
    api.fetchChefApplications.mockResolvedValue([
      namedApplication("No verification", { verification: null }),
      namedApplication("Expired verification", {
        verification: { ...verification, expiresAt: "2020-01-01T00:00:00.000Z" },
      }),
      namedApplication("Current verification", { verification }),
      namedApplication("Approved current verification", {
        status: "APPROVED",
        verification,
      }),
    ]);

    render(<AdminApplications />);
    await screen.findByRole("heading", { name: "No verification" });

    expect(buttonFor("No verification", "Approve")).toBeDisabled();
    expect(buttonFor("Expired verification", "Approve")).toBeDisabled();
    expect(buttonFor("Current verification", "Approve")).toBeEnabled();
    expect(buttonFor("Current verification", "Send Portal Access")).toBeDisabled();
    expect(buttonFor("Approved current verification", "Approve")).toBeDisabled();
    expect(buttonFor("Approved current verification", "Send Portal Access")).toBeEnabled();
    expect(articleFor("Expired verification")).toHaveTextContent(
      "blocked because the PASSED HURU verification has expired",
    );
    expect(articleFor("Current verification")).toHaveTextContent(
      "Current PASSED HURU verification recorded. Human approval remains required.",
    );
    expect(articleFor("No verification")).toHaveTextContent(
      "no background-check consent is recorded",
    );
    expect(
      within(articleFor("No verification")).queryByRole("link", { name: /Open HURU/ }),
    ).not.toBeInTheDocument();
    expect(
      within(articleFor("No verification")).queryByRole("button", { name: /Save HURU/ }),
    ).not.toBeInTheDocument();
    expect(
      within(articleFor("Current verification")).getByRole("link", { name: /Open HURU portal/ }),
    ).toHaveAttribute("href", "https://portal.huru.co.za/");
  });

  it("keeps HIT and provider-error outcomes in neutral human review and exposes no raw-report field", async () => {
    api.fetchChefApplications.mockResolvedValue([
      namedApplication("Review required", {
        verification: {
          ...verification,
          status: "REVIEW_REQUIRED",
          providerOutcome: "HIT",
          expiresAt: null,
        },
      }),
      namedApplication("Provider error", {
        verification: {
          ...verification,
          status: "ERROR",
          providerOutcome: null,
          expiresAt: null,
        },
      }),
    ]);

    render(<AdminApplications />);
    await screen.findByRole("heading", { name: "Review required" });

    expect(buttonFor("Review required", "Approve")).toBeDisabled();
    expect(articleFor("Review required")).toHaveTextContent("outcome HIT");
    expect(articleFor("Review required")).toHaveTextContent(
      "HIT and INCONCLUSIVE require human review and never reject an applicant automatically",
    );
    expect(buttonFor("Provider error", "Approve")).toBeDisabled();
    expect(articleFor("Provider error")).toHaveTextContent("current status is ERROR");
    expect(articleFor("Provider error")).toHaveTextContent("provider errors are neutral");
    expect(
      screen.queryByRole("textbox", { name: /report|offence|identity copy|PDF/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/report|offence|identity copy|PDF/i)).not.toBeInTheDocument();
  });

  it("gives SUPPORT a read-only verification summary without HURU portal or edit controls", async () => {
    authApi.getCurrentUser.mockResolvedValue({
      ...adminUser,
      id: "support-1",
      email: "support@example.test",
      displayName: "Support User",
      roles: ["SUPPORT"],
    });
    api.fetchChefApplications.mockResolvedValue([
      namedApplication("Support visible", { verification }),
    ]);

    render(<AdminApplications />);
    await screen.findByRole("heading", { name: "Support visible" });

    const article = articleFor("Support visible");
    expect(article).toHaveTextContent("HURU verification: HURU · PASSED");
    expect(article).toHaveTextContent("Provider reference: HURU-2026-1001 · outcome CLEAR");
    expect(article).toHaveTextContent("Verification details are read-only for your account.");
    expect(
      within(article).queryByRole("link", { name: /Open HURU portal/ }),
    ).not.toBeInTheDocument();
    expect(
      within(article).queryByRole("button", { name: /Save HURU result/ }),
    ).not.toBeInTheDocument();
  });

  it("requires confirmation before approving or sending portal access", async () => {
    const approval = namedApplication("Approval confirmation", { verification });
    const invited = namedApplication("Invite confirmation", { status: "APPROVED", verification });
    api.fetchChefApplications.mockResolvedValue([approval, invited]);
    api.updateChefApplication.mockResolvedValue({ ...approval, status: "APPROVED" });
    api.inviteChefApplication.mockResolvedValue({
      application: { ...invited, status: "INVITED" },
      deliveryStatus: "QUEUED",
    });

    render(<AdminApplications />);
    await screen.findByRole("heading", { name: "Approval confirmation" });

    fireEvent.click(buttonFor("Approval confirmation", "Approve"));
    expect(await screen.findByRole("dialog")).toHaveTextContent("Approve this application?");
    expect(api.updateChefApplication).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(buttonFor("Approval confirmation", "Approve"));
    fireEvent.click(screen.getByRole("button", { name: "Approve application" }));
    await waitFor(() =>
      expect(api.updateChefApplication).toHaveBeenCalledWith("application-approval-confirmation", {
        status: "APPROVED",
      }),
    );

    fireEvent.click(buttonFor("Invite confirmation", "Send Portal Access"));
    expect(await screen.findByRole("dialog")).toHaveTextContent("Send portal access?");
    expect(api.inviteChefApplication).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm and send" }));
    await waitFor(() =>
      expect(api.inviteChefApplication).toHaveBeenCalledWith("application-invite-confirmation"),
    );
  });

  it("submits explicit nulls for cleared optional fields and reflects the returned summary", async () => {
    const application = namedApplication("Cleared summary", { verification });
    api.fetchChefApplications.mockResolvedValue([application]);
    api.updateChefApplicationVerification.mockResolvedValue({
      ...application,
      verification: {
        ...verification,
        status: "REVIEW_REQUIRED",
        providerReference: null,
        providerOutcome: null,
        expiresAt: null,
      },
    });

    render(<AdminApplications />);
    await screen.findByRole("heading", { name: "Cleared summary" });

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "REVIEW_REQUIRED" } });
    await waitFor(() => expect(screen.getByLabelText("Status")).toHaveValue("REVIEW_REQUIRED"));
    fireEvent.change(screen.getByLabelText("Provider reference"), { target: { value: "   " } });
    fireEvent.change(screen.getByLabelText("Provider outcome"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Expiry date (optional)"), { target: { value: "" } });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Save HURU result" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save HURU result" }));

    await waitFor(() =>
      expect(api.updateChefApplicationVerification).toHaveBeenCalledWith(
        "application-cleared-summary",
        {
          status: "REVIEW_REQUIRED",
          providerReference: null,
          providerOutcome: null,
          expiresAt: null,
        },
      ),
    );
    await waitFor(() => {
      expect(screen.getByLabelText("Provider reference")).toHaveValue("");
      expect(screen.getByLabelText("Provider outcome")).toHaveValue("");
      expect(screen.getByLabelText("Expiry date (optional)")).toHaveValue("");
    });
    expect(articleFor("Cleared summary")).toHaveTextContent("Provider reference: Not recorded");
  });

  it("blocks PASSED recording until an ADMIN supplies a reference and CLEAR or HIT outcome", async () => {
    api.fetchChefApplications.mockResolvedValue([
      namedApplication("Validation case", {
        verification: {
          ...verification,
          status: "REVIEW_REQUIRED",
          providerReference: null,
          providerOutcome: null,
          expiresAt: null,
        },
      }),
    ]);

    render(<AdminApplications />);
    await screen.findByRole("heading", { name: "Validation case" });

    const save = screen.getByRole("button", { name: "Save HURU result" });
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "PASSED" } });
    await waitFor(() => expect(screen.getByLabelText("Status")).toHaveValue("PASSED"));
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Provider reference"), {
      target: { value: "HURU-2002" },
    });
    await waitFor(() =>
      expect(screen.getByLabelText("Provider reference")).toHaveValue("HURU-2002"),
    );
    fireEvent.change(screen.getByLabelText("Provider outcome"), {
      target: { value: "INCONCLUSIVE" },
    });
    await waitFor(() =>
      expect(screen.getByLabelText("Provider outcome")).toHaveValue("INCONCLUSIVE"),
    );
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Provider outcome"), { target: { value: "HIT" } });
    await waitFor(() => expect(save).toBeEnabled());
  });
});

function namedApplication(
  fullName: string,
  overrides: Omit<Partial<typeof baseApplication>, "verification"> & {
    verification?: typeof verification | null;
  },
) {
  return {
    ...baseApplication,
    id: `application-${fullName.toLowerCase().replaceAll(" ", "-")}`,
    fullName,
    ...overrides,
  };
}

function articleFor(name: string): HTMLElement {
  const article = screen.getByRole("heading", { name }).closest("article");
  expect(article).not.toBeNull();
  return article as HTMLElement;
}

function buttonFor(name: string, buttonName: string): HTMLElement {
  return within(articleFor(name)).getByRole("button", { name: buttonName });
}

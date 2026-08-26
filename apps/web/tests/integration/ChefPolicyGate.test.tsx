import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChefPolicyGate } from "@/features/platform/ChefPolicyGate";
import type { PolicyStatusItem } from "@/features/platform/api/platformClient";

const api = vi.hoisted(() => ({
  acceptPolicy: vi.fn(),
  fetchPolicyStatus: vi.fn(),
  fetchDocReuploadStatus: vi.fn(async () => null),
}));
const auth = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));
const navigation = vi.hoisted(() => ({
  pathname: "/chef/portal",
  replace: vi.fn(),
}));

vi.mock("@/features/platform/api/platformClient", () => api);
vi.mock("@/features/auth/AuthContext", () => auth);
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => navigation,
}));

const chef = {
  id: "chef-1",
  email: "nomsa@example.test",
  displayName: "Nomsa Dlamini",
  roles: ["CHEF"],
  status: "ACTIVE",
  emailVerifiedAt: null,
  createdAt: "2026-07-30T08:00:00.000Z",
};

const currentTerms: PolicyStatusItem = {
  policyKey: "CHEF_TERMS",
  title: "Chef Terms",
  documentPath: "/legal/chef-agreement",
  requiredVersion: "2026-08-18",
  effectiveAt: "2026-08-18T00:00:00.000Z",
  required: true,
  accepted: true,
  stale: false,
  acceptedVersion: "2026-08-18",
  acceptedAt: "2026-08-19T10:00:00.000Z",
};

const missingAcceptance: PolicyStatusItem = {
  ...currentTerms,
  accepted: false,
  acceptedVersion: null,
  acceptedAt: null,
};

const staleAcceptance: PolicyStatusItem = {
  ...missingAcceptance,
  stale: true,
  acceptedVersion: "2026-08-09",
  acceptedAt: "2026-08-10T09:00:00.000Z",
};

const navItems = [
  { id: "overview", label: "Overview", path: "/chef/portal", icon: <span>O</span> },
];

function renderGate() {
  return render(
    <ChefPolicyGate navItems={navItems}>
      <h1>Protected chef operations</h1>
    </ChefPolicyGate>,
  );
}

describe("ChefPolicyGate", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    navigation.pathname = "/chef/portal";
    api.acceptPolicy.mockResolvedValue({
      id: "acceptance-1",
      userId: chef.id,
      policyKey: "CHEF_TERMS",
      version: "2026-08-18",
      acceptedAt: "2026-08-19T12:00:00.000Z",
    });
  });

  it.each([
    {
      name: "loading session",
      authValue: authValue(null, { isLoading: true, isAuthenticated: false }),
      message: "Checking your ChefMate session...",
      redirects: false,
    },
    {
      name: "guest",
      authValue: authValue(null, { isAuthenticated: false }),
      message: "Sign in with your Chef account to continue.",
      redirects: true,
    },
    {
      name: "non-CHEF account",
      authValue: authValue({ ...chef, roles: ["CUSTOMER"] }),
      message: "This portal is available only to Chef accounts.",
      redirects: false,
    },
    {
      name: "non-ACTIVE chef",
      authValue: authValue({ ...chef, status: "SUSPENDED" }),
      message: "This Chef account is not active and cannot use operational tools.",
      redirects: false,
    },
  ])(
    "withholds all portal children for a $name",
    async ({ authValue: value, message, redirects }) => {
      auth.useAuth.mockReturnValue(value);
      renderGate();

      expect(screen.getByRole("status")).toHaveTextContent(message);
      expect(
        screen.queryByRole("heading", { name: "Protected chef operations" }),
      ).not.toBeInTheDocument();
      expect(api.fetchPolicyStatus).not.toHaveBeenCalled();
      if (redirects) {
        await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/login"));
      }
    },
  );

  it("withholds children while policy status is loading and unlocks only a server-confirmed accepted version", async () => {
    const initialStatus = deferred<PolicyStatusItem[]>();
    auth.useAuth.mockReturnValue(authValue(chef));
    api.fetchPolicyStatus.mockReturnValueOnce(initialStatus.promise);
    renderGate();

    // The compliance check resolves first (no pending re-upload), so the gate
    // proceeds to the policy-status confirmation.
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Confirming your current policy status");
    });
    expect(
      screen.queryByRole("heading", { name: "Protected chef operations" }),
    ).not.toBeInTheDocument();

    initialStatus.resolve([currentTerms]);

    await expect(
      screen.findByRole("heading", { name: "Protected chef operations" }),
    ).resolves.toBeInTheDocument();
    expect(screen.getByText("Nomsa Dlamini")).toBeInTheDocument();
  });

  it.each([
    { name: "missing current acceptance", policy: missingAcceptance, previous: null },
    { name: "old accepted version", policy: staleAcceptance, previous: "2026-08-09" },
  ])("re-gates a current required policy with $name", async ({ policy, previous }) => {
    auth.useAuth.mockReturnValue(authValue(chef));
    api.fetchPolicyStatus.mockResolvedValue([policy]);
    renderGate();

    await expect(screen.findByRole("dialog", { name: "Chef Terms" })).resolves.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Protected chef operations" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Leave portal" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Log out and leave the Chef Portal" }),
    ).toBeInTheDocument();
    if (previous) {
      expect(
        screen.getByText(new RegExp(`previous acceptance was for version ${previous}`)),
      ).toBeInTheDocument();
    }
  });

  it("requires the final server refetch to confirm acceptance before unlocking portal children", async () => {
    const initialStatus = deferred<PolicyStatusItem[]>();
    const confirmation = deferred<PolicyStatusItem[]>();
    auth.useAuth.mockReturnValue(authValue(chef));
    api.fetchPolicyStatus
      .mockReturnValueOnce(initialStatus.promise)
      .mockReturnValueOnce(confirmation.promise);
    renderGate();
    initialStatus.resolve([staleAcceptance]);

    await screen.findByRole("dialog", { name: "Chef Terms" });
    fireEvent.click(screen.getByRole("checkbox", { name: /accept Chef Terms version 2026-08-18/ }));
    fireEvent.click(screen.getByRole("button", { name: "Accept version 2026-08-18" }));

    await waitFor(() => expect(api.fetchPolicyStatus).toHaveBeenCalledTimes(2));
    expect(api.acceptPolicy).toHaveBeenCalledWith("CHEF_TERMS", "2026-08-18");
    expect(screen.getByText("Confirming current policy status...")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Protected chef operations" }),
    ).not.toBeInTheDocument();

    confirmation.resolve([currentTerms]);

    await expect(
      screen.findByRole("heading", { name: "Protected chef operations" }),
    ).resolves.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps leave and logout available when the server policy check fails", async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    auth.useAuth.mockReturnValue(authValue(chef, { logout }));
    api.fetchPolicyStatus.mockRejectedValue(new Error("Policy service unavailable"));
    renderGate();

    await expect(screen.findByRole("status")).resolves.toHaveTextContent(
      "Policy service unavailable",
    );
    expect(
      screen.queryByRole("heading", { name: "Protected chef operations" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Leave portal" })).toHaveAttribute("href", "/");
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    expect(navigation.replace).toHaveBeenCalledWith("/login");
  });
});

function authValue(
  user: typeof chef | null,
  overrides: Partial<{
    isLoading: boolean;
    isAuthenticated: boolean;
    logout: () => Promise<void>;
  }> = {},
) {
  return {
    user,
    isLoading: false,
    isAuthenticated: user !== null,
    error: null,
    refresh: vi.fn(),
    setUser: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

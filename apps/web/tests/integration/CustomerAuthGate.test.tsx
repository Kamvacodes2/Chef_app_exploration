import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerAuthGate } from "@/features/customer/CustomerAuthGate";

const auth = vi.hoisted(() => ({
  isAuthenticated: false,
  isLoading: true,
}));

const navigation = vi.hoisted(() => ({
  replace: vi.fn(),
}));

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => auth,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
}));

vi.mock("@/components/layout/DashboardLayout", () => ({
  DashboardLayout: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div data-testid="dashboard-shell" data-title={title}>
      {children}
    </div>
  ),
}));

const navItems = [{ id: "dashboard", label: "Dashboard", path: "/customer/dashboard", icon: null }];

function renderGate() {
  return render(
    <CustomerAuthGate navItems={navItems} title="Customer Dashboard">
      <p>dashboard content</p>
    </CustomerAuthGate>,
  );
}

describe("CustomerAuthGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.isAuthenticated = false;
    auth.isLoading = true;
  });

  it("shows a checking-session frame while the session resolves", () => {
    renderGate();
    expect(screen.getByRole("status")).toHaveTextContent("Checking your session...");
    expect(screen.queryByTestId("dashboard-shell")).toBeNull();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("redirects signed-out visitors to /login with a next return path", async () => {
    window.history.replaceState({}, "", "/customer/dashboard");
    auth.isLoading = false;
    renderGate();
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledTimes(1));
    expect(navigation.replace).toHaveBeenCalledWith("/login?next=%2Fcustomer%2Fdashboard");
    expect(screen.queryByTestId("dashboard-shell")).toBeNull();
  });

  it("keeps the dashboard hidden until the redirect effect runs", () => {
    auth.isLoading = false;
    renderGate();
    expect(screen.getByRole("status")).toHaveTextContent("Redirecting to sign in...");
    expect(screen.queryByTestId("dashboard-shell")).toBeNull();
  });

  it("renders the dashboard for signed-in customers", () => {
    auth.isAuthenticated = true;
    auth.isLoading = false;
    renderGate();
    expect(screen.getByTestId("dashboard-shell")).toHaveAttribute(
      "data-title",
      "Customer Dashboard",
    );
    expect(screen.getByText("dashboard content")).toBeInTheDocument();
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});

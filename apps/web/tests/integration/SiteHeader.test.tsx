import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SiteHeader } from "@/components/SiteHeader";

interface AuthState {
  user: { roles: readonly string[] } | null;
  logout: () => Promise<void>;
}

let mockAuth: AuthState;

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => mockAuth,
}));

describe("SiteHeader", () => {
  beforeEach(() => {
    mockAuth = {
      user: null,
      logout: vi.fn(async () => {}),
    };
  });

  it("renders the brand mark, primary navigation, booking action, and login action", () => {
    render(<SiteHeader />);

    const header = screen.getByTestId("site-header");
    expect(header).toContainElement(screen.getByTestId("brand-mark"));
    expect(header).toHaveClass("bg-[var(--color-warm-cream)]/95");
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "How it works" })).toHaveAttribute(
      "href",
      "/#how-it-works",
    );
    expect(screen.getByRole("link", { name: "Meals" })).toHaveAttribute("href", "/#meals");
    expect(screen.getByRole("link", { name: "Plans" })).toHaveAttribute("href", "/#plans");
    expect(screen.queryByRole("link", { name: "Apply as chef" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Chefs" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Gift cards" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Book a chef" })).toHaveAttribute(
      "href",
      "/#order-flow",
    );
    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("link", { name: "Chef portal" })).not.toBeInTheDocument();
  });

  it("renders a customer-CTA-free header for the chef portal variant", () => {
    render(<SiteHeader variant="chefPortal" />);

    const header = screen.getByTestId("site-header");
    expect(header).toContainElement(screen.getByTestId("brand-mark"));
    expect(header).toContainElement(screen.getByTestId("chef-portal-indicator"));
    expect(screen.getByText("Chef portal")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Primary" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Book a chef" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Login" })).not.toBeInTheDocument();
  });

  it("replaces Login with dashboard and logout for a signed-in customer", () => {
    mockAuth.user = { roles: ["CUSTOMER"] };
    render(<SiteHeader />);

    // Desktop CTA + mobile hamburger shortcut both render (jsdom applies no CSS).
    const links = screen.getAllByRole("link", { name: "Dashboard" });
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/customer/dashboard");
    }
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Login" })).not.toBeInTheDocument();
  });

  it("links a signed-in chef to the chef portal dashboard", () => {
    mockAuth.user = { roles: ["CHEF"] };
    render(<SiteHeader />);

    for (const link of screen.getAllByRole("link", { name: "Dashboard" })) {
      expect(link).toHaveAttribute("href", "/chef/portal");
    }
    expect(screen.getAllByRole("link", { name: "Dashboard" }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Login" })).not.toBeInTheDocument();
  });

  it("links a signed-in admin to the admin dashboard", () => {
    mockAuth.user = { roles: ["ADMIN"] };
    render(<SiteHeader />);

    for (const link of screen.getAllByRole("link", { name: "Dashboard" })) {
      expect(link).toHaveAttribute("href", "/admin");
    }
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Login" })).not.toBeInTheDocument();
  });

  it("omits the dashboard link for a signed-in user without a dashboard role", () => {
    mockAuth.user = { roles: [] };
    render(<SiteHeader />);

    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Login" })).not.toBeInTheDocument();
  });

  it("toggles a mobile menu with navigation and actions", () => {
    render(<SiteHeader />);

    expect(screen.queryByRole("link", { name: "Book a chef" })).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: "Open menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);

    expect(screen.getByRole("button", { name: "Close menu" })).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("link", { name: "How it works" }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { name: "Book a chef" }).length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole("button", { name: "Close menu" }));

    expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("shows the logout button without a dashboard link for a signed-in non-customer with no dashboard", () => {
    mockAuth.user = { roles: ["NOBODY"] };
    render(<SiteHeader />);

    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Login" })).not.toBeInTheDocument();
  });

  it("shows the mobile dashboard shortcut next to the hamburger for a signed-in user", () => {
    mockAuth.user = { roles: ["CUSTOMER"] };
    render(<SiteHeader />);

    const mobileDashboard = screen.getByTestId("mobile-dashboard-link");
    expect(mobileDashboard).toHaveAttribute("href", "/customer/dashboard");
    expect(mobileDashboard).toHaveClass("md:hidden");
  });

  it("omits the mobile dashboard shortcut when logged out", () => {
    mockAuth.user = null;
    render(<SiteHeader />);

    expect(screen.queryByTestId("mobile-dashboard-link")).not.toBeInTheDocument();
  });

  it("logs a signed-in customer out when Log out is clicked", async () => {
    mockAuth.user = { roles: ["CUSTOMER"] };
    mockAuth.logout = vi.fn(async () => {});
    const assign = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, assign },
      writable: true,
    });

    render(<SiteHeader />);
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    await waitFor(() => expect(mockAuth.logout).toHaveBeenCalledTimes(1));
    expect(assign).toHaveBeenCalledWith("/");
    expect(window.location.assign).toHaveBeenCalledWith("/");
  });
});

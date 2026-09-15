import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

  it("renders the brand mark, primary navigation, booking action, and login action for logged-out visitors", () => {
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
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Log out" })).not.toBeInTheDocument();
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

  it("shows Book a chef, Dashboard, and Log out for a signed-in customer (desktop CTA and mobile shortcut)", () => {
    mockAuth.user = { roles: ["CUSTOMER"] };
    render(<SiteHeader />);

    // Book a chef is visible for customer
    expect(screen.getByRole("link", { name: "Book a chef" })).toHaveAttribute(
      "href",
      "/#order-flow",
    );

    // Desktop CTA + mobile hamburger shortcut both render
    const links = screen.getAllByRole("link", { name: "Dashboard" });
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/customer/dashboard");
    }
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Login" })).not.toBeInTheDocument();
  });

  it("links a signed-in chef to the chef portal dashboard and omits Book a chef", () => {
    mockAuth.user = { roles: ["CHEF"] };
    render(<SiteHeader />);

    // Chefs should NOT see "Book a chef"
    expect(screen.queryByRole("link", { name: "Book a chef" })).not.toBeInTheDocument();

    const links = screen.getAllByRole("link", { name: "Dashboard" });
    expect(links.length).toBeGreaterThanOrEqual(1);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/chef/portal");
    }
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Login" })).not.toBeInTheDocument();
  });

  it("links a signed-in admin to the admin dashboard and omits Book a chef", () => {
    mockAuth.user = { roles: ["ADMIN"] };
    render(<SiteHeader />);

    // Admins should NOT see "Book a chef"
    expect(screen.queryByRole("link", { name: "Book a chef" })).not.toBeInTheDocument();

    const links = screen.getAllByRole("link", { name: "Dashboard" });
    expect(links.length).toBeGreaterThanOrEqual(1);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/admin");
    }
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Login" })).not.toBeInTheDocument();
  });

  it("omits the dashboard link for a signed-in user without a dashboard role but keeps Book a chef and Log out", () => {
    mockAuth.user = { roles: [] };
    render(<SiteHeader />);

    expect(screen.getByRole("link", { name: "Book a chef" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Login" })).not.toBeInTheDocument();
  });

  it("toggles mobile menu with navigation and actions for logged-out users", () => {
    render(<SiteHeader />);

    expect(screen.queryByRole("link", { name: "Book a chef" })).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: "Open menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);

    expect(screen.getByRole("button", { name: "Close menu" })).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    const mobileMenu = document.getElementById("site-header-mobile-menu");
    expect(mobileMenu).not.toBeNull();
    if (mobileMenu) {
      const menuScope = within(mobileMenu);
      expect(menuScope.getByRole("link", { name: "How it works" })).toBeInTheDocument();
      expect(menuScope.getByRole("link", { name: "Book a chef" })).toBeInTheDocument();
      expect(menuScope.getByRole("link", { name: "Login" })).toBeInTheDocument();
      expect(menuScope.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
      expect(menuScope.queryByRole("button", { name: "Log out" })).not.toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole("button", { name: "Close menu" }));

    expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("renders Book a chef and Log out (no duplicate Dashboard) in expanded mobile menu for customers", () => {
    mockAuth.user = { roles: ["CUSTOMER"] };
    render(<SiteHeader />);

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

    const mobileMenu = document.getElementById("site-header-mobile-menu");
    expect(mobileMenu).not.toBeNull();
    if (mobileMenu) {
      const menuScope = within(mobileMenu);
      expect(menuScope.getByRole("link", { name: "Book a chef" })).toBeInTheDocument();
      expect(menuScope.getByRole("button", { name: "Log out" })).toBeInTheDocument();
      expect(menuScope.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
      expect(menuScope.queryByRole("link", { name: "Login" })).not.toBeInTheDocument();
    }
  });

  it("renders ONLY Log out (no Book a chef, no duplicate Dashboard) in expanded mobile menu for chefs and admins", () => {
    mockAuth.user = { roles: ["CHEF"] };
    const { unmount } = render(<SiteHeader />);

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

    let mobileMenu = document.getElementById("site-header-mobile-menu");
    expect(mobileMenu).not.toBeNull();
    if (mobileMenu) {
      const menuScope = within(mobileMenu);
      expect(menuScope.getByRole("button", { name: "Log out" })).toBeInTheDocument();
      expect(menuScope.queryByRole("link", { name: "Book a chef" })).not.toBeInTheDocument();
      expect(menuScope.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
      expect(menuScope.queryByRole("link", { name: "Login" })).not.toBeInTheDocument();
    }

    unmount();

    mockAuth.user = { roles: ["ADMIN"] };
    render(<SiteHeader />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

    mobileMenu = document.getElementById("site-header-mobile-menu");
    expect(mobileMenu).not.toBeNull();
    if (mobileMenu) {
      const menuScope = within(mobileMenu);
      expect(menuScope.getByRole("button", { name: "Log out" })).toBeInTheDocument();
      expect(menuScope.queryByRole("link", { name: "Book a chef" })).not.toBeInTheDocument();
      expect(menuScope.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
      expect(menuScope.queryByRole("link", { name: "Login" })).not.toBeInTheDocument();
    }
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

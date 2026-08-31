import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SiteHeader } from "@/components/SiteHeader";

interface AuthState {
  user: { roles: readonly string[] } | null;
  logout: () => Promise<void>;
}

let mockAuth: AuthState = {
  user: null,
  logout: vi.fn(async () => {}),
};

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => mockAuth,
}));

describe("SiteHeader", () => {
  beforeEach(() => {
    mockAuth.user = null;
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

    expect(screen.getByRole("link", { name: "My Dashboard" })).toHaveAttribute(
      "href",
      "/customer/dashboard",
    );
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Login" })).not.toBeInTheDocument();
  });

  it("shows only logout without a dashboard link for a signed-in non-customer", () => {
    mockAuth.user = { roles: ["CHEF"] };
    render(<SiteHeader />);

    expect(screen.queryByRole("link", { name: "My Dashboard" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Login" })).not.toBeInTheDocument();
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

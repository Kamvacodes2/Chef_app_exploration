import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import Home from "@/app/page";

vi.mock("@/components/SiteHeader", () => ({
  SiteHeader: () => <div data-testid="site-header" />,
}));
vi.mock("@/components/layout/SiteFooter", () => ({
  SiteFooter: () => <div data-testid="site-footer" />,
}));
vi.mock("@/features/landing/LandingPage", () => ({
  LandingPage: () => <div data-testid="landing-page" />,
}));

afterEach(() => {
  cleanup();
});

describe("home page", () => {
  it("mounts the WhatsApp chat button alongside the landing page", () => {
    render(<Home />);
    expect(screen.getByTestId("landing-page")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /chat with chefmate on whatsapp/i }),
    ).toBeInTheDocument();
  });
});

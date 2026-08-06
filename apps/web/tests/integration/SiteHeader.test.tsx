import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "@/components/SiteHeader";

describe("SiteHeader", () => {
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
});

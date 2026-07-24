import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "@/components/SiteHeader";

describe("SiteHeader", () => {
  it("renders the brand mark, primary navigation, and booking action", () => {
    render(<SiteHeader />);

    const header = screen.getByTestId("site-header");
    expect(header).toContainElement(screen.getByTestId("brand-mark"));
    expect(header).toHaveClass("bg-[var(--color-warm-cream)]/95");
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Book a chef" })).toHaveAttribute(
      "href",
      "#order-flow",
    );
  });
});

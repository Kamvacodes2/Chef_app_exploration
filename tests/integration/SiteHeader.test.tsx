import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "@/components/SiteHeader";

describe("SiteHeader", () => {
  it("renders the brand mark inside the homepage header", () => {
    render(<SiteHeader />);

    const header = screen.getByTestId("site-header");
    expect(header).toContainElement(screen.getByTestId("brand-mark"));
  });
});

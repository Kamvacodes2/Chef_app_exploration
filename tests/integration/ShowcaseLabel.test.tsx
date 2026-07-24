import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShowcaseLabel } from "@/features/menu-showcase/components/ShowcaseLabel";
import { SHOWCASE_SLIDES } from "@/features/menu-showcase/constants/slides";

describe("ShowcaseLabel", () => {
  it("renders both label lines as text content", () => {
    const slide = SHOWCASE_SLIDES[0]!;
    render(<ShowcaseLabel slide={slide} reducedMotion={false} />);

    expect(screen.getByText(slide.label.lineOne)).toBeInTheDocument();
    expect(screen.getByText(slide.label.lineTwo)).toBeInTheDocument();
  });

  it("keeps the fixed oxblood text color across slides", () => {
    const slide = SHOWCASE_SLIDES[2]!;
    render(<ShowcaseLabel slide={slide} reducedMotion={false} />);

    const label = screen.getByTestId("showcase-label");
    expect(label).toHaveClass("text-[var(--color-oxblood)]");
  });
});

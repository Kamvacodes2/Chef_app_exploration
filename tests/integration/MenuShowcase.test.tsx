import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";
import { MenuShowcase } from "@/features/menu-showcase/MenuShowcase";
import { SHOWCASE_SLIDES } from "@/features/menu-showcase/constants/slides";
import { getPalette } from "@/features/hero/constants/palettes";

describe("MenuShowcase", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
        "requestAnimationFrame",
        "cancelAnimationFrame",
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders with data-testid, data-slide-index, and data-phase attributes", () => {
    render(<MenuShowcase />);

    const section = screen.getByTestId("menu-showcase");
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute("data-slide-index", "0");
    expect(section).toHaveAttribute("data-phase", "ENTERING");
  });

  it("renders the pause toggle button", () => {
    render(<MenuShowcase />);
    expect(screen.getByTestId("showcase-pause-toggle")).toBeInTheDocument();
  });

  it("passes the correct palette for the current slide to BackgroundLayer", () => {
    render(<MenuShowcase />);

    const firstSlide = SHOWCASE_SLIDES[0]!;
    const palette = getPalette(firstSlide.paletteId);
    const background = screen.getByTestId("background-layer");
    expect(background).toHaveAttribute("data-palette", palette.id);
  });
});

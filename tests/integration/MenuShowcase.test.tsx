import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";
import { MenuShowcase } from "@/features/menu-showcase/MenuShowcase";

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

  it("does not expose a visible playback control", () => {
    render(<MenuShowcase />);
    expect(screen.queryByRole("button", { name: /menu showcase/i })).not.toBeInTheDocument();
  });

  it("offers persistent non-visual pause on focus and pointer interaction", () => {
    const { rerender } = render(<MenuShowcase />);
    const section = screen.getByRole("region", { name: /focus or touch to pause/i });
    expect(section).toHaveAttribute("tabindex", "0");

    fireEvent.focus(section);
    act(() => vi.advanceTimersByTime(10_000));
    expect(section).toHaveAttribute("data-slide-index", "0");
    expect(section).toHaveAttribute("data-phase", "ENTERING");

    rerender(<MenuShowcase />);
    fireEvent.pointerDown(section);
    act(() => vi.advanceTimersByTime(10_000));
    expect(section).toHaveAttribute("data-slide-index", "0");
  });
  it("uses a white canvas, oxblood hands, and an oxblood hero CTA", () => {
    render(<MenuShowcase />);

    const background = screen.getByTestId("background-layer");
    expect(background).toHaveAttribute("data-palette", "white");
    expect(background).toHaveClass("bg-white");
    const leftHand = screen
      .getByTestId("showcase-hands-below-left")
      .querySelector('[aria-hidden="true"]');
    expect(leftHand).toHaveStyle({ backgroundColor: "#7E2422" });
    expect(screen.getByRole("link", { name: /choose your meal/i })).toHaveAttribute(
      "href",
      "#order-flow",
    );
    expect(screen.getByRole("link", { name: /choose your meal/i })).toHaveClass(
      "bg-[var(--color-oxblood)]",
      "text-white",
    );
  });

  it("positions the plate slightly right so it sits between the hands", () => {
    render(<MenuShowcase />);

    const platePositioner = screen.getByTestId("showcase-plate").parentElement;
    expect(platePositioner).toHaveStyle({ left: "69%" });
  });
});

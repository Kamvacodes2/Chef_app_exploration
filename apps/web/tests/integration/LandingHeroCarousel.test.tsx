import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LandingHeroCarousel } from "@/features/landing/LandingHeroCarousel";

describe("LandingHeroCarousel", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses the Denim Wide-style split hero and rotates the story without moving CTAs", () => {
    vi.useFakeTimers();
    render(<LandingHeroCarousel />);

    expect(screen.queryByText("CHEFMATE")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /It's handled\.\s+Your evening\s+is yours\./ }),
    ).toHaveClass("font-display-wide");
    expect(
      screen.getByText(
        "A trusted Chefmate cooks fresh meals in your kitchen and cleans up before they leave.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Book a Chefmate" })).toHaveAttribute(
      "href",
      "#order-flow",
    );
    expect(screen.getByRole("link", { name: "How it works" })).toHaveAttribute(
      "href",
      "#how-it-works",
    );

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(
      screen.getByRole("heading", { name: /More time\s+to hear about\s+their day\./ }),
    ).toBeInTheDocument();
    expect(
      screen.getByAltText(
        "A parent helping a child with homework while a Chefmate chef cooks in the background",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Book a Chefmate" })).toHaveAttribute(
      "href",
      "#order-flow",
    );
  });

  it("flows from image into the themed copy panel and keeps actions at its bottom", () => {
    render(<LandingHeroCarousel />);

    const media = screen.getByTestId("landing-hero-media");
    const copy = screen.getByTestId("landing-hero-copy");
    const actions = screen.getByTestId("landing-hero-actions");
    const colourWash = screen.getByTestId("landing-hero-colour-wash");
    const dots = screen.getByTestId("landing-hero-dots");

    expect(media).toHaveClass("order-1", "overflow-hidden", "lg:order-2", "lg:h-[690px]");
    expect(copy).toHaveClass("order-2", "bg-[var(--color-oxblood)]", "lg:order-1");
    expect(actions).toHaveClass("lg:mt-auto");
    expect(colourWash).toHaveClass("bg-gradient-to-b", "to-[var(--color-oxblood)]", "lg:hidden");
    expect(
      screen.getByAltText(
        "A family relaxing on the sofa while a Chefmate chef cooks in their home kitchen",
      ),
    ).toBeInTheDocument();
    expect(within(dots).getAllByRole("tab")).toHaveLength(4);
    expect(screen.queryByRole("button", { name: "Previous story" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next story" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /story rotation/i })).not.toBeInTheDocument();
    expect(screen.queryByText("1 / 4")).not.toBeInTheDocument();

    fireEvent.click(within(dots).getByRole("tab", { name: /Show story 3:/ }));

    expect(
      screen.getByRole("heading", {
        name: /Come home\.\s+Switch off\.\s+Let us cook\./,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByAltText(
        "A customer smiling at her phone on the sofa, feet up, while a Chefmate chef preps dinner in the kitchen behind her",
      ),
    ).toBeInTheDocument();
  });
});

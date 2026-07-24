import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LandingHeroCarousel } from "@/features/landing/LandingHeroCarousel";

describe("LandingHeroCarousel", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps the booking actions fixed while advancing the image and matching story every 3.5 seconds", () => {
    vi.useFakeTimers();
    render(<LandingHeroCarousel />);

    expect(
      screen.getByRole("heading", { name: "Dinner is handled. Your evening is yours." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Book a chef" })).toHaveAttribute(
      "href",
      "#order-flow",
    );

    act(() => vi.advanceTimersByTime(3500));

    expect(
      screen.getByRole("heading", { name: "More time to hear about their day." }),
    ).toBeInTheDocument();
    expect(
      screen.getByAltText(
        "A parent helping a child with homework while a Chefmate chef cooks in the background",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Book a chef" })).toBeInTheDocument();
  });

  it("keeps story dots below the image without side arrows or a numeric counter", () => {
    vi.useFakeTimers();
    render(<LandingHeroCarousel />);

    const media = screen.getByTestId("landing-hero-media");
    const dots = screen.getByTestId("landing-hero-dots");

    expect(media).toContainElement(dots);
    expect(screen.queryByRole("button", { name: "Previous story" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next story" })).not.toBeInTheDocument();
    expect(screen.queryByText("1 / 4")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Show story 2: More time to hear about their day." }));
    expect(
      screen.getByRole("heading", { name: "More time to hear about their day." }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Pause story rotation" }));
    act(() => vi.advanceTimersByTime(7000));
    expect(
      screen.getByRole("heading", { name: "More time to hear about their day." }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Play story rotation" }));
    act(() => vi.advanceTimersByTime(3500));
    expect(
      screen.getByRole("heading", {
        name: "Come home. Switch off. Let someone else cook.",
      }),
    ).toBeInTheDocument();
  });

  it("pauses while the hero is being hovered", () => {
    vi.useFakeTimers();
    render(<LandingHeroCarousel />);

    const carousel = screen.getByTestId("landing-hero-carousel");
    fireEvent.mouseEnter(carousel);
    act(() => vi.advanceTimersByTime(7000));
    expect(
      screen.getByRole("heading", { name: "Dinner is handled. Your evening is yours." }),
    ).toBeInTheDocument();

    fireEvent.mouseLeave(carousel);
    act(() => vi.advanceTimersByTime(3500));
    expect(
      screen.getByRole("heading", { name: "More time to hear about their day." }),
    ).toBeInTheDocument();
  });
});

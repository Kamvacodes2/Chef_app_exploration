import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlatformIntro } from "@/features/platform-intro/PlatformIntro";
import { INTRO_FRAMES } from "@/features/platform-intro/constants/frames";
import { INTRO_ADVANCE_INTERVAL_MS } from "@/features/platform-intro/constants/transitions";

describe("PlatformIntro", () => {
  it("renders the first frame's headline, body, and image by default", () => {
    render(<PlatformIntro />);

    const firstFrame = INTRO_FRAMES[0]!;
    expect(screen.getByTestId("platform-intro")).toHaveAttribute(
      "data-active-frame",
      firstFrame.id,
    );
    expect(screen.getByRole("heading", { name: firstFrame.headline })).toBeInTheDocument();
    expect(screen.getByText(firstFrame.body)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: firstFrame.alt })).toBeInTheDocument();
  });

  it("cycles through frames in order: Prepping, Cooking, Garnishing, Relaxing", () => {
    const ids = INTRO_FRAMES.map((frame) => frame.id);
    expect(ids).toEqual(["prepping", "cooking", "garnishing", "relaxing"]);
  });

  it("auto-advances to the next frame after the interval and wraps around", () => {
    vi.useFakeTimers();
    render(<PlatformIntro />);
    const section = screen.getByTestId("platform-intro");

    act(() => vi.advanceTimersByTime(INTRO_ADVANCE_INTERVAL_MS));
    expect(section).toHaveAttribute("data-active-frame", INTRO_FRAMES[1]!.id);

    act(() => vi.advanceTimersByTime(INTRO_ADVANCE_INTERVAL_MS));
    expect(section).toHaveAttribute("data-active-frame", INTRO_FRAMES[2]!.id);

    act(() => vi.advanceTimersByTime(INTRO_ADVANCE_INTERVAL_MS));
    expect(section).toHaveAttribute("data-active-frame", INTRO_FRAMES[3]!.id);

    act(() => vi.advanceTimersByTime(INTRO_ADVANCE_INTERVAL_MS));
    expect(section).toHaveAttribute("data-active-frame", INTRO_FRAMES[0]!.id);

    vi.useRealTimers();
  });

  it("pauses auto-advance while hovered and resumes on mouse leave", () => {
    vi.useFakeTimers();
    render(<PlatformIntro />);
    const section = screen.getByTestId("platform-intro");

    fireEvent.mouseEnter(section);
    act(() => vi.advanceTimersByTime(INTRO_ADVANCE_INTERVAL_MS * 2));
    expect(section).toHaveAttribute("data-active-frame", INTRO_FRAMES[0]!.id);

    fireEvent.mouseLeave(section);
    act(() => vi.advanceTimersByTime(INTRO_ADVANCE_INTERVAL_MS));
    expect(section).toHaveAttribute("data-active-frame", INTRO_FRAMES[1]!.id);

    vi.useRealTimers();
  });
});

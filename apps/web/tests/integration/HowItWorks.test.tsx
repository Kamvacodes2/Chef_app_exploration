import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HowItWorks } from "@/features/how-it-works/HowItWorks";
import { HOW_IT_WORKS_STEPS } from "@/features/how-it-works/constants/steps";

function mockMatches(matches: boolean) {
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

describe("HowItWorks", () => {
  afterEach(() => {
    mockMatches(false);
  });
  it("uses the white canvas with oxblood foreground colors", () => {
    render(<HowItWorks />);

    expect(screen.getByTestId("how-it-works-section")).toHaveClass("bg-white");
    expect(screen.getByRole("heading", { name: "Your Evening, Made Simple" })).toHaveClass(
      "text-[var(--color-oxblood)]",
    );
  });

  it("distills the product story to exactly 3 steps", () => {
    expect(HOW_IT_WORKS_STEPS).toHaveLength(3);
  });

  describe("desktop layout", () => {
    it("renders all 3 steps at once", () => {
      render(<HowItWorks />);
      HOW_IT_WORKS_STEPS.forEach((step) => {
        expect(screen.getByText(step.title)).toBeInTheDocument();
        expect(screen.getByText(step.description)).toBeInTheDocument();
      });
    });

    it("defaults to the first step being active", () => {
      render(<HowItWorks />);
      const firstButton = screen.getByRole("button", {
        name: new RegExp(HOW_IT_WORKS_STEPS[0]!.title),
      });
      expect(firstButton).toHaveAttribute("aria-current", "step");

      const image = screen.getByRole("img", { name: HOW_IT_WORKS_STEPS[0]!.alt });
      expect(image).toBeInTheDocument();
    });

    it("changes the active step and displayed image when a step is clicked", () => {
      render(<HowItWorks />);
      const thirdStep = HOW_IT_WORKS_STEPS[2]!;
      const thirdButton = screen.getByRole("button", {
        name: new RegExp(thirdStep.title),
      });

      fireEvent.click(thirdButton);

      expect(thirdButton).toHaveAttribute("aria-current", "step");
      expect(screen.getByRole("img", { name: thirdStep.alt })).toBeInTheDocument();

      const firstButton = screen.getByRole("button", {
        name: new RegExp(HOW_IT_WORKS_STEPS[0]!.title),
      });
      expect(firstButton).not.toHaveAttribute("aria-current");
    });

    it("activates a step via the keyboard (Enter)", () => {
      render(<HowItWorks />);
      const secondStep = HOW_IT_WORKS_STEPS[1]!;
      const secondButton = screen.getByRole("button", {
        name: new RegExp(secondStep.title),
      });

      secondButton.focus();
      fireEvent.keyDown(secondButton, { key: "Enter", code: "Enter" });

      expect(secondButton).toHaveAttribute("aria-current", "step");
      expect(screen.getByRole("img", { name: secondStep.alt })).toBeInTheDocument();
    });

    it("activates a step via the keyboard (Space)", () => {
      render(<HowItWorks />);
      const secondStep = HOW_IT_WORKS_STEPS[1]!;
      const secondButton = screen.getByRole("button", {
        name: new RegExp(secondStep.title),
      });

      secondButton.focus();
      fireEvent.keyDown(secondButton, { key: " ", code: "Space" });

      expect(secondButton).toHaveAttribute("aria-current", "step");
    });

    it("renders a scroll-linked progress fill track alongside the timeline", () => {
      render(<HowItWorks />);

      expect(screen.getByTestId("timeline-track")).toBeInTheDocument();
      const fill = screen.getByTestId("timeline-fill");
      expect(fill).toBeInTheDocument();
      // jsdom has no real layout/scroll, so scrollYProgress cannot be
      // meaningfully interpolated here -- this only asserts the scroll-linked
      // fill scaffolding (motion element + initial collapsed scale) exists,
      // mirroring the mobile fill test's documented jsdom limitation.
      expect(fill).toHaveStyle({ transform: "scaleY(0)" });
    });

    it("keeps click-to-select working even with the scroll listener attached", () => {
      render(<HowItWorks />);
      const thirdStep = HOW_IT_WORKS_STEPS[2]!;
      const thirdButton = screen.getByRole("button", {
        name: new RegExp(thirdStep.title),
      });

      fireEvent.click(thirdButton);

      expect(thirdButton).toHaveAttribute("aria-current", "step");
      expect(screen.getByRole("img", { name: thirdStep.alt })).toBeInTheDocument();
    });
  });

  describe("mobile story feed layout", () => {
    it("renders a compact vertical feed with all 3 steps", () => {
      mockMatches(true);
      render(<HowItWorks />);

      expect(screen.getByTestId("mobile-step-feed")).toBeInTheDocument();
      expect(screen.queryByTestId("step-timeline")).not.toBeInTheDocument();

      HOW_IT_WORKS_STEPS.forEach((step) => {
        expect(screen.getByText(step.title)).toBeInTheDocument();
        expect(screen.getByText(step.description)).toBeInTheDocument();
      });
    });

    it("does not rely on emoji alone by keeping text titles alongside icons", () => {
      mockMatches(true);
      render(<HowItWorks />);

      HOW_IT_WORKS_STEPS.forEach((step) => {
        const heading = screen.getByRole("heading", { name: new RegExp(step.title) });
        expect(heading).toBeInTheDocument();
      });
    });

    it("renders a scroll-linked progress fill track alongside the feed", () => {
      mockMatches(true);
      render(<HowItWorks />);

      expect(screen.getByTestId("mobile-timeline-track")).toBeInTheDocument();
      const fill = screen.getByTestId("mobile-timeline-fill");
      expect(fill).toBeInTheDocument();
      // Initial scroll position (jsdom has no real layout/scroll), so the
      // fill should start unscaled/collapsed rather than fully filled.
      expect(fill).toHaveStyle({ transform: "scaleY(0)" });
    });
  });
});

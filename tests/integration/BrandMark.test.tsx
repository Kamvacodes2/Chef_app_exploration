import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BrandMark } from "@/features/hero/components/BrandMark";

describe("BrandMark", () => {
  it("renders the chill chef wordmark with the brand typography class", () => {
    render(<BrandMark onReset={() => {}} />);
    const wordmark = screen.getByText("chill chef");
    expect(wordmark).toBeInTheDocument();
    expect(wordmark).toHaveClass("font-brand");
  });

  it("renders the logo icon image", () => {
    render(<BrandMark onReset={() => {}} />);
    expect(screen.getByTestId("brand-mark")).toBeInTheDocument();
  });

  it("renders as an accessible button with a descriptive aria-label", () => {
    render(<BrandMark onReset={() => {}} />);
    const button = screen.getByRole("button", { name: /return to start/i });
    expect(button).toBeInTheDocument();
  });

  it("calls onReset when clicked", () => {
    const onReset = vi.fn();
    render(<BrandMark onReset={onReset} />);
    fireEvent.click(screen.getByRole("button", { name: /return to start/i }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("calls onReset when activated via the keyboard", () => {
    const onReset = vi.fn();
    render(<BrandMark onReset={onReset} />);
    const button = screen.getByRole("button", { name: /return to start/i });
    button.focus();
    fireEvent.keyDown(button, { key: "Enter", code: "Enter" });
    fireEvent.click(button);
    expect(onReset).toHaveBeenCalled();
  });
});

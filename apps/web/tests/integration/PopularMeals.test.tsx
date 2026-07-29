import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PopularMeals } from "@/features/popular-meals/PopularMeals";

describe("PopularMeals", () => {
  it("renders the infinite plate glide instead of block meal cards", () => {
    render(<PopularMeals />);
    expect(screen.getByRole("heading", { name: "Popular this week" })).toBeInTheDocument();
    expect(screen.getByTestId("popular-meals")).toHaveClass(
      "bg-white",
      "text-[var(--color-oxblood)]",
    );
    expect(screen.getByTestId("meal-loop")).toBeInTheDocument();
    expect(screen.queryByTestId("popular-meal-card")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Choose a Meal" })).toHaveClass(
      "bg-[var(--color-oxblood)]",
      "text-white",
    );
    expect(screen.getByRole("link", { name: "Choose a Meal" })).toHaveAttribute(
      "href",
      "#order-flow",
    );
  });

  it("auto-advances continuously and pauses while hovered", () => {
    vi.useFakeTimers();
    render(<PopularMeals />);
    const loop = screen.getByTestId("meal-loop");
    expect(loop).toHaveAttribute("data-loop-index", "0");
    act(() => vi.advanceTimersByTime(3000));
    expect(loop).toHaveAttribute("data-loop-index", "1");
    fireEvent.mouseEnter(loop);
    act(() => vi.advanceTimersByTime(6000));
    expect(loop).toHaveAttribute("data-loop-index", "1");
    fireEvent.mouseLeave(loop);
    act(() => vi.advanceTimersByTime(3000));
    expect(loop).toHaveAttribute("data-loop-index", "2");
    vi.useRealTimers();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MealLoop } from "@/features/hero/components/MealLoop";
import { MEAL_LOOP_ITEMS } from "@/features/hero/constants/mealLoop";

describe("MealLoop", () => {
  it("renders the meal loop container with the current loop index", () => {
    render(
      <MealLoop loopIndex={0} onPause={() => {}} onResume={() => {}} />,
    );
    const loop = screen.getByTestId("meal-loop");
    expect(loop).toBeInTheDocument();
    expect(loop).toHaveAttribute("data-loop-index", "0");
  });

  it("renders an anchor slot for the active meal", () => {
    render(
      <MealLoop loopIndex={2} onPause={() => {}} onResume={() => {}} />,
    );
    const anchor = screen.getByTestId("meal-loop-anchor");
    expect(anchor).toBeInTheDocument();
  });

  it("renders the active meal's image with priority", () => {
    render(
      <MealLoop loopIndex={0} onPause={() => {}} onResume={() => {}} />,
    );
    const anchor = screen.getByTestId("meal-loop-anchor");
    const img = anchor.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("alt", MEAL_LOOP_ITEMS[0]!.alt);
  });

  it("updates the data-loop-index when the loopIndex prop changes", () => {
    const { rerender } = render(
      <MealLoop loopIndex={0} onPause={() => {}} onResume={() => {}} />,
    );
    expect(screen.getByTestId("meal-loop")).toHaveAttribute("data-loop-index", "0");

    rerender(
      <MealLoop loopIndex={5} onPause={() => {}} onResume={() => {}} />,
    );
    expect(screen.getByTestId("meal-loop")).toHaveAttribute("data-loop-index", "5");
  });

  it("renders enough item copies for the current loopIndex to have a buffer ahead and behind", () => {
    render(
      <MealLoop loopIndex={0} onPause={() => {}} onResume={() => {}} />,
    );
    const images = screen.getAllByRole("img");
    // At loopIndex=0: forward copies = max(5, ceil(0/9)+3) = 5 → 5 × 9 = 45,
    // plus a fixed 20-slot lead buffer before index 0 → 45 + 20 = 65.
    expect(images).toHaveLength(65);
  });
});

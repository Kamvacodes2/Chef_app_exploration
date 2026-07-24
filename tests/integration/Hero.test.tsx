import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Hero } from "@/features/hero/Hero";
import type { Category, Meal } from "@/data/types/Meal";

const categories: Category[] = [
  { id: "cat-a", name: "Category A", paletteId: "olive", mood: "fresh", order: 0 },
];

const meals: Meal[] = [
  {
    id: "meal-1",
    categoryId: "cat-a",
    name: "Meal One",
    description: "desc",
    priceDisplay: "R10",
    image: { src: "/a.webp", width: 100, height: 100, alt: "a" },
    isHot: false,
    hasCutlery: false,
    order: 0,
    nutrition: { protein: 10, carbs: 10, fat: 10, fibre: 2 },
  },
  {
    id: "meal-2",
    categoryId: "cat-a",
    name: "Meal Two",
    description: "desc",
    priceDisplay: "R20",
    image: { src: "/b.webp", width: 100, height: 100, alt: "b" },
    isHot: false,
    hasCutlery: false,
    order: 1,
    nutrition: { protein: 12, carbs: 12, fat: 8, fibre: 3 },
  },
];

describe("Hero", () => {
  it("keeps the CTA and promoted meal loop while omitting the model and retired hero copy", () => {
    render(<Hero categories={categories} meals={meals} />);
    expect(screen.getByRole("button", { name: /Choose Your Meal/i })).toBeInTheDocument();
    expect(screen.getByTestId("hero-meal-loop-stage")).toBeInTheDocument();
    expect(screen.queryByTestId("model-layer")).not.toBeInTheDocument();
    expect(screen.queryByText(/What's for dinner tonight\?/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Dinner, handled\./i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("meal-navigation")).not.toBeInTheDocument();
  });

  it("omits the model image and renders the oxblood palette in the WAITING state", () => {
    render(<Hero categories={categories} meals={meals} />);

    expect(screen.queryByAltText(/waiting patiently/i)).not.toBeInTheDocument();

    expect(screen.getByTestId("background-layer")).toHaveAttribute("data-palette", "blood-red");
  });

  it("renders the MealLoop in the WAITING state", () => {
    render(<Hero categories={categories} meals={meals} />);
    expect(screen.getByTestId("meal-loop")).toBeInTheDocument();
  });

  it("keeps the oxblood background palette as the loop auto-advances", () => {
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
    render(<Hero categories={categories} meals={meals} />);

    expect(screen.getByTestId("background-layer")).toHaveAttribute("data-palette", "blood-red");

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByTestId("background-layer")).toHaveAttribute("data-palette", "blood-red");

    vi.useRealTimers();
  });

  it("reveals meal navigation and the first meal after clicking the CTA", () => {
    render(<Hero categories={categories} meals={meals} />);
    fireEvent.click(screen.getByText(/Choose Your Meal/i));

    expect(screen.getByTestId("meal-navigation")).toBeInTheDocument();
    expect(screen.getByText("Meal One")).toBeInTheDocument();
  });

  it("navigates to the next meal via the next button", async () => {
    render(<Hero categories={categories} meals={meals} />);
    fireEvent.click(screen.getByText(/Choose Your Meal/i));
    fireEvent.click(screen.getByLabelText("Next meal"));

    await waitFor(() => expect(screen.getByText("Meal Two")).toBeInTheDocument());
  });
});

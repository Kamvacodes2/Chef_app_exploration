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
  it("shows the headline and CTA in the WAITING state", () => {
    render(<Hero categories={categories} meals={meals} />);
    expect(screen.getByText(/Choose Your Meal/i)).toBeInTheDocument();
    expect(screen.getByRole("heading")).toBeInTheDocument();
    expect(screen.queryByTestId("meal-navigation")).not.toBeInTheDocument();
  });

  it("renders the model image and the olive palette in the WAITING state, even when the first category uses a different palette", () => {
    render(<Hero categories={categories} meals={meals} />);

    const modelImage = screen.getByAltText(/waiting patiently/i);
    expect(modelImage).toBeInTheDocument();

    expect(screen.getByTestId("background-layer")).toHaveAttribute("data-palette", "olive");
  });

  it("renders the MealLoop in the WAITING state", () => {
    render(<Hero categories={categories} meals={meals} />);
    expect(screen.getByTestId("meal-loop")).toBeInTheDocument();
  });

  it("changes the background palette as the loop auto-advances", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame"] });
    render(<Hero categories={categories} meals={meals} />);

    expect(screen.getByTestId("background-layer")).toHaveAttribute("data-palette", "olive");

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // loopIndex 1 → persimmon
    expect(screen.getByTestId("background-layer")).toHaveAttribute("data-palette", "persimmon");

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

  it("returns to the WAITING-state UI when the brand mark is clicked while BROWSING", () => {
    render(<Hero categories={categories} meals={meals} />);
    fireEvent.click(screen.getByText(/Choose Your Meal/i));
    expect(screen.getByTestId("meal-navigation")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /return to start/i }));

    expect(screen.getByText(/Choose Your Meal/i)).toBeInTheDocument();
    expect(screen.queryByTestId("meal-navigation")).not.toBeInTheDocument();
    expect(screen.queryByText("Meal One")).not.toBeInTheDocument();
  });

  it("returns to the WAITING-state UI when the brand mark is clicked while DELIGHTED", async () => {
    vi.useFakeTimers();
    render(<Hero categories={categories} meals={meals} />);
    fireEvent.click(screen.getByText(/Choose Your Meal/i));

    vi.runOnlyPendingTimers();

    fireEvent.click(screen.getByRole("button", { name: /return to start/i }));

    expect(screen.getByText(/Choose Your Meal/i)).toBeInTheDocument();
    expect(screen.queryByTestId("meal-navigation")).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});

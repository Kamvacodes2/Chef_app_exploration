import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Hero } from "@/features/hero/Hero";
import { MEAL_SHOWCASE_ITEMS } from "@/features/hero/constants/mealShowcase";
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
];

describe("MealShowcaseCarousel", () => {
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

  it("renders only one theme card at a time during WAITING", () => {
    render(<Hero categories={categories} meals={meals} />);

    expect(screen.getByTestId("meal-showcase-carousel")).toBeInTheDocument();
    expect(screen.getByText(MEAL_SHOWCASE_ITEMS[0]!.theme)).toBeInTheDocument();

    const renderedThemes = MEAL_SHOWCASE_ITEMS.filter((item) =>
      screen.queryByText(item.theme),
    );
    expect(renderedThemes).toHaveLength(1);
  });

  it("auto-advances to the next theme after 3 seconds", () => {
    render(<Hero categories={categories} meals={meals} />);

    expect(screen.getByText(MEAL_SHOWCASE_ITEMS[0]!.theme)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText(MEAL_SHOWCASE_ITEMS[1]!.theme)).toBeInTheDocument();
  });

  it("does not render once BROWSING starts", () => {
    render(<Hero categories={categories} meals={meals} />);
    fireEvent.click(screen.getByText(/Choose Your Meal/i));

    expect(screen.queryByTestId("meal-showcase-carousel")).not.toBeInTheDocument();
  });
});

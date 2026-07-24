import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MealCard } from "@/features/hero/components/MealCard";
import type { Meal } from "@/data/types/Meal";

const meal: Meal = {
  id: "meal-1",
  categoryId: "cat-a",
  name: "Steaming Meal",
  description: "desc",
  priceDisplay: "R42",
  image: { src: "/a.webp", width: 100, height: 100, alt: "a" },
  isHot: true,
  hasCutlery: true,
  order: 0,
  nutrition: { protein: 32, carbs: 20, fat: 10, fibre: 5 },
};

describe("MealCard", () => {
  it("renders steam and cutlery sheen effects when flagged", () => {
    render(<MealCard meal={meal} />);
    expect(screen.getByTestId("steam-effect")).toBeInTheDocument();
    expect(screen.getByTestId("cutlery-sheen")).toBeInTheDocument();
    expect(screen.getByText("Steaming Meal")).toBeInTheDocument();
    expect(screen.queryByText("R42")).not.toBeInTheDocument();
  });

  it("renders nutrition facts for the active meal", () => {
    render(<MealCard meal={meal} />);
    const facts = screen.getByTestId("nutrition-facts");
    expect(facts).toBeInTheDocument();
    expect(screen.getByText("32g")).toBeInTheDocument();
    expect(screen.getByText("20g")).toBeInTheDocument();
    expect(screen.getByText("10g")).toBeInTheDocument();
    expect(screen.getByText("5g")).toBeInTheDocument();
    expect(screen.getByText("Protein")).toBeInTheDocument();
    expect(screen.getByText("Fibre")).toBeInTheDocument();
  });

  it("omits effects when the meal has neither flag", () => {
    render(<MealCard meal={{ ...meal, isHot: false, hasCutlery: false }} />);
    expect(screen.queryByTestId("steam-effect")).not.toBeInTheDocument();
    expect(screen.queryByTestId("cutlery-sheen")).not.toBeInTheDocument();
  });
});

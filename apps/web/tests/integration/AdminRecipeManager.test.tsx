import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { AdminRecipeManager } from "@/features/platform/AdminRecipeManager";

const categoriesResponse = {
  data: [
    {
      slug: "popular-family-suppers",
      name: "Popular Family Suppers",
      paletteId: "persimmon",
      mood: "test",
      sortOrder: 0,
      mealCount: 5,
    },
    {
      slug: "chicken-meals",
      name: "Chicken Meals",
      paletteId: "lemon-cream",
      mood: "test",
      sortOrder: 1,
      mealCount: 3,
    },
  ],
};

describe("AdminRecipeManager", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => categoriesResponse,
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the page heading", async () => {
    render(<AdminRecipeManager />);
    await waitFor(() => {
      expect(screen.getByText("Publish a Recipe")).toBeInTheDocument();
    });
  });

  it("renders all form sections", async () => {
    render(<AdminRecipeManager />);

    await waitFor(() => {
      expect(screen.getByText("Basics")).toBeInTheDocument();
    });

    expect(screen.getByText("Photograph")).toBeInTheDocument();
    expect(screen.getByText("Ingredients")).toBeInTheDocument();
    expect(screen.getByText("Cooking Instructions")).toBeInTheDocument();
    expect(screen.getByText("Nutrition")).toBeInTheDocument();
  });

  it("renders the publish button", async () => {
    render(<AdminRecipeManager />);

    await waitFor(() => {
      expect(screen.getByText("Publish recipe")).toBeInTheDocument();
    });
  });

  it("has STANDARD nutrition profile visible by default", async () => {
    render(<AdminRecipeManager />);

    await waitFor(() => {
      expect(screen.getByText("STANDARD (required)")).toBeInTheDocument();
    });
  });

  it("has optional BALANCED and LOW CARB checkboxes", async () => {
    render(<AdminRecipeManager />);

    await waitFor(() => {
      expect(screen.getByText("Add BALANCED profile (optional)")).toBeInTheDocument();
      expect(screen.getByText("Add LOW CARB profile (optional)")).toBeInTheDocument();
    });
  });

  it("has an add ingredient button", async () => {
    render(<AdminRecipeManager />);

    await waitFor(() => {
      expect(screen.getByText("+ Add ingredient")).toBeInTheDocument();
    });
  });

  it("has an add step button for instructions", async () => {
    render(<AdminRecipeManager />);

    await waitFor(() => {
      expect(screen.getByText("+ Add step")).toBeInTheDocument();
    });
  });

  it("loads categories into the select", async () => {
    render(<AdminRecipeManager />);

    await waitFor(() => {
      expect(screen.getByText("Popular Family Suppers")).toBeInTheDocument();
    });
  });

  it("shows file input for image upload", async () => {
    render(<AdminRecipeManager />);

    await waitFor(() => {
      const fileInput = screen.getByLabelText(/Food image/);
      expect(fileInput).toBeInTheDocument();
      expect((fileInput as HTMLInputElement).type).toBe("file");
    });
  });

  it("shows label for recipe name input", async () => {
    render(<AdminRecipeManager />);

    await waitFor(() => {
      const nameInput = screen.getByLabelText(/Recipe name/);
      expect(nameInput).toBeInTheDocument();
    });
  });
});

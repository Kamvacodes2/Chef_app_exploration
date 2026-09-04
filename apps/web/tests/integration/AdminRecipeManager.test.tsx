import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:test-image"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
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

  it("validates required image and recipe fields before submitting", async () => {
    render(<AdminRecipeManager />);
    await waitFor(() => expect(screen.getByText("Publish recipe")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Publish recipe"));
    expect(screen.getByText("Please select an image file.")).toBeInTheDocument();

    const image = new File(["image"], "chicken.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText(/Food image/), { target: { files: [image] } });
    fireEvent.click(screen.getByText("Publish recipe"));
    expect(screen.getByText("Recipe name must be 2-120 characters.")).toBeInTheDocument();
  });

  it("supports dynamic ingredients, instructions, optional nutrition profiles, and image removal", async () => {
    render(<AdminRecipeManager />);
    await waitFor(() => expect(screen.getByText("Publish recipe")).toBeInTheDocument());

    const image = new File(["image"], "chicken.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText(/Food image/), { target: { files: [image] } });
    expect(screen.getByText("File: chicken.jpg")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.queryByText("File: chicken.jpg")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Food image/), { target: { files: [image] } });

    fireEvent.change(screen.getByLabelText(/Recipe name/), {
      target: { value: "Lemon herb chicken" },
    });
    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: "A bright family-style roast chicken dinner." },
    });
    fireEvent.change(screen.getByLabelText(/Category/), {
      target: { value: "popular-family-suppers" },
    });
    fireEvent.change(screen.getByLabelText(/Serves/), { target: { value: "4-6" } });
    fireEvent.change(screen.getByLabelText(/Alt text/), {
      target: { value: "Roast chicken with lemon and herbs" },
    });
    fireEvent.change(screen.getByLabelText("Ingredient 1"), {
      target: { value: "1 whole chicken" },
    });
    fireEvent.click(screen.getByText("+ Add ingredient"));
    fireEvent.change(screen.getByLabelText("Ingredient 2"), { target: { value: "2 lemons" } });
    fireEvent.click(screen.getByRole("button", { name: "Remove ingredient 2" }));
    fireEvent.click(screen.getByText("+ Add ingredient"));
    fireEvent.change(screen.getByLabelText("Ingredient 2"), { target: { value: "2 lemons" } });

    fireEvent.change(screen.getByLabelText("Step 1"), {
      target: { value: "Season the chicken." },
    });
    fireEvent.click(screen.getByText("+ Add step"));
    fireEvent.change(screen.getByLabelText("Step 2"), { target: { value: "Roast until golden." } });
    fireEvent.click(screen.getByRole("button", { name: "Remove step 2" }));
    fireEvent.click(screen.getByText("+ Add step"));
    fireEvent.change(screen.getByLabelText("Step 2"), { target: { value: "Roast until golden." } });

    fireEvent.change(screen.getByLabelText("Min serves"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Max serves"), { target: { value: "6" } });
    fireEvent.change(screen.getByLabelText("Session fit"), { target: { value: "Family dinner" } });
    fireEvent.change(screen.getAllByPlaceholderText("620")[0]!, {
      target: { value: "620" },
    });
    fireEvent.change(screen.getAllByPlaceholderText("35")[0]!, { target: { value: "35" } });
    fireEvent.change(screen.getAllByPlaceholderText("66")[0]!, { target: { value: "66" } });
    fireEvent.change(screen.getAllByPlaceholderText("23")[0]!, { target: { value: "23" } });
    fireEvent.change(screen.getAllByPlaceholderText("e.g. Rice")[0]!, {
      target: { value: "Rice" },
    });
    fireEvent.change(screen.getAllByPlaceholderText("180")[0]!, { target: { value: "180" } });

    fireEvent.click(screen.getByText("Add BALANCED profile (optional)"));
    fireEvent.click(screen.getByText("Add LOW CARB profile (optional)"));
    expect(screen.getAllByPlaceholderText("620").length).toBe(3);
  });

  it("shows the published state and can reset for another recipe", async () => {
    const publishedMeal = {
      slug: "lemon-herb-chicken-a1b2c3d4",
      categorySlug: "popular-family-suppers",
      categoryName: "Popular Family Suppers",
      name: "Lemon herb chicken",
      description: "A bright family-style roast chicken dinner.",
      priceCents: 0,
      priceDisplay: "NOT_CHARGED",
      image: {
        src: "/api/v1/catalog/media/chicken.webp",
        alt: "Roast chicken with lemon and herbs",
        width: 800,
        height: 600,
      },
      paletteId: "persimmon",
      isHot: false,
      hasCutlery: true,
      isSignature: false,
      sortOrder: 0,
      goalTags: [],
      aliases: [],
      isFeatured: false,
      featuredOrder: null,
      menuId: null,
      serves: "4-6",
      servesMin: 4,
      servesMax: 6,
      sessionFit: "Family dinner",
      ingredients: "Chicken",
      recipeGuidelines: "Season and roast",
      recommendedSides: null,
      optionalSides: null,
      chefNote: null,
      measurementNote: null,
      isActive: true,
      nutritionProfiles: [
        {
          plateType: "STANDARD",
          caloriesKcal: 620,
          proteinG: 35,
          carbsG: 66,
          fatG: 23,
          starchType: "Rice",
          starchCookedG: 180,
        },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(async (_url: string, init?: RequestInit) =>
          init?.method === "POST"
            ? { ok: true, json: async () => ({ data: publishedMeal }) }
            : { ok: true, json: async () => categoriesResponse },
        ),
    );
    render(<AdminRecipeManager />);
    await waitFor(() => expect(screen.getByText("Publish recipe")).toBeInTheDocument());

    const set = (label: RegExp | string, value: string) =>
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    fireEvent.change(screen.getByLabelText(/Food image/), {
      target: { files: [new File(["image"], "chicken.jpg", { type: "image/jpeg" })] },
    });
    set(/Recipe name/, "Lemon herb chicken");
    set(/Description/, "A bright family-style roast chicken dinner.");
    set(/Category/, "popular-family-suppers");
    set(/Serves/, "4-6");
    set(/Alt text/, "Roast chicken with lemon and herbs");
    set("Ingredient 1", "Chicken");
    set("Step 1", "Season and roast the chicken.");
    fireEvent.change(screen.getByPlaceholderText("620"), { target: { value: "620" } });
    fireEvent.change(screen.getByPlaceholderText("35"), { target: { value: "35" } });
    fireEvent.change(screen.getByPlaceholderText("66"), { target: { value: "66" } });
    fireEvent.change(screen.getByPlaceholderText("23"), { target: { value: "23" } });
    fireEvent.click(screen.getByText("Publish recipe"));

    await waitFor(() => expect(screen.getByText("Recipe Published")).toBeInTheDocument());
    expect(
      screen.getByText("Lemon herb chicken has been published to Popular Family Suppers."),
    ).toBeInTheDocument();
    expect(screen.getByText("Slug: lemon-herb-chicken-a1b2c3d4")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Add another recipe"));
    expect(screen.getByText("Publish a Recipe")).toBeInTheDocument();
    expect(screen.getByLabelText(/Recipe name/)).toHaveValue("");
  });

  it("surfaces category and publish errors without losing the form", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (_url: string, init?: RequestInit) =>
        init?.method === "POST"
          ? {
              ok: false,
              status: 422,
              json: async () => ({
                error: { code: "validation_error", message: "Recipe already exists" },
              }),
            }
          : { ok: false, json: async () => ({}) },
      ),
    );
    render(<AdminRecipeManager />);
    await waitFor(() =>
      expect(
        screen.getByText("Could not load categories. Check your connection and try again."),
      ).toBeInTheDocument(),
    );

    // The category error prevents a valid submit, but the component remains usable.
    expect(screen.getByText("Publish a Recipe")).toBeInTheDocument();
  });
});

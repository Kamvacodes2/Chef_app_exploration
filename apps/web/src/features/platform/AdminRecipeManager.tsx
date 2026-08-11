"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getChefmateApiUrl } from "@/lib/env";
import {
  createRecipe,
  type RecipeFormPayload,
  type NutritionProfileInput,
  type CatalogMeal,
} from "@/features/platform/api/adminRecipesClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CategoryOption {
  readonly slug: string;
  readonly name: string;
}

interface IngredientEntry {
  readonly id: number;
  value: string;
}

interface InstructionEntry {
  readonly id: number;
  value: string;
}

interface FormState {
  name: string;
  description: string;
  categorySlug: string;
  imageAlt: string;
  serves: string;
  servesMin: string;
  servesMax: string;
  sessionFit: string;
  ingredients: IngredientEntry[];
  instructions: InstructionEntry[];
  standardCalories: string;
  standardProtein: string;
  standardCarbs: string;
  standardFat: string;
  standardStarchType: string;
  standardStarchCookedG: string;
  includeBalanced: boolean;
  balancedCalories: string;
  balancedProtein: string;
  balancedCarbs: string;
  balancedFat: string;
  balancedStarchType: string;
  balancedStarchCookedG: string;
  includeLowCarb: boolean;
  lowCarbCalories: string;
  lowCarbProtein: string;
  lowCarbCarbs: string;
  lowCarbFat: string;
  lowCarbStarchType: string;
  lowCarbStarchCookedG: string;
}

const INITIAL_FORM: FormState = {
  name: "",
  description: "",
  categorySlug: "",
  imageAlt: "",
  serves: "",
  servesMin: "",
  servesMax: "",
  sessionFit: "",
  ingredients: [{ id: 0, value: "" }],
  instructions: [{ id: 0, value: "" }],
  standardCalories: "",
  standardProtein: "",
  standardCarbs: "",
  standardFat: "",
  standardStarchType: "",
  standardStarchCookedG: "",
  includeBalanced: false,
  balancedCalories: "",
  balancedProtein: "",
  balancedCarbs: "",
  balancedFat: "",
  balancedStarchType: "",
  balancedStarchCookedG: "",
  includeLowCarb: false,
  lowCarbCalories: "",
  lowCarbProtein: "",
  lowCarbCarbs: "",
  lowCarbFat: "",
  lowCarbStarchType: "",
  lowCarbStarchCookedG: "",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let nextId = 100;

function newId(): number {
  return nextId++;
}

function parsePositiveInt(s: string): number | undefined {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function parsePositiveIntStrict(s: string): number {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function buildPayload(form: FormState, imageFile: File): RecipeFormPayload {
  const profiles: NutritionProfileInput[] = [
    {
      plateType: "STANDARD",
      caloriesKcal: parsePositiveIntStrict(form.standardCalories),
      proteinG: parsePositiveIntStrict(form.standardProtein),
      carbsG: parsePositiveIntStrict(form.standardCarbs),
      fatG: parsePositiveIntStrict(form.standardFat),
      starchType: form.standardStarchType.trim() || undefined,
      starchCookedG: parsePositiveInt(form.standardStarchCookedG),
    },
  ];

  if (form.includeBalanced) {
    profiles.push({
      plateType: "BALANCED",
      caloriesKcal: parsePositiveIntStrict(form.balancedCalories),
      proteinG: parsePositiveIntStrict(form.balancedProtein),
      carbsG: parsePositiveIntStrict(form.balancedCarbs),
      fatG: parsePositiveIntStrict(form.balancedFat),
      starchType: form.balancedStarchType.trim() || undefined,
      starchCookedG: parsePositiveInt(form.balancedStarchCookedG),
    });
  }

  if (form.includeLowCarb) {
    profiles.push({
      plateType: "LOW_CARB",
      caloriesKcal: parsePositiveIntStrict(form.lowCarbCalories),
      proteinG: parsePositiveIntStrict(form.lowCarbProtein),
      carbsG: parsePositiveIntStrict(form.lowCarbCarbs),
      fatG: parsePositiveIntStrict(form.lowCarbFat),
      starchType: form.lowCarbStarchType.trim() || undefined,
      starchCookedG: parsePositiveInt(form.lowCarbStarchCookedG),
    });
  }

  return {
    name: form.name.trim(),
    description: form.description.trim(),
    categorySlug: form.categorySlug,
    imageAlt: form.imageAlt.trim(),
    serves: form.serves.trim(),
    servesMin: parsePositiveInt(form.servesMin),
    servesMax: parsePositiveInt(form.servesMax),
    sessionFit: form.sessionFit.trim() || undefined,
    ingredients: form.ingredients.map((i) => i.value.trim()).filter(Boolean),
    instructions: form.instructions.map((i) => i.value.trim()).filter(Boolean),
    nutritionProfiles: profiles,
  };
}

function validatePayload(payload: RecipeFormPayload): string | null {
  if (payload.name.length < 2 || payload.name.length > 120)
    return "Recipe name must be 2-120 characters.";
  if (payload.description.length < 10 || payload.description.length > 600)
    return "Description must be 10-600 characters.";
  if (!payload.categorySlug) return "Please select a category.";
  if (payload.imageAlt.length < 5 || payload.imageAlt.length > 180)
    return "Image alt text must be 5-180 characters.";
  if (!payload.serves || payload.serves.length > 80)
    return "Serves label is required (max 80 characters).";
  if (
    payload.servesMin !== undefined &&
    payload.servesMax !== undefined &&
    payload.servesMin > payload.servesMax
  )
    return "Minimum serves must be less than or equal to maximum serves.";
  if (payload.ingredients.length === 0 || payload.ingredients.length > 80)
    return "Add 1-80 ingredients.";
  if (payload.instructions.length === 0 || payload.instructions.length > 30)
    return "Add 1-30 cooking instructions.";
  if (
    payload.nutritionProfiles.length === 0 ||
    payload.nutritionProfiles[0]!.plateType !== "STANDARD"
  )
    return "A STANDARD nutrition profile is required.";
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminRecipeManager() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoriesBusy, setCategoriesBusy] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<CatalogMeal | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke object URLs on unmount
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  // Load categories
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`${getChefmateApiUrl()}/api/v1/catalog/categories`);
        if (!res.ok) throw new Error("Failed to load categories");
        const data = await res.json();
        setCategories((data.data as CategoryOption[]) ?? []);
      } catch {
        setError("Could not load categories. Check your connection and try again.");
      } finally {
        setCategoriesBusy(false);
      }
    })();
  }, []);

  // ---------------------------------------------------------------------------
  // Field updaters
  // ---------------------------------------------------------------------------

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Image handling
  // ---------------------------------------------------------------------------

  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      if (file) {
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        if (!form.imageAlt) {
          setForm((prev) => ({ ...prev, imageAlt: file.name.replace(/\.[^.]+$/, "") }));
        }
      } else {
        setImageFile(null);
        setImagePreview(null);
      }
    },
    [imagePreview, form.imageAlt],
  );

  const handleRemoveImage = useCallback(() => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [imagePreview]);

  // ---------------------------------------------------------------------------
  // Ingredient & instruction helpers
  // ---------------------------------------------------------------------------

  const addIngredient = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { id: newId(), value: "" }],
    }));
  }, []);

  const updateIngredient = useCallback((id: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((i) => (i.id === id ? { ...i, value } : i)),
    }));
  }, []);

  const removeIngredient = useCallback((id: number) => {
    setForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((i) => i.id !== id),
    }));
  }, []);

  const addInstruction = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      instructions: [...prev.instructions, { id: newId(), value: "" }],
    }));
  }, []);

  const updateInstruction = useCallback((id: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      instructions: prev.instructions.map((i) => (i.id === id ? { ...i, value } : i)),
    }));
  }, []);

  const removeInstruction = useCallback((id: number) => {
    setForm((prev) => ({
      ...prev,
      instructions: prev.instructions.filter((i) => i.id !== id),
    }));
  }, []);

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  const handleSubmit = useCallback(async () => {
    if (saving) return;
    if (!imageFile) {
      setFieldErrors({ image: "Please select an image file." });
      return;
    }

    const payload = buildPayload(form, imageFile);
    const clientError = validatePayload(payload);
    if (clientError) {
      setFieldErrors({ _form: clientError });
      return;
    }

    setSaving(true);
    setError(null);
    setFieldErrors({});

    try {
      const result = await createRecipe(payload, imageFile);
      if (result.ok) {
        setSuccess(result.meal);
      } else {
        setError(result.message);
        if (result.code === "validation_error") {
          setFieldErrors({ _form: result.message });
        }
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [saving, imageFile, form]);

  const handleAddAnother = useCallback(() => {
    setForm(INITIAL_FORM);
    setImageFile(null);
    setImagePreview(null);
    setSuccess(null);
    setError(null);
    setFieldErrors({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // ---------------------------------------------------------------------------
  // SUCCESS state
  // ---------------------------------------------------------------------------

  if (success) {
    return (
      <div role="status" className="space-y-6">
        <h1 className="text-2xl font-black text-[var(--color-oxblood)]">Recipe Published</h1>
        <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
          <p className="font-semibold text-green-800">
            {success.name} has been published to {success.categoryName}.
          </p>
          <p className="mt-1 text-sm text-green-700">Slug: {success.slug}</p>
          {success.image?.src && (
            <img
              src={
                success.image.src.startsWith("/api")
                  ? getChefmateApiUrl() + success.image.src
                  : success.image.src
              }
              alt={success.image.alt}
              className="mt-4 h-40 w-auto rounded-xl object-cover"
            />
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleAddAnother}
            className="rounded-xl bg-[var(--color-oxblood)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Add another recipe
          </button>
          <a
            href={`/#order-flow?meal=${success.slug}`}
            className="rounded-xl border border-[var(--color-oxblood)]/20 px-6 py-3 text-sm font-semibold text-[var(--color-oxblood)] transition hover:bg-[var(--color-oxblood)]/5"
          >
            View in order flow →
          </a>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // FORM
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-[var(--color-oxblood)]">Publish a Recipe</h1>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {fieldErrors._form && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700"
        >
          {fieldErrors._form}
        </div>
      )}

      <div className="space-y-8">
        {/* BASICS */}
        <fieldset className="rounded-2xl border border-[var(--color-oxblood)]/10 bg-white p-6">
          <legend className="text-lg font-bold text-[var(--color-oxblood)]">Basics</legend>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="recipe-name"
                className="block text-sm font-medium text-[var(--color-charcoal)]"
              >
                Recipe name <span className="text-red-500">*</span>
              </label>
              <input
                id="recipe-name"
                type="text"
                maxLength={120}
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--color-oxblood)]/15 px-4 py-2.5 text-sm focus:border-[var(--color-oxblood)] focus:outline-none focus:ring-1 focus:ring-[var(--color-oxblood)]"
                placeholder="e.g. Lemon Herb Chicken"
              />
            </div>

            <div>
              <label
                htmlFor="recipe-category"
                className="block text-sm font-medium text-[var(--color-charcoal)]"
              >
                Category <span className="text-red-500">*</span>
              </label>
              {categoriesBusy ? (
                <p className="mt-1 text-sm text-[var(--color-charcoal)]/50">
                  Loading categories...
                </p>
              ) : categories.length === 0 ? (
                <p className="mt-1 text-sm text-red-600">
                  No categories available. Try refreshing.
                </p>
              ) : (
                <select
                  id="recipe-category"
                  value={form.categorySlug}
                  onChange={(e) => setField("categorySlug", (e.target as HTMLSelectElement).value)}
                  className="mt-1 w-full rounded-xl border border-[var(--color-oxblood)]/15 px-4 py-2.5 text-sm focus:border-[var(--color-oxblood)] focus:outline-none focus:ring-1 focus:ring-[var(--color-oxblood)]"
                >
                  <option value="">Select a category...</option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="recipe-description"
                className="block text-sm font-medium text-[var(--color-charcoal)]"
              >
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="recipe-description"
                maxLength={600}
                rows={3}
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--color-oxblood)]/15 px-4 py-2.5 text-sm focus:border-[var(--color-oxblood)] focus:outline-none focus:ring-1 focus:ring-[var(--color-oxblood)]"
                placeholder="Brief description of the dish..."
              />
              <p className="mt-1 text-xs text-[var(--color-charcoal)]/40">
                {form.description.length}/600
              </p>
            </div>

            <div>
              <label
                htmlFor="recipe-serves"
                className="block text-sm font-medium text-[var(--color-charcoal)]"
              >
                Serves <span className="text-red-500">*</span>
              </label>
              <input
                id="recipe-serves"
                type="text"
                maxLength={80}
                value={form.serves}
                onChange={(e) => setField("serves", e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--color-oxblood)]/15 px-4 py-2.5 text-sm focus:border-[var(--color-oxblood)] focus:outline-none focus:ring-1 focus:ring-[var(--color-oxblood)]"
                placeholder="e.g. 4-6"
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label
                  htmlFor="recipe-serves-min"
                  className="block text-sm font-medium text-[var(--color-charcoal)]"
                >
                  Min serves
                </label>
                <input
                  id="recipe-serves-min"
                  type="number"
                  min={1}
                  value={form.servesMin}
                  onChange={(e) => setField("servesMin", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[var(--color-oxblood)]/15 px-4 py-2.5 text-sm focus:border-[var(--color-oxblood)] focus:outline-none focus:ring-1 focus:ring-[var(--color-oxblood)]"
                  placeholder="2"
                />
              </div>
              <div className="flex-1">
                <label
                  htmlFor="recipe-serves-max"
                  className="block text-sm font-medium text-[var(--color-charcoal)]"
                >
                  Max serves
                </label>
                <input
                  id="recipe-serves-max"
                  type="number"
                  min={1}
                  value={form.servesMax}
                  onChange={(e) => setField("servesMax", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[var(--color-oxblood)]/15 px-4 py-2.5 text-sm focus:border-[var(--color-oxblood)] focus:outline-none focus:ring-1 focus:ring-[var(--color-oxblood)]"
                  placeholder="6"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="recipe-session-fit"
                className="block text-sm font-medium text-[var(--color-charcoal)]"
              >
                Session fit
              </label>
              <input
                id="recipe-session-fit"
                type="text"
                maxLength={240}
                value={form.sessionFit}
                onChange={(e) => setField("sessionFit", e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--color-oxblood)]/15 px-4 py-2.5 text-sm focus:border-[var(--color-oxblood)] focus:outline-none focus:ring-1 focus:ring-[var(--color-oxblood)]"
                placeholder="e.g. Best for lunch or dinner"
              />
            </div>
          </div>
        </fieldset>

        {/* PHOTOGRAPH */}
        <fieldset className="rounded-2xl border border-[var(--color-oxblood)]/10 bg-white p-6">
          <legend className="text-lg font-bold text-[var(--color-oxblood)]">Photograph</legend>
          <div className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="recipe-image"
                className="block text-sm font-medium text-[var(--color-charcoal)]"
              >
                Food image <span className="text-red-500">*</span>
              </label>
              <input
                ref={fileInputRef}
                id="recipe-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                className="mt-1 block w-full text-sm text-[var(--color-charcoal)] file:mr-4 file:rounded-xl file:border-0 file:bg-[var(--color-oxblood)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:opacity-90"
              />
              {fieldErrors.image && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.image}</p>
              )}
            </div>

            {imageFile && (
              <div className="flex items-start gap-4">
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-32 w-auto rounded-xl object-cover"
                  />
                )}
                <div className="space-y-1 text-xs text-[var(--color-charcoal)]/60">
                  <p>File: {imageFile.name}</p>
                  <p>Type: {imageFile.type || "unknown"}</p>
                  <p>Size: {(imageFile.size / 1024).toFixed(1)} KB</p>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="text-red-600 underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="recipe-image-alt"
                className="block text-sm font-medium text-[var(--color-charcoal)]"
              >
                Alt text <span className="text-red-500">*</span>
              </label>
              <input
                id="recipe-image-alt"
                type="text"
                maxLength={180}
                value={form.imageAlt}
                onChange={(e) => setField("imageAlt", e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--color-oxblood)]/15 px-4 py-2.5 text-sm focus:border-[var(--color-oxblood)] focus:outline-none focus:ring-1 focus:ring-[var(--color-oxblood)]"
                placeholder="Describe the food in the image..."
              />
            </div>
          </div>
        </fieldset>

        {/* INGREDIENTS */}
        <fieldset className="rounded-2xl border border-[var(--color-oxblood)]/10 bg-white p-6">
          <legend className="text-lg font-bold text-[var(--color-oxblood)]">Ingredients</legend>
          <div className="mt-4 space-y-2">
            {form.ingredients.map((ing, idx) => (
              <div key={ing.id} className="flex gap-2">
                <input
                  type="text"
                  maxLength={240}
                  value={ing.value}
                  onChange={(e) => updateIngredient(ing.id, e.target.value)}
                  aria-label={`Ingredient ${idx + 1}`}
                  className="flex-1 rounded-xl border border-[var(--color-oxblood)]/15 px-4 py-2.5 text-sm focus:border-[var(--color-oxblood)] focus:outline-none focus:ring-1 focus:ring-[var(--color-oxblood)]"
                  placeholder={`Ingredient ${idx + 1}`}
                />
                {form.ingredients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeIngredient(ing.id)}
                    aria-label={`Remove ingredient ${idx + 1}`}
                    className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {form.ingredients.length < 80 && (
              <button
                type="button"
                onClick={addIngredient}
                className="text-sm font-medium text-[var(--color-oxblood)] underline"
              >
                + Add ingredient
              </button>
            )}
          </div>
        </fieldset>

        {/* INSTRUCTIONS */}
        <fieldset className="rounded-2xl border border-[var(--color-oxblood)]/10 bg-white p-6">
          <legend className="text-lg font-bold text-[var(--color-oxblood)]">
            Cooking Instructions
          </legend>
          <div className="mt-4 space-y-2">
            {form.instructions.map((step, idx) => (
              <div key={step.id} className="flex gap-2">
                <span className="flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-[var(--color-oxblood)]/10 text-sm font-bold text-[var(--color-oxblood)]">
                  {idx + 1}
                </span>
                <textarea
                  maxLength={1000}
                  rows={2}
                  value={step.value}
                  onChange={(e) => updateInstruction(step.id, e.target.value)}
                  aria-label={`Step ${idx + 1}`}
                  className="flex-1 rounded-xl border border-[var(--color-oxblood)]/15 px-4 py-2.5 text-sm focus:border-[var(--color-oxblood)] focus:outline-none focus:ring-1 focus:ring-[var(--color-oxblood)]"
                  placeholder={`Step ${idx + 1}`}
                />
                {form.instructions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeInstruction(step.id)}
                    aria-label={`Remove step ${idx + 1}`}
                    className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {form.instructions.length < 30 && (
              <button
                type="button"
                onClick={addInstruction}
                className="text-sm font-medium text-[var(--color-oxblood)] underline"
              >
                + Add step
              </button>
            )}
          </div>
        </fieldset>

        {/* NUTRITION */}
        <fieldset className="rounded-2xl border border-[var(--color-oxblood)]/10 bg-white p-6">
          <legend className="text-lg font-bold text-[var(--color-oxblood)]">Nutrition</legend>

          {/* STANDARD (required) */}
          <div className="mt-4 rounded-xl border border-[var(--color-oxblood)]/5 bg-[var(--color-warm-cream)] p-4">
            <p className="font-semibold text-[var(--color-charcoal)]">STANDARD (required)</p>
            <NutritionFields
              calories={form.standardCalories}
              onCalories={(v) => setField("standardCalories", v)}
              protein={form.standardProtein}
              onProtein={(v) => setField("standardProtein", v)}
              carbs={form.standardCarbs}
              onCarbs={(v) => setField("standardCarbs", v)}
              fat={form.standardFat}
              onFat={(v) => setField("standardFat", v)}
              starchType={form.standardStarchType}
              onStarchType={(v) => setField("standardStarchType", v)}
              starchCookedG={form.standardStarchCookedG}
              onStarchCookedG={(v) => setField("standardStarchCookedG", v)}
            />
          </div>

          {/* BALANCED (optional) */}
          <label className="mt-4 flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={form.includeBalanced}
              onChange={(e) => setField("includeBalanced", e.target.checked)}
              className="h-4 w-4 rounded accent-[var(--color-oxblood)]"
            />
            <span className="text-sm font-semibold text-[var(--color-charcoal)]">
              Add BALANCED profile (optional)
            </span>
          </label>
          {form.includeBalanced && (
            <div className="mt-2 rounded-xl border border-[var(--color-oxblood)]/5 bg-[var(--color-warm-cream)] p-4">
              <NutritionFields
                calories={form.balancedCalories}
                onCalories={(v) => setField("balancedCalories", v)}
                protein={form.balancedProtein}
                onProtein={(v) => setField("balancedProtein", v)}
                carbs={form.balancedCarbs}
                onCarbs={(v) => setField("balancedCarbs", v)}
                fat={form.balancedFat}
                onFat={(v) => setField("balancedFat", v)}
                starchType={form.balancedStarchType}
                onStarchType={(v) => setField("balancedStarchType", v)}
                starchCookedG={form.balancedStarchCookedG}
                onStarchCookedG={(v) => setField("balancedStarchCookedG", v)}
              />
            </div>
          )}

          {/* LOW CARB (optional) */}
          <label className="mt-4 flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={form.includeLowCarb}
              onChange={(e) => setField("includeLowCarb", e.target.checked)}
              className="h-4 w-4 rounded accent-[var(--color-oxblood)]"
            />
            <span className="text-sm font-semibold text-[var(--color-charcoal)]">
              Add LOW CARB profile (optional)
            </span>
          </label>
          {form.includeLowCarb && (
            <div className="mt-2 rounded-xl border border-[var(--color-oxblood)]/5 bg-[var(--color-warm-cream)] p-4">
              <NutritionFields
                calories={form.lowCarbCalories}
                onCalories={(v) => setField("lowCarbCalories", v)}
                protein={form.lowCarbProtein}
                onProtein={(v) => setField("lowCarbProtein", v)}
                carbs={form.lowCarbCarbs}
                onCarbs={(v) => setField("lowCarbCarbs", v)}
                fat={form.lowCarbFat}
                onFat={(v) => setField("lowCarbFat", v)}
                starchType={form.lowCarbStarchType}
                onStarchType={(v) => setField("lowCarbStarchType", v)}
                starchCookedG={form.lowCarbStarchCookedG}
                onStarchCookedG={(v) => setField("lowCarbStarchCookedG", v)}
              />
            </div>
          )}
        </fieldset>

        {/* SUBMIT */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            disabled={saving}
            onClick={handleSubmit}
            className="rounded-xl bg-[var(--color-oxblood)] px-8 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Uploading image and saving recipe..." : "Publish recipe"}
          </button>
          {saving && (
            <p className="text-sm text-[var(--color-charcoal)]/60">This may take a moment...</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Nutrition sub-form
// ---------------------------------------------------------------------------

function NutritionFields({
  calories,
  onCalories,
  protein,
  onProtein,
  carbs,
  onCarbs,
  fat,
  onFat,
  starchType,
  onStarchType,
  starchCookedG,
  onStarchCookedG,
}: {
  readonly calories: string;
  readonly onCalories: (v: string) => void;
  readonly protein: string;
  readonly onProtein: (v: string) => void;
  readonly carbs: string;
  readonly onCarbs: (v: string) => void;
  readonly fat: string;
  readonly onFat: (v: string) => void;
  readonly starchType: string;
  readonly onStarchType: (v: string) => void;
  readonly starchCookedG: string;
  readonly onStarchCookedG: (v: string) => void;
}) {
  const inputClass =
    "w-full rounded-lg border border-[var(--color-oxblood)]/10 px-3 py-2 text-sm focus:border-[var(--color-oxblood)] focus:outline-none focus:ring-1 focus:ring-[var(--color-oxblood)]";

  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <div>
        <label className="block text-xs font-medium text-[var(--color-charcoal)]/70">
          Calories (kcal)
        </label>
        <input
          type="number"
          min={0}
          className={inputClass}
          value={calories}
          onChange={(e) => onCalories(e.target.value)}
          placeholder="620"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--color-charcoal)]/70">
          Protein (g)
        </label>
        <input
          type="number"
          min={0}
          className={inputClass}
          value={protein}
          onChange={(e) => onProtein(e.target.value)}
          placeholder="35"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--color-charcoal)]/70">
          Carbs (g)
        </label>
        <input
          type="number"
          min={0}
          className={inputClass}
          value={carbs}
          onChange={(e) => onCarbs(e.target.value)}
          placeholder="66"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--color-charcoal)]/70">Fat (g)</label>
        <input
          type="number"
          min={0}
          className={inputClass}
          value={fat}
          onChange={(e) => onFat(e.target.value)}
          placeholder="23"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--color-charcoal)]/70">
          Starch type
        </label>
        <input
          type="text"
          maxLength={80}
          className={inputClass}
          value={starchType}
          onChange={(e) => onStarchType(e.target.value)}
          placeholder="e.g. Rice"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--color-charcoal)]/70">
          Starch cooked (g)
        </label>
        <input
          type="number"
          min={0}
          className={inputClass}
          value={starchCookedG}
          onChange={(e) => onStarchCookedG(e.target.value)}
          placeholder="180"
        />
      </div>
    </div>
  );
}

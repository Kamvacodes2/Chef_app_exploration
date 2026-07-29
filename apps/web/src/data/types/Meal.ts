import type { PaletteId } from "./Palette";

export interface MealImage {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly alt: string;
}

export interface Category {
  readonly id: string;
  readonly name: string;
  readonly paletteId: PaletteId;
  readonly mood: string;
  readonly order: number;
}

export interface MealNutrition {
  readonly protein: number;
  readonly carbs: number;
  readonly fat: number;
  readonly fibre: number;
}

export interface Meal {
  readonly id: string;
  readonly categoryId: string;
  readonly name: string;
  readonly description: string;
  readonly priceDisplay: string;
  readonly image: MealImage;
  readonly isHot: boolean;
  readonly hasCutlery: boolean;
  readonly order: number;
  readonly nutrition: MealNutrition;
}

export interface MealsData {
  readonly categories: readonly Category[];
  readonly meals: readonly Meal[];
}

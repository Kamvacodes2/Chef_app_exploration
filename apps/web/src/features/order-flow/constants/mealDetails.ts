import type { OrderMenuItem } from "../types";

export interface MealNutritionDetail {
  readonly calories: number;
  readonly protein: number;
  readonly carbs: number;
  readonly fat: number;
}

export interface MealDetail {
  readonly ingredients: readonly string[];
  readonly nutrition: MealNutritionDetail;
}

const DETAILS: Record<string, MealDetail> = {
  "winter-oxtail-stew": {
    ingredients: ["Oxtail", "carrots", "onion", "tomato", "herbs", "rice or pap"],
    nutrition: { calories: 520, protein: 38, carbs: 16, fat: 30 },
  },
  "sa-roast-chicken-seven-colours": {
    ingredients: ["Roast chicken", "rice", "beetroot", "pumpkin", "spinach", "chakalaka"],
    nutrition: { calories: 470, protein: 36, carbs: 34, fat: 16 },
  },
  "winter-lamb-chops": {
    ingredients: ["Lamb chops", "herbs", "garlic", "greens", "lemon"],
    nutrition: { calories: 495, protein: 40, carbs: 2, fat: 32 },
  },
  "healthy-chicken-gyro-bowl": {
    ingredients: ["Grilled chicken", "fresh greens", "cucumber", "tomato", "tzatziki"],
    nutrition: { calories: 360, protein: 34, carbs: 22, fat: 12 },
  },
  "healthy-burger-bowl": {
    ingredients: ["Lean mince", "lettuce", "tomato", "pickles", "light burger sauce"],
    nutrition: { calories: 385, protein: 30, carbs: 18, fat: 14 },
  },
  "healthy-chicken-salad-bowl": {
    ingredients: ["Chicken breast", "mixed vegetables", "greens", "avocado", "lemon dressing"],
    nutrition: { calories: 320, protein: 32, carbs: 14, fat: 9 },
  },
  "chicken-peri-peri": {
    ingredients: ["Chicken", "peri-peri sauce", "garlic", "lemon", "seasonal veg"],
    nutrition: { calories: 420, protein: 42, carbs: 6, fat: 16 },
  },
  "chicken-bbq": {
    ingredients: ["Chicken", "smoky BBQ glaze", "roasted vegetables", "herbs"],
    nutrition: { calories: 445, protein: 40, carbs: 12, fat: 18 },
  },
  "chicken-roasted": {
    ingredients: ["Whole chicken", "herbs", "garlic", "lemon", "roasted vegetables"],
    nutrition: { calories: 455, protein: 44, carbs: 4, fat: 20 },
  },
  "beef-steak-chips": {
    ingredients: ["Steak", "potatoes", "herb butter", "greens"],
    nutrition: { calories: 610, protein: 45, carbs: 40, fat: 24 },
  },
  "sa-oxtail-seven-colours": {
    ingredients: ["Oxtail", "rice", "pumpkin", "spinach", "beetroot", "chakalaka"],
    nutrition: { calories: 590, protein: 34, carbs: 32, fat: 28 },
  },
  "breakfast-overnight-oats": {
    ingredients: ["Oats", "yoghurt", "fruit", "honey", "seeds"],
    nutrition: { calories: 330, protein: 12, carbs: 45, fat: 8 },
  },
  "pasta-beef-lasagne": {
    ingredients: ["Pasta", "beef ragu", "tomato", "cheese", "herbs"],
    nutrition: { calories: 540, protein: 28, carbs: 48, fat: 20 },
  },
  "pasta-meatball": {
    ingredients: ["Meatballs", "pasta", "tomato sauce", "parmesan", "herbs"],
    nutrition: { calories: 505, protein: 26, carbs: 46, fat: 18 },
  },
  "pasta-cheesy-mince": {
    ingredients: ["Mince", "pasta", "cheese", "tomato", "onion"],
    nutrition: { calories: 520, protein: 24, carbs: 50, fat: 19 },
  },
  "sa-chicken-seven-colours": {
    ingredients: ["Chicken", "rice", "spinach", "pumpkin", "beetroot", "coleslaw"],
    nutrition: { calories: 465, protein: 35, carbs: 33, fat: 15 },
  },
};

export function getMealDetail(item: OrderMenuItem): MealDetail | undefined {
  return DETAILS[item.id];
}

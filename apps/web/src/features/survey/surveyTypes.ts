export type SurveyRole = "CUSTOMER" | "CHEF" | "COOK";

export type SurveyCompletionStatus = "YES" | "NO" | "PARTIAL";
export type SurveyIngredientStatus = "YES" | "NO" | "SOME_MISSING";
export type SurveySpicePreference = "MILD" | "MEDIUM" | "HOT" | "NO_SPICE" | "UNKNOWN";
export type SurveyCleaningExpectation = "NORMAL" | "HIGH" | "VERY_HIGH";

export interface SurveyMediaItem {
  storageKey: string;
  originalFilename: string;
  mediaType: "IMAGE" | "VIDEO";
  fileSizeBytes: number;
}

export interface CustomerSurveySubmission {
  mealRating: number;
  cleaningRating?: number;
  punctualityRating?: number;
  overallRating?: number;
  tags?: string[];
  comment?: string | null;
  media?: SurveyMediaItem[];
  socialConsent?: boolean;
  reviewerName?: string;
  reviewerRole?: string;
  reviewerLocation?: string;
}

export interface CookSurveySubmission {
  sessionRating: number;
  customerRating?: number;
  sessionCompleted?: SurveyCompletionStatus;
  mealsCompleted?: SurveyCompletionStatus;
  cleaningCompleted?: SurveyCompletionStatus;
  ingredientsAvailable?: SurveyIngredientStatus;
  ingredientNotes?: string | null;
  spicePreference?: SurveySpicePreference;
  allergyOrDietaryNotes?: string | null;
  customerPreferenceNotes?: string | null;
  cleaningExpectationLevel?: SurveyCleaningExpectation;
  cleaningNotes?: string | null;
  kitchenAccessNotes?: string | null;
  parkingAccessNotes?: string | null;
  safetyConcerns?: boolean;
  safetyDetails?: string | null;
  supportFollowUpRequired?: boolean;
  nextChefNotes?: string | null;
  tags?: string[];
  comment?: string | null;
}

export const CUSTOMER_REVIEW_TAGS = [
  "✨ Exquisite Flavours",
  "🧼 Spotless Kitchen",
  "🍽️ Masterful Presentation",
  "⏰ Punctual & Friendly",
  "🥗 Accommodated Dietary Needs",
  "👨‍👩‍👧 Great with Family & Kids",
  "💬 Great Communication",
  "⭐ Would Book Again",
] as const;

export const CHEF_SESSION_TAGS = [
  "🌟 Fantastic Host",
  "🍳 Well-Equipped Kitchen",
  "🥦 Fresh & Ready Ingredients",
  "📍 Easy Access & Parking",
  "⏱️ Clear Schedule",
  "❤️ Welcoming Family",
] as const;

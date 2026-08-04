import type { OrderMenuItem } from "@/features/order-flow/types";
import type { BrowserMeal } from "./api/mealCatalogClient";
import { mealImage, toPaletteId } from "./mealPresentation";

/**
 * Mains are never charged individually (every non-subscription order is a flat
 * base price), so the adapter deliberately drops any legacy price the catalog
 * still exposes instead of surfacing it in order state.
 */
const INCLUDED_MAIN_PRICE_DISPLAY = "Included in package";

/**
 * The single place a catalog meal becomes order-flow state.
 *
 * `id` MUST stay the catalog slug: `buildBookingRequestPayload` submits
 * `mainSlug: state.main.id`, so this is what the backend resolves the booking
 * against.
 */
export function toOrderMenuItem(meal: BrowserMeal): OrderMenuItem {
  const image = mealImage(meal);
  return {
    id: meal.slug,
    name: meal.name,
    description: meal.description,
    priceDisplay: INCLUDED_MAIN_PRICE_DISPLAY,
    price: 0,
    course: "main",
    imageSrc: image.src,
    imageAlt: image.alt,
    paletteId: toPaletteId(meal.paletteId),
    goalTags: meal.goalTags,
    isSignature: meal.isSignature,
  };
}

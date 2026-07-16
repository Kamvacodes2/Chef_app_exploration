import Image from "next/image";
import type { Meal } from "@/data/types/Meal";
import { CutlerySheen } from "./CutlerySheen";
import { NutritionFacts } from "./NutritionFacts";
import { SteamEffect } from "./SteamEffect";

export interface MealCardProps {
  readonly meal: Meal;
}

/**
 * A single "meal module": the plate and its info card read as ONE object,
 * like a real photographed dish resting on the table beside a product card.
 * The meal photo keeps its natural rectangular shape (soft rounded corners,
 * no circular crop) so it reads as a plate on the table rather than a
 * profile-picture badge. The info card is pulled up underneath it via a
 * small negative margin so the photo overlaps the card's top edge by only
 * ~15-20% of the photo's own height. The card reserves matching top padding
 * so its text content clears the overlapped area.
 */
export function MealCard({ meal }: MealCardProps) {
  return (
    <div className="plate-settle flex flex-col items-center" data-testid="meal-card">
      <div className="relative z-10" style={{ perspective: "600px" }}>
        {/* Soft grounding shadow beneath the plate */}
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-[85%] h-6 w-4/5 -translate-x-1/2 rounded-full bg-black/[0.18] blur-[35px]"
        />
        {/* Extremely subtle table-gloss reflection just past the plate's bottom edge */}
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-[97%] h-1.5 w-3/5 -translate-x-1/2 rounded-full bg-white/[0.07] blur-md"
        />
        <div
          className="relative aspect-square w-40 overflow-hidden rounded-2xl border-4 border-white/90 bg-white/90 shadow-xl sm:w-48"
          data-testid="meal-plate"
          style={{ transform: "rotateX(8deg)", transformOrigin: "50% 100%" }}
        >
          {meal.hasCutlery && <CutlerySheen />}
          <Image
            src={meal.image.src}
            alt={meal.image.alt}
            fill
            sizes="(max-width: 767px) 40vw, 22vw"
            style={{ objectFit: "cover" }}
          />
          {meal.isHot && <SteamEffect />}
        </div>
      </div>
      <div className="-mt-7 w-full max-w-[17rem] rounded-xl bg-white/85 px-3.5 pb-4 pt-9 text-center leading-relaxed shadow backdrop-blur-sm sm:-mt-9 sm:max-w-[19rem] sm:px-4 sm:pb-4 sm:pt-11">
        <h3 className="font-display text-xs font-semibold leading-snug text-neutral-900 sm:text-sm">
          {meal.name}
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-neutral-600 sm:mt-2 sm:text-xs">
          {meal.description}
        </p>
        <p className="mt-2 font-display text-sm text-neutral-900 sm:mt-2.5 sm:text-base">
          {meal.priceDisplay}
        </p>
        <div className="my-2.5 h-px w-full bg-neutral-900/10 sm:my-2.5" aria-hidden="true" />
        <NutritionFacts nutrition={meal.nutrition} />
      </div>
    </div>
  );
}

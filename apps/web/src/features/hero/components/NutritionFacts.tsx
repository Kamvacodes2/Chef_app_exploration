import type { MealNutrition } from "@/data/types/Meal";

export interface NutritionFactsProps {
  readonly nutrition: MealNutrition;
}

const STATS: ReadonlyArray<{ readonly label: string; readonly key: keyof MealNutrition }> = [
  { label: "Protein", key: "protein" },
  { label: "Carbs", key: "carbs" },
  { label: "Fat", key: "fat" },
  { label: "Fibre", key: "fibre" },
];

/**
 * A quiet, editorial row of per-serving macro stats. Deliberately understated
 * (small caps labels, no borders/boxes) so it reads as a lifestyle detail
 * rather than a clinical nutrition label.
 */
export function NutritionFacts({ nutrition }: NutritionFactsProps) {
  return (
    <dl
      className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1 border-t border-neutral-900/10 pt-1.5"
      data-testid="nutrition-facts"
      aria-label="Nutrition per serving"
    >
      {STATS.map(({ label, key }) => (
        <div key={key} className="flex items-baseline gap-1">
          <dd className="text-[11px] font-semibold tabular-nums text-neutral-900">
            {nutrition[key]}g
          </dd>
          <dt className="text-[9px] uppercase tracking-widest text-neutral-500">{label}</dt>
        </div>
      ))}
    </dl>
  );
}

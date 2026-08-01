"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { ReactElement } from "react";
import { getPalette } from "@/features/hero/constants/palettes";
import { cn } from "@/lib/cn";
import { getMealDetail } from "../constants/mealDetails";
import type { OrderMenuItem } from "../types";

export interface DishCardProps {
  readonly item: OrderMenuItem;
  readonly selected: boolean;
  readonly onSelect: () => void;
  /** Optional badge (e.g. "In demand", "SA favourite"). */
  readonly badge?: string;
  /** Render the selectable card without a photo, for choices still awaiting imagery. */
  readonly showImage?: boolean;
}

/**
 * A tappable dish card used for mains, sides, and desserts. It can omit the
 * image while a course is still awaiting approved photography.
 */
export function DishCard({
  item,
  selected,
  onSelect,
  badge,
  showImage = true,
}: DishCardProps): ReactElement {
  const palette = getPalette(item.paletteId);
  const detail = getMealDetail(item);
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.97 }}
      aria-pressed={selected}
      className={cn(
        "group relative flex w-full flex-col overflow-hidden rounded-2xl text-left shadow-md transition-shadow",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-bone)]",
        selected ? "ring-[3px] shadow-xl" : "ring-1 ring-black/10 hover:shadow-lg",
      )}
      style={{
        // Selected cards glow with the item's palette colour.
        ["--tw-ring-color" as never]: selected ? palette.from : undefined,
      }}
    >
      {selected ? (
        <span
          className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
          style={{ backgroundColor: palette.from, color: palette.textColor }}
          aria-hidden="true"
        >
          {"\u2713"}
        </span>
      ) : null}

      {showImage ? (
        <div className="relative h-32 w-full overflow-hidden bg-[var(--color-oxblood)]">
          <Image
            src={item.imageSrc}
            alt={item.imageAlt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 280px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {badge ? (
            <span className="absolute left-2 top-2 rounded-full bg-[var(--color-oxblood)]/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--color-bone)]">
              {badge}
            </span>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "flex flex-1 flex-col gap-2.5 bg-white p-3.5",
          showImage ? "" : "min-h-[146px] justify-center pr-12",
        )}
      >
        {!showImage && badge ? (
          <span className="w-fit rounded-full bg-[var(--color-warm-cream)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--color-oxblood)]">
            {badge}
          </span>
        ) : null}
        <div>
          <h4 className="font-display text-base font-semibold leading-tight text-[var(--color-oxblood)]">
            {item.name}
          </h4>
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[var(--color-oxblood)]/65">
            {item.description}
          </p>
        </div>
        {detail ? (
          <dl
            className="grid grid-cols-4 gap-1.5 border-t border-[var(--color-oxblood)]/10 pt-2.5 text-center"
            aria-label={`Nutrition for ${item.name}`}
          >
            <div>
              <dt className="text-[9px] font-bold uppercase tracking-wide text-[var(--color-oxblood)]/55">
                Cal
              </dt>
              <dd className="text-[11px] font-bold text-[var(--color-oxblood)]">
                {detail.nutrition.calories}
              </dd>
            </div>
            <div>
              <dt className="text-[9px] font-bold uppercase tracking-wide text-[var(--color-oxblood)]/55">
                Protein
              </dt>
              <dd className="text-[11px] font-bold text-[var(--color-oxblood)]">
                {detail.nutrition.protein}g
              </dd>
            </div>
            <div>
              <dt className="text-[9px] font-bold uppercase tracking-wide text-[var(--color-oxblood)]/55">
                Carbs
              </dt>
              <dd className="text-[11px] font-bold text-[var(--color-oxblood)]">
                {detail.nutrition.carbs}g
              </dd>
            </div>
            <div>
              <dt className="text-[9px] font-bold uppercase tracking-wide text-[var(--color-oxblood)]/55">
                Fat
              </dt>
              <dd className="text-[11px] font-bold text-[var(--color-oxblood)]">
                {detail.nutrition.fat}g
              </dd>
            </div>
          </dl>
        ) : null}
      </div>
    </motion.button>
  );
}

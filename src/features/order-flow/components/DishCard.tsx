"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { ReactElement } from "react";
import { getPalette } from "@/features/hero/constants/palettes";
import { cn } from "@/lib/cn";
import type { OrderMenuItem } from "../types";

export interface DishCardProps {
  readonly item: OrderMenuItem;
  readonly selected: boolean;
  readonly onSelect: () => void;
  /** Optional badge (e.g. "In demand", "SA favourite"). */
  readonly badge?: string;
}

/**
 * A tappable dish card: photo, name, description, price, and a brand-palette
 * accent glow when selected. Used for mains, sides, and desserts alike.
 */
export function DishCard({ item, selected, onSelect, badge }: DishCardProps): ReactElement {
  const palette = getPalette(item.paletteId);
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.97 }}
      aria-pressed={selected}
      className={cn(
        "group relative flex w-full flex-col overflow-hidden rounded-3xl text-left shadow-md transition-shadow",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F3E3B2]",
        selected ? "ring-4 shadow-xl" : "ring-1 ring-black/10 hover:shadow-lg",
      )}
      style={{
        // Selected cards glow with the item's palette colour.
        ["--tw-ring-color" as never]: selected ? palette.from : undefined,
      }}
    >
      <div className="relative h-36 w-full overflow-hidden bg-[#2A2F18]">
        <Image
          src={item.imageSrc}
          alt={item.imageAlt}
          fill
          sizes="(max-width: 640px) 50vw, 240px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {badge ? (
          <span className="absolute left-2 top-2 rounded-full bg-[#1A1208]/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#F3E3B2]">
            {badge}
          </span>
        ) : null}
        {selected ? (
          <span
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold"
            style={{ backgroundColor: palette.from, color: palette.textColor }}
            aria-hidden="true"
          >
            ✓
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 bg-white p-3">
        <div className="flex items-baseline justify-between gap-2">
          <h4 className="font-display text-sm font-semibold text-[#1A1208]">{item.name}</h4>
          <span className="shrink-0 text-sm font-bold text-[#74070D]">{item.priceDisplay}</span>
        </div>
        <p className="line-clamp-2 text-xs leading-relaxed text-[#1A1208]/60">{item.description}</p>
      </div>
    </motion.button>
  );
}

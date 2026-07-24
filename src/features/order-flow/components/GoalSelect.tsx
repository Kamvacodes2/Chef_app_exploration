"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useRef, useState } from "react";
import type { ReactElement } from "react";
import { getPalette } from "@/features/hero/constants/palettes";
import { GOALS } from "../constants/goals";
import { useOrder } from "../state/OrderContext";
import type { Goal } from "../types";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 22 } },
};

function GoalTile({ goal, onSelect }: { readonly goal: Goal; readonly onSelect: () => void }): ReactElement {
  const palette = getPalette(goal.paletteId);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex min-h-36 w-full flex-col items-center gap-2 rounded-3xl bg-[var(--color-warm-cream)] p-5 text-center text-[var(--color-oxblood)] ring-1 ring-white/30 transition hover:-translate-y-1 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-bone)]"
    >
      <span
        className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-white transition-transform group-hover:scale-105"
        style={{ boxShadow: `inset 0 0 0 999px ${palette.from}1f` }}
      >
        <Image src={goal.image} alt={goal.imageAlt} fill sizes="80px" className="object-contain" />
      </span>
      <span className="font-display text-base font-semibold text-[var(--color-oxblood)]">{goal.title}</span>
      <span className="text-xs leading-snug text-[var(--color-charcoal)]/70">{goal.tagline}</span>
    </button>
  );
}

/**
 * Onboarding: pick a body/lifestyle goal. The first view keeps the decision
 * light with three full tiles and a partial fourth tile cue. "See all"
 * expands to the full set.
 */
export function GoalSelect(): ReactElement {
  const { selectGoal } = useOrder();
  const [showAll, setShowAll] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const visibleGoals = showAll ? GOALS : GOALS.slice(0, 4);

  function scrollGoalsForward(): void {
    const track = trackRef.current;
    if (!track) return;

    const firstTile = track.firstElementChild as HTMLElement | null;
    const scrollAmount = firstTile ? firstTile.getBoundingClientRect().width + 16 : track.clientWidth * 0.8;
    track.scrollBy({ left: scrollAmount, behavior: "smooth" });
  }

  return (
    <div className="flex w-full flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="font-display text-4xl font-semibold text-[var(--color-bone)] sm:text-5xl">
          What are you feeding?
        </h2>
        <p className="max-w-md text-sm text-[var(--color-bone)]/70 sm:text-base">
          Pick a goal and we&apos;ll line up the plates to match &mdash; or just show you the good stuff.
        </p>
      </div>

      <motion.div
        ref={trackRef}
        data-testid="goal-tile-track"
        variants={container}
        initial="hidden"
        animate="show"
        className={
          showAll
            ? "grid w-full grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4"
            : "-mx-4 flex w-[calc(100%+2rem)] snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:w-full sm:gap-4 sm:overflow-hidden sm:px-0 sm:pb-0"
        }
      >
        {visibleGoals.map((goal, index) => {
          const isPeekTile = !showAll && index === 3;
          return (
            <motion.div
              key={goal.id}
              variants={item}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.96 }}
              className={
                showAll
                  ? "relative w-full"
                  : "relative w-[76vw] max-w-[330px] shrink-0 snap-start sm:w-auto sm:max-w-none sm:basis-[30%]"
              }
            >
              <GoalTile goal={goal} onSelect={() => selectGoal(goal.id)} />
              {isPeekTile ? (
                <button
                  type="button"
                  onClick={scrollGoalsForward}
                  aria-label="Scroll goals"
                  className="absolute left-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-oxblood)] text-2xl leading-none text-[var(--color-bone)] shadow-lg ring-2 ring-[var(--color-bone)]/80 transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-bone)]"
                >
                  &rarr;
                </button>
              ) : null}
            </motion.div>
          );
        })}
      </motion.div>

      {!showAll ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          aria-expanded={showAll}
          className="inline-flex min-h-11 items-center rounded-2xl bg-[var(--color-bone)] px-5 py-3 text-sm font-bold text-[var(--color-oxblood)] shadow-sm transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-bone)]"
        >
          See all
        </button>
      ) : null}
    </div>
  );
}

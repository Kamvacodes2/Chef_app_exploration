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

function GoalTile({
  goal,
  onSelect,
}: {
  readonly goal: Goal;
  readonly onSelect: () => void;
}): ReactElement {
  const palette = getPalette(goal.paletteId);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex min-h-36 w-full flex-col items-center gap-2 rounded-3xl bg-[var(--color-warm-cream)] p-5 text-center text-[var(--color-oxblood)] ring-1 ring-white/30 transition hover:-translate-y-1 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-bone)]"
    >
      <span
        className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-white transition-transform group-hover:scale-105"
        style={{ boxShadow: "inset 0 0 0 999px " + palette.from + "1f" }}
      >
        <Image src={goal.image} alt={goal.imageAlt} fill sizes="80px" className="object-contain" />
      </span>
      <span className="font-display text-base font-semibold text-[var(--color-oxblood)]">
        {goal.title}
      </span>
      <span className="text-xs leading-snug text-[var(--color-charcoal)]/70">{goal.tagline}</span>
    </button>
  );
}

/** Pick a goal from the complete, arrow-controlled rail without a browser scrollbar. */
export function GoalSelect(): ReactElement {
  const { selectGoal } = useOrder();
  const [activeGoalIndex, setActiveGoalIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);

  function moveGoals(direction: -1 | 1): void {
    const nextIndex = Math.min(Math.max(activeGoalIndex + direction, 0), GOALS.length - 1);
    if (nextIndex === activeGoalIndex) return;

    setActiveGoalIndex(nextIndex);
    const track = trackRef.current;
    const nextTile = track?.children.item(nextIndex) as HTMLElement | null;
    track?.scrollTo({ left: nextTile?.offsetLeft ?? 0, behavior: "smooth" });
  }

  return (
    <div className="flex w-full flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="font-display text-4xl font-semibold text-[var(--color-bone)] sm:text-5xl">
          How can <span className="sr-only">chefmate</span>
          <Image
            src="/images/brand/logo-wordmark.webp"
            alt=""
            width={720}
            height={142}
            aria-hidden="true"
            className="inline h-[1em] w-auto object-contain align-baseline invert"
          />{" "}
          help?
        </h2>
        <p className="max-w-md text-sm text-[var(--color-bone)]/70 sm:text-base">
          Pick a goal and we&apos;ll line up the plates to match &mdash; or just show you the good
          stuff.
        </p>
      </div>

      <div
        className="flex w-full justify-center gap-3 sm:justify-end"
        aria-label="Goal carousel controls"
      >
        <button
          type="button"
          onClick={() => moveGoals(-1)}
          disabled={activeGoalIndex === 0}
          aria-label="Previous goal"
          aria-controls="goal-tile-track"
          title="Previous goal"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-bone)] text-2xl leading-none text-[var(--color-oxblood)] shadow-sm transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-bone)]"
        >
          &larr;
        </button>
        <button
          type="button"
          onClick={() => moveGoals(1)}
          disabled={activeGoalIndex === GOALS.length - 1}
          aria-label="Next goal"
          aria-controls="goal-tile-track"
          title="Next goal"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-bone)] text-2xl leading-none text-[var(--color-oxblood)] shadow-sm transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-bone)]"
        >
          &rarr;
        </button>
        <span className="sr-only" aria-live="polite">
          Showing goal {activeGoalIndex + 1} of {GOALS.length}
        </span>
      </div>

      <motion.div
        ref={trackRef}
        data-testid="goal-tile-track"
        id="goal-tile-track"
        data-active-goal-index={activeGoalIndex}
        variants={container}
        initial="hidden"
        animate="show"
        className="flex w-full gap-3 overflow-hidden scroll-smooth sm:gap-4"
      >
        {GOALS.map((goal) => (
          <motion.div
            key={goal.id}
            variants={item}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.96 }}
            className="relative w-full shrink-0 sm:w-auto sm:basis-[30%]"
          >
            <GoalTile goal={goal} onSelect={() => selectGoal(goal.id)} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import type { ReactElement } from "react";
import { GOALS } from "../constants/goals";
import { useOrder } from "../state/OrderContext";
import { getPalette } from "@/features/hero/constants/palettes";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 22 } },
};

/**
 * Onboarding: pick a body/lifestyle goal. Fun, tappable cards that lead into
 * a tailored menu. Choosing one immediately advances to the meal step.
 */
export function GoalSelect(): ReactElement {
  const { selectGoal } = useOrder();

  return (
    <div className="flex w-full flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="font-display text-4xl font-semibold text-[#F3E3B2] sm:text-5xl">
          What are you feeding?
        </h2>
        <p className="max-w-md text-sm text-[#F3E3B2]/70 sm:text-base">
          Pick a goal and we&apos;ll line up the plates to match — or just show you the good stuff.
        </p>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4"
      >
        {GOALS.map((goal) => {
          const palette = getPalette(goal.paletteId);
          return (
            <motion.button
              key={goal.id}
              variants={item}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => selectGoal(goal.id)}
              className="group flex flex-col items-center gap-2 rounded-3xl bg-white/[0.06] p-5 text-center ring-1 ring-white/10 backdrop-blur-sm transition-colors hover:bg-white/[0.12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F3E3B2]"
            >
              <span
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${palette.from}26` }}
                aria-hidden="true"
              >
                {goal.emoji}
              </span>
              <span className="font-display text-base font-semibold text-[#F3E3B2]">{goal.title}</span>
              <span className="text-xs leading-snug text-[#F3E3B2]/60">{goal.tagline}</span>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}

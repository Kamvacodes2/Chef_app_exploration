"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Meal } from "@/data/types/Meal";
import { MEAL_CARD_VARIANTS, MEAL_TRANSITION_MS } from "../constants/transitions";
import { MealCard } from "./MealCard";

export interface MealStageProps {
  readonly meal: Meal | undefined;
}

export function MealStage({ meal }: MealStageProps) {
  if (!meal) return null;

  return (
    <div className="relative" data-testid="meal-stage">
      <AnimatePresence mode="wait">
        <motion.div
          key={meal.id}
          variants={MEAL_CARD_VARIANTS}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: MEAL_TRANSITION_MS / 1000 }}
        >
          <MealCard meal={meal} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

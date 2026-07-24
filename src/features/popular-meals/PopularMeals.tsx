"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactElement } from "react";
import { MealLoop } from "@/features/hero/components/MealLoop";
import { LOOP_ADVANCE_INTERVAL_MS } from "@/features/hero/constants/transitions";

export function PopularMeals(): ReactElement {
  const [loopIndex, setLoopIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return undefined;
    const intervalId = setInterval(() => {
      setLoopIndex((current) => current + 1);
    }, LOOP_ADVANCE_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [paused]);

  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);

  return (
    <section
      aria-labelledby="popular-meals-title"
      id="popular-meals"
      className="min-h-[70dvh] overflow-hidden bg-white py-14 text-[var(--color-oxblood)] md:py-20"
      data-testid="popular-meals"
    >
      <div className="mx-auto max-w-[1440px] px-4 md:px-10">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-oxblood)]/70">
          Most loved
        </p>
        <h2 id="popular-meals-title" className="font-display text-4xl leading-none md:text-6xl">
          Popular this week
        </h2>
      </div>
      <div className="mt-16 w-full py-10 md:mt-20 md:py-14" data-testid="popular-plate-glide">
        <MealLoop loopIndex={loopIndex} onPause={pause} onResume={resume} />
      </div>
      <div className="mt-4 flex justify-center px-4 md:mt-6">
        <a
          href="#order-flow"
          className="inline-flex min-h-12 translate-x-6 items-center justify-center rounded-2xl border-2 border-[var(--color-oxblood)] bg-[var(--color-oxblood)] px-9 py-3 font-display text-lg font-semibold text-white shadow-lg transition hover:border-[var(--color-oxblood)] hover:bg-[var(--color-oxblood)]/90 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-oxblood)]"
        >
          Choose a Meal
        </a>
      </div>
    </section>
  );
}

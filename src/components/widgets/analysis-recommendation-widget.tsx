"use client";

import type { WellnessActivityType } from "@/types";
import { FiArrowRight } from "react-icons/fi";

export function AnalysisRecommendationWidget({
  recommendedActivity,
  reasoning,
  estimatedMinutes,
}: {
  recommendedActivity: WellnessActivityType;
  reasoning: string;
  estimatedMinutes: number;
}) {
  return (
    <section className="rounded-2xl border border-white/25 bg-white/20 p-5 text-white backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.22em] text-white/60">
        Next session
      </p>
      <div className="mt-3 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold capitalize">
            {recommendedActivity}
          </h3>
          <p className="mt-2 text-sm leading-6 text-white/80">{reasoning}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-bold">
          {estimatedMinutes} min
          <FiArrowRight aria-hidden />
        </div>
      </div>
    </section>
  );
}

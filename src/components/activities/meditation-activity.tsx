"use client";

import { CircularCountdown } from "@/components/Timer";
import type { ActivityRuntime } from "@/types";

export function MeditationActivity({ runtime }: { runtime: ActivityRuntime }) {
  return (
    <section className="flex flex-col items-center rounded-2xl border border-white/25 bg-white/20 p-6 text-center text-white backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.22em] text-white/60">
        Meditation
      </p>
      <h2 className="mt-2 text-3xl font-bold capitalize">{runtime.phase}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-white/80">
        {runtime.guidance}
      </p>
      <div className="mt-6">
        <CircularCountdown
          duration={runtime.totalSeconds}
          timeLeft={runtime.timerSeconds}
        />
      </div>
    </section>
  );
}

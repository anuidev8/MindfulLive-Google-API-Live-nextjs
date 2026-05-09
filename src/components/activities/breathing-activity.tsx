"use client";

import { useEffect, useMemo, useState } from "react";
import BreathingVisualizer from "@/components/meditation/BreathingVisualizer";
import { BreathingAnalyzer, type BreathingData } from "@/lib/breathing-analyzer";
import type { ActivityRuntime } from "@/types";

export function BreathingActivity({ runtime }: { runtime: ActivityRuntime }) {
  const [breathingData, setBreathingData] = useState<BreathingData | null>(null);

  useEffect(() => {
    const analyzer = new BreathingAnalyzer();
    analyzer.on("breathing", setBreathingData);
    analyzer.start().catch(() => undefined);

    return () => {
      analyzer.off("breathing", setBreathingData);
      analyzer.stop();
    };
  }, []);

  const breathingRate = breathingData?.rate ?? 8;
  const stressLevel = breathingData?.stressIndicator ?? 0.25;
  const pattern = breathingData?.pattern ?? "guided";

  return (
    <div className="space-y-4">
      <ActivityHeader runtime={runtime} pattern={pattern} />
      <BreathingVisualizer
        breathingRate={breathingRate}
        stressLevel={stressLevel}
        isActive={!runtime.paused}
      />
    </div>
  );
}

function ActivityHeader({
  runtime,
  pattern,
}: {
  runtime: ActivityRuntime;
  pattern: string;
}) {
  const minutes = useMemo(
    () => Math.floor(runtime.timerSeconds / 60).toString().padStart(2, "0"),
    [runtime.timerSeconds]
  );
  const seconds = useMemo(
    () => (runtime.timerSeconds % 60).toString().padStart(2, "0"),
    [runtime.timerSeconds]
  );

  return (
    <section className="rounded-2xl border border-white/25 bg-white/20 p-5 text-white backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-white/60">
            Breathing
          </p>
          <h2 className="mt-2 text-3xl font-bold capitalize">{runtime.phase}</h2>
          <p className="mt-2 text-sm text-white/80">{runtime.guidance}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">
            {minutes}:{seconds}
          </div>
          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/55">
            {pattern}
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { CircularCountdown } from "@/components/Timer";
import { PoseAnalyzer, type PoseData } from "@/lib/pose-analyzer";
import type { ActivityRuntime } from "@/types";

export function FocusActivity({ runtime }: { runtime: ActivityRuntime }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [poseData, setPoseData] = useState<PoseData | null>(null);

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const analyzer = new PoseAnalyzer();
    analyzer.on("pose", setPoseData);
    analyzer.start(videoRef.current, canvasRef.current).catch(() => undefined);

    return () => {
      analyzer.off("pose", setPoseData);
      analyzer.stop();
    };
  }, []);

  return (
    <section className="rounded-2xl border border-white/25 bg-white/20 p-5 text-white backdrop-blur-xl">
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <div className="flex flex-col items-center gap-4">
          <CircularCountdown
            duration={runtime.totalSeconds}
            timeLeft={runtime.timerSeconds}
          />
          <div className="text-center text-sm text-white/75">
            {runtime.encouragement ?? runtime.guidance}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-white/60">
            Focus posture
          </p>
          <h2 className="mt-2 text-2xl font-bold">
            Score {Math.round(poseData?.posture.overallScore ?? 0)}
          </h2>
          <p className="mt-2 text-sm text-white/80">{runtime.guidance}</p>
          <div className="mt-4 overflow-hidden rounded-xl border border-white/20 bg-black/20">
            <video ref={videoRef} className="hidden" playsInline muted />
            <canvas ref={canvasRef} className="aspect-video w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}

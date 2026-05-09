"use client";

export function AnalysisProgressWidget({
  streakDays,
  totalSessions,
  completionRate,
  totalMinutes,
}: {
  streakDays: number;
  totalSessions: number;
  completionRate: number;
  totalMinutes: number;
}) {
  return (
    <section className="rounded-2xl border border-white/25 bg-white/20 p-5 text-white backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.22em] text-white/60">
        Progress
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Metric label="Streak" value={`${streakDays}d`} />
        <Metric label="Sessions" value={`${totalSessions}`} />
        <Metric label="Completion" value={`${completionRate}%`} />
        <Metric label="Minutes" value={`${totalMinutes}`} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/15 p-4">
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.16em] text-white/55">
        {label}
      </div>
    </div>
  );
}

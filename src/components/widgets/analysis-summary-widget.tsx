"use client";

import type { WellnessActivityType } from "@/types";
import { FiCheckCircle } from "react-icons/fi";

export function AnalysisSummaryWidget({
  activityType,
  completionQuality,
  mood,
  insights,
  suggestions = [],
}: {
  activityType: WellnessActivityType;
  completionQuality: string;
  mood: string;
  insights: string[];
  suggestions?: string[];
}) {
  return (
    <section className="rounded-2xl border border-white/25 bg-white/20 p-5 text-white backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-3">
        <FiCheckCircle className="text-2xl text-emerald-200" />
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-white/60">
            Session analysis
          </p>
          <h3 className="text-xl font-bold capitalize">{activityType}</h3>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Pill label="Quality" value={completionQuality} />
        <Pill label="Mood" value={mood} />
      </div>

      <List title="Insights" items={insights} />
      {suggestions.length > 0 && <List title="Suggestions" items={suggestions} />}
    </section>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/15 p-3">
      <div className="text-xs uppercase tracking-[0.16em] text-white/55">
        {label}
      </div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-5">
      <h4 className="text-sm font-semibold text-white/75">{title}</h4>
      <ul className="mt-2 space-y-2 text-sm leading-6 text-white/85">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

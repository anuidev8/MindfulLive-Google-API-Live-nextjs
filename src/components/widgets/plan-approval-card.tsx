"use client";

import type { PlanProposal } from "@/types";
import { FiCheck, FiEdit3, FiX } from "react-icons/fi";

type PlanApprovalCardProps = {
  proposal: PlanProposal;
  onApprove: () => void;
  onReject: () => void;
  onRevise: () => void;
};

export function PlanApprovalCard({
  proposal,
  onApprove,
  onReject,
  onRevise,
}: PlanApprovalCardProps) {
  return (
    <section className="w-full rounded-2xl border border-white/30 bg-white/25 p-6 text-white shadow-2xl backdrop-blur-xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
            Proposed session
          </p>
          <h2 className="mt-2 text-3xl font-bold capitalize">
            {proposal.activityType}
          </h2>
        </div>
        <div className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold capitalize">
          {proposal.intensity}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Metric label="Duration" value={`${Math.round(proposal.durationSeconds / 60)} min`} />
        <Metric label="Focus" value={proposal.focusAreas.join(", ")} />
      </div>

      <p className="mt-5 text-sm leading-6 text-white/85">{proposal.reasoning}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onApprove}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-3 text-sm font-bold text-emerald-950 shadow-lg transition hover:bg-emerald-300"
        >
          <FiCheck aria-hidden />
          Accept
        </button>
        <button
          type="button"
          onClick={onRevise}
          className="inline-flex items-center gap-2 rounded-full bg-white/20 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/30"
        >
          <FiEdit3 aria-hidden />
          Revise
        </button>
        <button
          type="button"
          onClick={onReject}
          className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20"
        >
          <FiX aria-hidden />
          Decline
        </button>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/15 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-white/60">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

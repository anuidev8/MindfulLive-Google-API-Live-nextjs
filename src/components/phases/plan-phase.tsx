"use client";

import { PlanApprovalCard } from "@/components/widgets/plan-approval-card";
import type { PlanProposal } from "@/types";

export function PlanPhase({
  proposal,
  onApprove,
  onReject,
  onRevise,
}: {
  proposal: PlanProposal | null;
  onApprove: () => void;
  onReject: () => void;
  onRevise: () => void;
}) {
  if (!proposal) {
    return (
      <section className="rounded-2xl border border-white/25 bg-white/20 p-6 text-white backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.22em] text-white/60">
          Plan
        </p>
        <h2 className="mt-2 text-2xl font-bold">Ask for a session</h2>
        <p className="mt-2 text-sm leading-6 text-white/75">
          Connect the voice stream and ask for meditation, breathing, or focus.
        </p>
      </section>
    );
  }

  return (
    <PlanApprovalCard
      proposal={proposal}
      onApprove={onApprove}
      onReject={onReject}
      onRevise={onRevise}
    />
  );
}

"use client";

import { AnalysisProgressWidget } from "@/components/widgets/analysis-progress-widget";
import { AnalysisRecommendationWidget } from "@/components/widgets/analysis-recommendation-widget";
import { AnalysisSummaryWidget } from "@/components/widgets/analysis-summary-widget";
import type { AnalysisWidget } from "@/types";

export function AnalysisPhase({
  widgets,
}: {
  widgets: Record<string, AnalysisWidget>;
}) {
  const orderedWidgets = [
    widgets["wellness-analysis-summary"],
    widgets["wellness-analysis-progress"],
    widgets["wellness-analysis-recommendation"],
  ].filter(Boolean);

  if (orderedWidgets.length === 0) {
    return (
      <section className="rounded-2xl border border-white/25 bg-white/20 p-6 text-white backdrop-blur-xl">
        <p className="text-sm text-white/75">Analysis will appear here.</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {orderedWidgets.map((widget) => {
        if (widget.surfaceId === "wellness-analysis-summary") {
          return <AnalysisSummaryWidget key={widget.surfaceId} {...widget.data} />;
        }

        if (widget.surfaceId === "wellness-analysis-progress") {
          return <AnalysisProgressWidget key={widget.surfaceId} {...widget.data} />;
        }

        return (
          <AnalysisRecommendationWidget
            key={widget.surfaceId}
            {...widget.data}
          />
        );
      })}
    </div>
  );
}

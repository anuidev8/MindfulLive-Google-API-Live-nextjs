import type { GoogleGenAIOptions } from "@google/genai";

export type LiveClientOptions = GoogleGenAIOptions;

export type StreamingLog = {
  date: Date;
  type: string;
  message: string | object;
  count?: number;
};

export type WellnessActivityType = "meditation" | "breathing" | "focus";

export type WellnessPhase = "idle" | "planning" | "executing" | "analyzing";

export type PlanProposal = {
  id: string;
  activityType: WellnessActivityType;
  durationSeconds: number;
  intensity: "low" | "medium" | "high";
  focusAreas: string[];
  reasoning: string;
  createdAt: number;
};

export type ApprovedPlan = PlanProposal & {
  approvedAt: number;
};

export type ActivityRuntime = {
  timerSeconds: number;
  totalSeconds: number;
  phase: string;
  guidance: string;
  encouragement?: string;
  startedAt: number;
  paused: boolean;
};

export type AnalysisWidget =
  | {
      surfaceId: "wellness-analysis-summary";
      data: {
        activityType: WellnessActivityType;
        completionQuality: string;
        mood: string;
        insights: string[];
        suggestions?: string[];
      };
    }
  | {
      surfaceId: "wellness-analysis-progress";
      data: {
        streakDays: number;
        totalSessions: number;
        completionRate: number;
        totalMinutes: number;
      };
    }
  | {
      surfaceId: "wellness-analysis-recommendation";
      data: {
        recommendedActivity: WellnessActivityType;
        reasoning: string;
        estimatedMinutes: number;
      };
    };

export type SessionRecord = {
  id: string;
  activityType: WellnessActivityType;
  durationSeconds: number;
  completedAt: number;
  completionQuality: string;
  notes?: string;
  mood?: string;
};

export type WellnessState = {
  phase: WellnessPhase;
  activeActivity: WellnessActivityType | null;
  pendingProposal: PlanProposal | null;
  pendingConfirmId: string | null;
  approvedPlan: ApprovedPlan | null;
  activityRuntime: ActivityRuntime | null;
  analysisWidgets: Record<string, AnalysisWidget>;
  sessionHistory: SessionRecord[];
  currentSession: SessionRecord | null;
  lastError: { code: string; message: string; at: number } | null;
  activityLog: { type: string; payload: unknown; at: number }[];
};

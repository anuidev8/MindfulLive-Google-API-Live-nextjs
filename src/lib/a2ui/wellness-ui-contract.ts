export const WELLNESS_UI_CONTRACT = {
  "wellness-plan": {
    requiredDataKeys: [
      "activityType",
      "durationSeconds",
      "intensity",
      "focusAreas",
      "reasoning",
    ],
    allowedActions: ["approve_plan", "reject_plan", "revise_plan"],
  },
  "wellness-activity-breathing": {
    requiredDataKeys: ["currentPhase", "timerSeconds", "guidance", "pattern"],
    allowedActions: ["pause_activity", "request_help"],
  },
  "wellness-activity-focus": {
    requiredDataKeys: ["timerSeconds", "currentTask", "encouragement"],
    allowedActions: ["pause_activity", "extend_session"],
  },
  "wellness-activity-meditation": {
    requiredDataKeys: ["timerSeconds", "phase", "guidance"],
    allowedActions: ["pause_activity"],
  },
  "wellness-analysis-summary": {
    requiredDataKeys: ["activityType", "completionQuality", "mood", "insights"],
    allowedActions: ["save_to_journal", "share_session"],
  },
  "wellness-analysis-progress": {
    requiredDataKeys: [
      "streakDays",
      "totalSessions",
      "completionRate",
      "totalMinutes",
    ],
    allowedActions: ["set_goal"],
  },
  "wellness-analysis-recommendation": {
    requiredDataKeys: [
      "recommendedActivity",
      "reasoning",
      "estimatedMinutes",
    ],
    allowedActions: ["accept_recommendation", "request_alternative"],
  },
} as const;

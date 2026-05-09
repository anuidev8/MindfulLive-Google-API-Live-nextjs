import { type FunctionDeclaration, Type } from "@google/genai";

export const analysisToolDeclarations: FunctionDeclaration[] = [
  {
    name: "emit_analysis_summary",
    description:
      "Render the session analysis summary after the activity completes.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        activityType: {
          type: Type.STRING,
          enum: ["meditation", "breathing", "focus"],
        },
        completionQuality: { type: Type.STRING },
        mood: { type: Type.STRING },
        insights: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        suggestions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: ["activityType", "completionQuality", "mood", "insights"],
    },
  },
  {
    name: "emit_streak_update",
    description:
      "Render progress stats. Use the numbers provided by the app when available.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        streakDays: { type: Type.NUMBER },
        totalSessions: { type: Type.NUMBER },
        completionRate: { type: Type.NUMBER },
        totalMinutes: { type: Type.NUMBER },
      },
      required: ["streakDays", "totalSessions", "completionRate"],
    },
  },
  {
    name: "emit_next_recommendation",
    description: "Render a recommendation for the user's next session.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        recommendedActivity: {
          type: Type.STRING,
          enum: ["meditation", "breathing", "focus"],
        },
        reasoning: { type: Type.STRING },
        estimatedMinutes: { type: Type.NUMBER },
      },
      required: ["recommendedActivity", "reasoning", "estimatedMinutes"],
    },
  },
];

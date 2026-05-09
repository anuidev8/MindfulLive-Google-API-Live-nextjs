import { type FunctionDeclaration, Type } from "@google/genai";

export const executeToolDeclarations: FunctionDeclaration[] = [
  {
    name: "start_wellness_activity",
    description:
      "Start the approved wellness activity after the user has approved the plan.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        activityType: {
          type: Type.STRING,
          enum: ["meditation", "breathing", "focus"],
        },
        durationSeconds: { type: Type.NUMBER },
      },
      required: ["activityType", "durationSeconds"],
    },
  },
  {
    name: "update_activity_widget",
    description:
      "Update qualitative guidance in the active activity widget. Do not call every second.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        currentPhase: { type: Type.STRING },
        timerSeconds: { type: Type.NUMBER },
        guidance: { type: Type.STRING },
        encouragement: { type: Type.STRING },
      },
      required: ["currentPhase"],
    },
  },
  {
    name: "complete_wellness_activity",
    description: "Mark the active activity complete and move to analysis.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        completionQuality: { type: Type.STRING },
        notes: { type: Type.STRING },
      },
      required: ["completionQuality"],
    },
  },
  {
    name: "cancel_wellness_activity",
    description: "Stop the active activity immediately when the user asks to stop.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        reason: { type: Type.STRING },
      },
      required: ["reason"],
    },
  },
];

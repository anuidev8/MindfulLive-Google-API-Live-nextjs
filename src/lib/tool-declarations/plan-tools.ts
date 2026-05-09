import { type FunctionDeclaration, Type } from "@google/genai";

export const planToolDeclarations: FunctionDeclaration[] = [
  {
    name: "propose_wellness_plan",
    description:
      "Propose a wellness session plan and wait for user approval before starting.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        activityType: {
          type: Type.STRING,
          enum: ["meditation", "breathing", "focus"],
          description: "The wellness activity to run.",
        },
        durationSeconds: {
          type: Type.NUMBER,
          description: "Recommended session duration in seconds.",
        },
        intensity: {
          type: Type.STRING,
          enum: ["low", "medium", "high"],
          description: "Suggested effort level.",
        },
        focusAreas: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Specific needs this plan addresses.",
        },
        reasoning: {
          type: Type.STRING,
          description: "Brief user-facing reason for this plan.",
        },
      },
      required: [
        "activityType",
        "durationSeconds",
        "intensity",
        "focusAreas",
        "reasoning",
      ],
    },
  },
  {
    name: "revise_wellness_plan",
    description: "Revise the pending plan after the user asks for a change.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        proposalId: { type: Type.STRING },
        activityType: { type: Type.STRING, enum: ["meditation", "breathing", "focus"] },
        durationSeconds: { type: Type.NUMBER },
        intensity: { type: Type.STRING, enum: ["low", "medium", "high"] },
        reasoning: { type: Type.STRING },
      },
      required: ["proposalId"],
    },
  },
  {
    name: "cancel_plan_proposal",
    description: "Cancel the current plan proposal.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        proposalId: { type: Type.STRING },
      },
      required: ["proposalId"],
    },
  },
  {
    name: "confirm_wellness_plan",
    description: "Confirm whether the user approved the pending plan.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        proposalId: { type: Type.STRING },
        approved: { type: Type.BOOLEAN },
      },
      required: ["proposalId", "approved"],
    },
  },
];

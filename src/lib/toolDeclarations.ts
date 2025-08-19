import { FunctionDeclaration, Type } from "@google/genai";

export const toolDeclarations: FunctionDeclaration[] = [
    {
      name: "recommend_duration",
      description: "Recommend a meditation duration in seconds based on user state.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          recommended_seconds: { 
            type: Type.NUMBER, 
            description: "Recommended duration in seconds" 
          },
          reason: { 
            type: Type.STRING, 
            description: "Brief reason for this recommendation" 
          },
        },
        required: ["recommended_seconds", "reason"],
      },
    },
    {
      name: "set_meditation_duration",
      description: "User sets the final meditation duration after hearing recommendation.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          duration_seconds: { 
            type: Type.NUMBER, 
            description: "Final meditation duration in seconds chosen by user" 
          },
        },
        required: ["duration_seconds"],
      },
    },
    {
      name: "begin_meditation_timer",
      description: "Start the meditation timer - call this when you're ready to begin the silent meditation period.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          duration_seconds: { 
            type: Type.NUMBER, 
            description: "Duration in seconds" 
          },
          timer_started: { 
            type: Type.BOOLEAN, 
            description: "Confirmation that timer should start" 
          },
        },
        required: ["duration_seconds", "timer_started"],
      },
    },
    {
      name: "end_meditation_feedback",
      description: "Provide final session feedback when meditation timer completes.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          feedback_message: { 
            type: Type.STRING, 
            description: "Supportive feedback message for the completed session" 
          },
          next_suggestion: { 
            type: Type.STRING, 
            description: "Suggestion for next session" 
          },
        },
        required: ["feedback_message", "next_suggestion"],
      },
    },
  ];
  

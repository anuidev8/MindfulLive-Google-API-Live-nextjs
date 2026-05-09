import type { GoogleGenAIOptions } from "@google/genai";

export type LiveClientOptions = GoogleGenAIOptions;

export type StreamingLog = {
  date: Date;
  type: string;
  message: string | object;
  count?: number;
};

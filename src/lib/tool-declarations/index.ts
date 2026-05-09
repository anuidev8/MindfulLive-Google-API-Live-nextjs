import type { FunctionDeclaration } from "@google/genai";
import { analysisToolDeclarations } from "./analysis-tools";
import { executeToolDeclarations } from "./execute-tools";
import { planToolDeclarations } from "./plan-tools";

export const wellnessToolDeclarations: FunctionDeclaration[] = [
  ...planToolDeclarations,
  ...executeToolDeclarations,
  ...analysisToolDeclarations,
];

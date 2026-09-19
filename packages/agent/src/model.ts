import { OpenAIClient } from "@anvia/openai";

const apiKey = process.env.OPENAI_API_KEY ?? "";

export const openaiClient = new OpenAIClient({
  baseUrl: process.env.OPENAI_BASE_URL,
  apiKey,
});

export const WEEKSMITH_MODEL_ID = "z-ai/glm-5.3-flash";
export const WEEKSMITH_EFFORTS = ["low", "high", "max"] as const;
export type WeeksmithEffort = (typeof WEEKSMITH_EFFORTS)[number];

export const WEEKSMITH_CONTROLS = {
  reasoningEffort: {
    type: "select",
    label: "Reasoning effort",
    options: WEEKSMITH_EFFORTS,
    defaultValue: "max",
  },
} as const;

export function getModel(modelId: string = process.env.WEEKSMITH_MODEL ?? WEEKSMITH_MODEL_ID) {
  return openaiClient.completionModel({
    modelId,
    api: "chat",
    controls: WEEKSMITH_CONTROLS,
  });
}

export const defaultModel = getModel();

export function defaultEffort(): WeeksmithEffort {
  return WEEKSMITH_EFFORTS.find((e) => e === process.env.WEEKSMITH_EFFORT) ?? "max";
}

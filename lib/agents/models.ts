/**
 * CaseSnipe.ai — Model factory (server-side only)
 * NOTE: Do NOT import this file in client components — use modelList.ts instead.
 */

import { ChatOpenAI } from "@langchain/openai";

export { NEBIUS_MODELS, DEFAULT_PROSECUTION_MODEL, DEFAULT_DEFENSE_MODEL, DEFAULT_JUDGE_MODEL } from "./modelList";

export function createModel(
  modelId: string,
  options: { temperature?: number; streaming?: boolean } = {}
): ChatOpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set. Add it to .env.local.");
  }

  return new ChatOpenAI({
    model: modelId,
    apiKey,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://casesnipe.ai",
        "X-Title": "CaseSnipe.ai",
      },
    },
    temperature: options.temperature ?? 0.7,
    streaming: options.streaming ?? false,
  });
}

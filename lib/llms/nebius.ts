/**
 * CaseSnipe.ai - Nebius LLM for Case Agent
 * Uses Nebius Token Factory (OpenAI-compatible API)
 * Model: Meta-Llama-3.1-70B-Instruct
 */

import { ChatOpenAI } from "@langchain/openai";
import { getConfig } from "@/lib/config";

const NEBIUS_BASE_URL = "https://api.tokenfactory.nebius.com/v1";
const DEFAULT_MODEL = "meta-llama/Meta-Llama-3.1-8B-Instruct";

export function createCaseAgentLLM() {
  const { nebiusApiKey } = getConfig();
  return new ChatOpenAI({
    modelName: DEFAULT_MODEL,
    configuration: {
      baseURL: NEBIUS_BASE_URL,
      apiKey: nebiusApiKey,
    },
    temperature: 0.3,
  });
}

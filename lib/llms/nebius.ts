/**
 * CaseSnipe.ai - LLM for Case, Prosecutor, and Defendant agents
 * Supports Nebius Token Factory or OpenRouter (fallback when Nebius returns 400)
 */

import { ChatOpenAI } from "@langchain/openai";
import { getConfig } from "@/lib/config";

const NEBIUS_BASE_URL = "https://api.tokenfactory.nebius.com/v1/";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const NEBIUS_MODEL = "meta-llama/Meta-Llama-3.1-8B-Instruct-fast";
const OPENROUTER_MODEL = "meta-llama/llama-3.1-8b-instruct";

function useOpenRouter(): boolean {
  return process.env.LLM_PROVIDER === "openrouter";
}

export function createCaseAgentLLM() {
  const { nebiusApiKey, openRouterApiKey } = getConfig();

  if (useOpenRouter()) {
    return new ChatOpenAI({
      model: OPENROUTER_MODEL,
      configuration: {
        baseURL: OPENROUTER_BASE_URL,
        apiKey: openRouterApiKey,
      },
      temperature: 0.3,
    });
  }

  return new ChatOpenAI({
    model: NEBIUS_MODEL,
    configuration: {
      baseURL: NEBIUS_BASE_URL,
      apiKey: nebiusApiKey,
    },
    temperature: 0.3,
  });
}

export const createNebiusLLM = createCaseAgentLLM;

/** Judge-specific LLM; uses JUDGE_MODEL env var if set, else same as case agent */
export function createJudgeLLM() {
  const { nebiusApiKey, openRouterApiKey } = getConfig();
  const model =
    process.env.JUDGE_MODEL ||
    (useOpenRouter() ? OPENROUTER_MODEL : NEBIUS_MODEL);

  if (useOpenRouter()) {
    return new ChatOpenAI({
      model,
      configuration: {
        baseURL: OPENROUTER_BASE_URL,
        apiKey: openRouterApiKey,
      },
      temperature: 0.3,
    });
  }

  return new ChatOpenAI({
    model,
    configuration: {
      baseURL: NEBIUS_BASE_URL,
      apiKey: nebiusApiKey,
    },
    temperature: 0.3,
  });
}

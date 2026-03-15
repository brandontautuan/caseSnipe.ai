/**
 * CaseSnipe.ai - LLM for Case, Prosecutor, and Defendant agents
 * Supports Nebius Token Factory or OpenRouter (fallback when Nebius returns 400)
 */

import { ChatOpenAI } from "@langchain/openai";
import { getConfig } from "@/lib/config";

// Nebius: no trailing slash — some clients concatenate paths; trailing slash can cause 400
const DEFAULT_NEBIUS_BASE_URL = "https://api.tokenfactory.nebius.com/v1";
const DEFAULT_NEBIUS_MODEL = "meta-llama/Meta-Llama-3.1-8B-Instruct-fast";
const OPENROUTER_MODEL = "meta-llama/llama-3.1-8b-instruct";

function useOpenRouter(): boolean {
  return process.env.LLM_PROVIDER === "openrouter";
}

function getNebiusBaseUrl(): string {
  const url = process.env.NEBIUS_BASE_URL?.trim();
  return url || DEFAULT_NEBIUS_BASE_URL;
}

function getNebiusModel(): string {
  const model = process.env.NEBIUS_MODEL?.trim();
  return model || DEFAULT_NEBIUS_MODEL;
}

export function createCaseAgentLLM() {
  const { nebiusApiKey, openRouterApiKey } = getConfig();

  if (useOpenRouter()) {
    return new ChatOpenAI({
      model: OPENROUTER_MODEL,
      openAIApiKey: openRouterApiKey,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": "https://casesnipe.ai",
          "X-Title": "CaseSnipe.ai",
        },
      },
      temperature: 0.3,
    });
  }

  return new ChatOpenAI({
    model: getNebiusModel(),
    openAIApiKey: nebiusApiKey,
    configuration: {
      baseURL: getNebiusBaseUrl(),
    },
    temperature: 0.3,
  });
}

export const createNebiusLLM = createCaseAgentLLM;

/** Judge-specific LLM; uses JUDGE_MODEL env var if set, else same as case agent */
export function createJudgeLLM() {
  const { nebiusApiKey, openRouterApiKey } = getConfig();
  const model =
    process.env.JUDGE_MODEL?.trim() ||
    (useOpenRouter() ? OPENROUTER_MODEL : getNebiusModel());

  if (useOpenRouter()) {
    return new ChatOpenAI({
      model,
      openAIApiKey: openRouterApiKey,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": "https://casesnipe.ai",
          "X-Title": "CaseSnipe.ai",
        },
      },
      temperature: 0.3,
    });
  }

  return new ChatOpenAI({
    model: process.env.JUDGE_MODEL?.trim() || getNebiusModel(),
    openAIApiKey: nebiusApiKey,
    configuration: {
      baseURL: getNebiusBaseUrl(),
    },
    temperature: 0.3,
  });
}

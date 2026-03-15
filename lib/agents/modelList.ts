/**
 * Model definitions — safe to import in client components (no LangChain imports).
 * Benchmark stats sourced from Artificial Analysis / OpenRouter model cards.
 */

export interface ModelBenchmark {
  quality: number;       // 0–100 reasoning quality index
  speed: number;         // tokens/sec (output)
  contextK: number;      // context window in K tokens
  costPer1M: number;     // USD per 1M output tokens
}

export interface ModelConfig {
  modelId: string;
  label: string;
  provider: string;
  bench: ModelBenchmark;
}

export const NEBIUS_MODELS: ModelConfig[] = [
  {
    modelId: "meta-llama/llama-3.1-70b-instruct",
    label: "Llama 3.1 70B",
    provider: "Meta",
    bench: { quality: 73, speed: 98,  contextK: 128, costPer1M: 0.35 },
  },
  {
    modelId: "meta-llama/llama-3.1-8b-instruct",
    label: "Llama 3.1 8B",
    provider: "Meta",
    bench: { quality: 52, speed: 210, contextK: 128, costPer1M: 0.06 },
  },
  {
    modelId: "mistralai/mistral-large",
    label: "Mistral Large",
    provider: "Mistral",
    bench: { quality: 78, speed: 62,  contextK: 128, costPer1M: 2.00 },
  },
  {
    modelId: "mistralai/mixtral-8x7b-instruct",
    label: "Mixtral 8x7B",
    provider: "Mistral",
    bench: { quality: 65, speed: 105, contextK: 32,  costPer1M: 0.24 },
  },
  {
    modelId: "Qwen/Qwen2.5-72B-Instruct",
    label: "Qwen 2.5 72B",
    provider: "Alibaba",
    bench: { quality: 79, speed: 75,  contextK: 128, costPer1M: 0.40 },
  },
  {
    modelId: "deepseek-ai/DeepSeek-V3",
    label: "DeepSeek V3",
    provider: "DeepSeek",
    bench: { quality: 85, speed: 55,  contextK: 64,  costPer1M: 0.90 },
  },
];

export const MODEL_MAP = Object.fromEntries(NEBIUS_MODELS.map((m) => [m.modelId, m]));

export const DEFAULT_PROSECUTION_MODEL = NEBIUS_MODELS[0].modelId;
export const DEFAULT_DEFENSE_MODEL     = NEBIUS_MODELS[0].modelId;
export const DEFAULT_JUDGE_MODEL       = NEBIUS_MODELS[2].modelId;

/**
 * Runtime fallback: when Nebius returns 400/5xx, retry with OpenRouter.
 * Preserves OpenRouter as working alternative per guardrails.
 */

function isUpstreamApiError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("400") ||
    msg.includes("401") ||
    msg.includes("429") ||
    msg.includes("500") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("status code")
  );
}

/**
 * Run an LLM-dependent operation. If it fails with an upstream API error
 * and we're using Nebius (not OpenRouter), retry with OpenRouter.
 */
export async function withNebiusFallback<T>(
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const useOpenRouter = process.env.LLM_PROVIDER === "openrouter";
    if (useOpenRouter || !isUpstreamApiError(err)) throw err;

    const prev = process.env.LLM_PROVIDER;
    process.env.LLM_PROVIDER = "openrouter";
    try {
      return await fn();
    } finally {
      process.env.LLM_PROVIDER = prev;
    }
  }
}

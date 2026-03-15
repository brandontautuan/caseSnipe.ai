/**
 * CaseSnipe.ai - Environment configuration
 * All agents run via OpenRouter → Nebius. Only two keys needed.
 */

const requiredKeys = ["OPENROUTER_API_KEY", "TAVILY_API_KEY", "NEBIUS_API_KEY"] as const;

function getEnv(key: string): string | undefined {
  return process.env[key];
}

function validateConfig(): void {
  const missing = requiredKeys.filter((key) => !getEnv(key)?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        "Copy .env.example to .env.local and add your API keys."
    );
  }
}

export interface AppConfig {
  openRouterApiKey: string;
  tavilyApiKey: string;
  nebiusApiKey: string;
}

export function getConfig(): AppConfig {
  validateConfig();
  return {
    openRouterApiKey: getEnv("OPENROUTER_API_KEY")!.trim(),
    tavilyApiKey: getEnv("TAVILY_API_KEY")!.trim(),
    nebiusApiKey: getEnv("NEBIUS_API_KEY")!.trim(),
  };
}

export function isConfigValid(): boolean {
  return requiredKeys.every((key) => getEnv(key)?.trim());
}

/**
 * SymptomSnipe.ai - Environment configuration
 * Validates required API keys at runtime. Do not commit .env.local.
 */

const requiredKeys = ["OPENROUTER_API_KEY", "TAVILY_API_KEY", "MINIMAX_API_KEY"] as const;

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
  minimaxApiKey: string;
}

/**
 * Get validated app config. Throws if any required key is missing.
 */
export function getConfig(): AppConfig {
  validateConfig();
  return {
    openRouterApiKey: getEnv("OPENROUTER_API_KEY")!,
    tavilyApiKey: getEnv("TAVILY_API_KEY")!,
    minimaxApiKey: getEnv("MINIMAX_API_KEY")!,
  };
}

/**
 * Check if config is valid without throwing.
 */
export function isConfigValid(): boolean {
  return requiredKeys.every((key) => getEnv(key)?.trim());
}

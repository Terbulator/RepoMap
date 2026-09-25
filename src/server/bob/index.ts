import { env } from "@/lib/env";
import { createHttpBobProvider } from "./http-provider";
import { BobProviderError, type BobProvider } from "./provider";

/**
 * Resolves the provider for repository analysis. Until Bob 2.0 credentials are
 * present there is deliberately no fallback provider: an invented analysis would
 * be indistinguishable from a real one in the UI, which PRD §7 forbids.
 */
export function isBobConfigured(): boolean {
  return Boolean(env.BOB_API_BASE_URL);
}

export function getBobProvider(): BobProvider {
  if (!env.BOB_API_BASE_URL) {
    throw new BobProviderError(
      "IBM Bob 2.0 is not configured. Set BOB_API_BASE_URL (and BOB_API_KEY) in .env.local — see .env.example.",
    );
  }

  return createHttpBobProvider({
    baseUrl: env.BOB_API_BASE_URL,
    apiKey: env.BOB_API_KEY,
    projectId: env.BOB_PROJECT_ID,
  });
}

export { BobProviderError };
export type { BobProvider, RepositoryAnalysis, BobTaskTrace } from "./provider";

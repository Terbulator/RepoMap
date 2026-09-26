import { env } from "@/lib/env";
import type { RepositoryRef } from "@/features/repomap/schema.ts";
import { createCliBobProvider } from "./cli-provider.ts";
import { createMockBobProvider } from "./mock-provider.ts";
import type { BobProvider } from "./provider.ts";
import { BobProviderError } from "./provider.ts";
import { resolveWorkspace } from "./workspace.ts";

export { BobProviderError } from "./provider.ts";
export { MOCK_NOTICE } from "./mock-provider.ts";
export type { BobProvider, RepositoryAnalysis, BobTaskTrace } from "./provider.ts";

/**
 * Provider selection for repository analysis.
 *
 * `REPOMAP_PROVIDER=mock` (default) returns the checked-in fixture so the
 * frontend can be built without Bob credentials. `REPOMAP_PROVIDER=bob-2.0`
 * shells out to the installed IBM Bob 2.0 CLI. There is no silent fallback: a
 * Bob failure is reported as a failure, never swapped for mock data.
 */
export type ProviderReadiness = {
  provider: "bob-2.0" | "mock";
  ready: boolean;
  reason: string | null;
  binary: string;
  apiKeyPresent: boolean;
};

export function describeProviderReadiness(): ProviderReadiness {
  const binary = env.BOB_CLI_PATH;
  const apiKeyPresent = Boolean(process.env.BOB_API_KEY);

  if (env.REPOMAP_PROVIDER !== "bob-2.0") {
    return {
      provider: "mock",
      ready: true,
      reason: null,
      binary,
      apiKeyPresent,
    };
  }

  const reason = !apiKeyPresent
    ? "BOB_API_KEY is not set, so headless IBM Bob 2.0 runs will fail."
    : null;

  return { provider: "bob-2.0", ready: reason === null, reason, binary, apiKeyPresent };
}

/**
 * Resolves the workspace Bob will read, then returns a ready-to-use provider.
 * Readiness is checked before any clone happens, so a missing key fails fast
 * instead of after a pointless download.
 */
export async function getBobProviderFor(
  repository: RepositoryRef,
): Promise<BobProvider> {
  if (env.REPOMAP_PROVIDER !== "bob-2.0") {
    return createMockBobProvider();
  }

  const readiness = describeProviderReadiness();
  if (!readiness.ready) {
    throw new BobProviderError(
      readiness.reason ?? "IBM Bob 2.0 is not ready. Check BOB_API_KEY and BOB_CLI_PATH.",
    );
  }

  const workspace = await resolveWorkspace(repository);
  return createCliBobProvider({ workspace });
}

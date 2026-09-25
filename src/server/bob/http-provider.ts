import { env } from "@/lib/env";
import { extractJsonPayload, readString } from "./json";
import { buildRepoMapPrompt } from "./prompts";
import {
  BobProviderError,
  type BobProvider,
  type BobTaskTrace,
  type RepositoryAnalysis,
} from "./provider";
import { bobAnalysisSchema } from "@/features/repomap/schema";

export type HttpBobProviderOptions = {
  baseUrl: string;
  apiKey?: string;
  projectId?: string;
  analysisPath?: string;
  model?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

/**
 * Calls IBM Bob 2.0 over HTTP. The endpoint path, project and model are all
 * environment-configurable because Bob 2.0 deployments expose them
 * differently; only the request/response contract is fixed here.
 */
export function createHttpBobProvider(options: HttpBobProviderOptions): BobProvider {
  const {
    baseUrl,
    apiKey,
    projectId,
    analysisPath = env.BOB_ANALYSIS_PATH,
    model = env.BOB_MODEL,
    timeoutMs = env.BOB_TIMEOUT_MS,
    fetchImpl = fetch,
  } = options;

  const url = `${baseUrl.replace(/\/$/, "")}/${analysisPath.replace(/^\//, "")}`;

  return {
    name: "bob-2.0",

    async analyzeRepository(repositoryUrl: string): Promise<RepositoryAnalysis> {
      let response: Response;

      try {
        response = await fetchImpl(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
            ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({
            repositoryUrl,
            prompt: buildRepoMapPrompt(repositoryUrl),
            ...(projectId ? { projectId } : {}),
            ...(model ? { model } : {}),
            responseFormat: "json",
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        throw new BobProviderError(
          `Could not reach IBM Bob 2.0 at ${url}: ${
            error instanceof Error ? error.message : "unknown error"
          }`,
          error,
        );
      }

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new BobProviderError(
          `IBM Bob 2.0 returned ${response.status} ${response.statusText}${
            body ? `: ${body.slice(0, 500)}` : ""
          }`,
        );
      }

      const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      const payload = extractJsonPayload(body);
      if (payload == null) {
        throw new BobProviderError("IBM Bob 2.0 returned no parsable analysis payload.");
      }

      const nested = (body?.data ?? body?.result ?? body?.output) as
        | Record<string, unknown>
        | undefined;

      const trace: BobTaskTrace = {
        taskId:
          readString(response.headers.get("x-bob-task-id")) ??
          readString(body?.taskId) ??
          readString(body?.sessionId) ??
          readString(nested?.taskId) ??
          readString(nested?.sessionId) ??
          null,
        model: model ?? readString(body?.model) ?? readString(nested?.model) ?? null,
      };

      return {
        ...bobAnalysisSchema.parse(payload),
        trace,
      };
    },
  };
}

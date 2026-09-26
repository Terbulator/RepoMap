import { providerAnalysisSchema } from "../../features/repomap/schema.ts";
import { extractJsonPayload, readString } from "./json.ts";
import { BobProviderError, type BobTaskTrace, type RepositoryAnalysis } from "./provider.ts";

/**
 * Reads the `--format json` output of `bob run`.
 *
 * The exact payload shape of the installed Bob CLI has not been verified
 * against a live run, so this accepts the documented envelope keys, a stream of
 * JSON documents, or plain text containing a JSON object. Anything unreadable
 * is reported as a provider failure instead of being guessed at.
 */
export function parseBobOutput(stdout: string, binary = "bob"): RepositoryAnalysis {
  const trimmed = stdout.trim();
  if (trimmed === "") {
    throw new BobProviderError(`${binary} returned no output.`);
  }

  const payload = extractJsonPayload(firstJsonObject(trimmed) ?? trimmed);

  if (payload == null || typeof payload !== "object") {
    throw new BobProviderError(
      `${binary} returned no parsable analysis JSON. First 300 characters: ${trimmed.slice(0, 300)}`,
    );
  }

  const record = payload as Record<string, unknown>;
  const trace: BobTaskTrace = {
    taskId: readString(record.taskId) ?? readString(record.id) ?? readString(record.sessionId),
    model: readString(record.model),
  };

  return {
    ...providerAnalysisSchema.parse(payload),
    trace,
  };
}

/** `--format json` is either one JSON document or a stream of them. */
function firstJsonObject(output: string): unknown {
  for (const candidate of [output, ...output.split("\n").reverse()]) {
    const text = candidate.trim();
    if (!text.startsWith("{")) continue;
    try {
      return JSON.parse(text);
    } catch {
      // try the next candidate
    }
  }

  return null;
}

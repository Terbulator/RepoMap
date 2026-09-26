import { providerAnalysisSchema } from "../../features/repomap/schema.ts";
import { extractJsonPayload, readString } from "./json.ts";
import { BobProviderError, type BobTaskTrace, type RepositoryAnalysis } from "./provider.ts";

/**
 * Reads the `--format json` output of `bob run`.
 *
 * A successful run prints one envelope: `{type: "result", timestamp, status,
 * "success", stats, last_message}`, where the analysis JSON is the string in
 * `last_message` and the task id is `stats.task_id`. The other envelope keys and
 * a plain-text fallback are still accepted, but those never come from the real
 * CLI; anything unreadable is a provider failure rather than a guess.
 */
export function parseBobOutput(stdout: string, binary = "bob"): RepositoryAnalysis {
  const trimmed = stdout.trim();
  if (trimmed === "") {
    throw new BobProviderError(`${binary} returned no output.`);
  }

  const envelope = firstJsonObject(trimmed);
  const payload = extractJsonPayload(envelope ?? trimmed);

  if (payload == null || typeof payload !== "object") {
    throw new BobProviderError(
      `${binary} returned no parsable analysis JSON. First 300 characters: ${trimmed.slice(0, 300)}`,
    );
  }

  const record = payload as Record<string, unknown>;
  // The task id lives on the envelope, which extractJsonPayload unwraps away.
  const envelopeStats = (envelope as Record<string, unknown> | null)?.stats;
  const stats = (envelopeStats ?? record.stats) as Record<string, unknown> | undefined;
  const trace: BobTaskTrace = {
    taskId:
      readString(record.taskId) ??
      readString(record.id) ??
      readString(record.sessionId) ??
      readString(stats?.task_id),
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

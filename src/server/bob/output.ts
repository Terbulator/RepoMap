import { providerAnalysisSchema } from "../../features/repomap/schema.ts";
import { scopeProviderAnalysisSchema } from "../../features/scope-shield/provider-schema.ts";
import { extractJsonPayload, readString } from "./json.ts";
import { BobProviderError, type BobTaskTrace, type RepositoryAnalysis, type ScopeAnalysis } from "./provider.ts";

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
  const { payload, trace } = readBobEnvelope(stdout, binary);

  return {
    ...providerAnalysisSchema.parse(payload),
    trace,
  };
}

/**
 * ScopeShield's parser (PRD 5.2). Same envelope handling as `parseBobOutput`,
 * but the payload is validated against the strict ScopeShield contract: a
 * partial or invented answer is a provider failure, never a partial result.
 */
export function parseScopeOutput(stdout: string, binary = "bob"): ScopeAnalysis {
  const { payload, trace } = readBobEnvelope(stdout, binary);

  const parsed = scopeProviderAnalysisSchema.safeParse(payload);
  if (!parsed.success) {
    throw new BobProviderError(
      `${binary} returned scope analysis JSON that does not match the ScopeShield contract: ${formatIssues(parsed.error)}`,
    );
  }

  return { scope: parsed.data, trace };
}

/**
 * Unwraps the `--format json` envelope once, for every operation, so the task id
 * is never lost to the unwrapping and the two parsers cannot drift apart.
 */
function readBobEnvelope(stdout: string, binary: string): { payload: unknown; trace: BobTaskTrace } {
  const trimmed = stdout.trim();
  if (trimmed === "") {
    throw new BobProviderError(`${binary} returned no output.`);
  }

  const envelope = firstJsonObject(trimmed);

  // Detect the max-turns scenario: Bob emits a `{"type":"error",...}` line before
  // the result envelope, and the result's `last_message` is then whatever Bob said
  // on its final turn — prose, not the finished JSON. Without this, the failure
  // would surface as a baffling schema mismatch instead of the actual cause.
  if (trimmed.includes("The task reached the maximum of")) {
    const match = trimmed.match(/"The task reached the maximum of[^"]+"/);
    throw new BobProviderError(
      `${binary} did not finish the analysis: ${match ? match[0] : "it ran out of turns"}. ` +
        "Increase BOB_MAX_TURNS or narrow the request.",
    );
  }

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

  return {
    payload,
    trace: {
      taskId:
        readString(record.taskId) ??
        readString(record.id) ??
        readString(record.sessionId) ??
        readString(stats?.task_id),
      model: readString(record.model),
    },
  };
}

/** Zod issues as one short line, so the UI never shows a raw stack trace. */
function formatIssues(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): string {
  return error.issues
    .slice(0, 3)
    .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
    .join("; ");
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

import type { AnalyzeErrorResponse, RepoMap } from "@/features/repomap/schema";

export type AnalyzeResult =
  | { ok: true; analysis: RepoMap }
  | { ok: false; code: AnalyzeErrorResponse["error"]["code"]; message: string };

/**
 * Browser-side wrapper around POST /api/repository/analyze.
 * Returns a tagged-union result so callers never see raw fetch errors.
 */
export async function analyzeRepositoryClient(repository: string): Promise<AnalyzeResult> {
  let response: Response;
  try {
    response = await fetch("/api/repository/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repository }),
    });
  } catch {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Network error — could not reach the analysis API.",
    };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "The API returned a non-JSON response.",
    };
  }

  if (typeof body === "object" && body !== null && "success" in body) {
    const b = body as Record<string, unknown>;
    if (b.success === true && "analysis" in b) {
      return { ok: true, analysis: b.analysis as RepoMap };
    }
    if (b.success === false && typeof b.error === "object" && b.error !== null) {
      const err = b.error as Record<string, unknown>;
      return {
        ok: false,
        code: (err.code ?? "INTERNAL_ERROR") as AnalyzeErrorResponse["error"]["code"],
        message: (err.message ?? "Unknown error.") as string,
      };
    }
  }

  return { ok: false, code: "INTERNAL_ERROR", message: "Unexpected API response shape." };
}

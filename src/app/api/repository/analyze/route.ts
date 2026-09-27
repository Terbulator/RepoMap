import { NextResponse } from "next/server";
import { InvalidAnalysisError } from "@/features/repomap/normalize.ts";
import { repoMapRequestSchema } from "@/features/repomap/request.ts";
import type { AnalyzeErrorResponse } from "@/features/repomap/schema.ts";
import { EnvConfigError } from "@/lib/env";
import { InvalidRepositoryError, parseRepositoryRef } from "@/lib/repository-url.ts";
import { BobProviderError } from "@/server/bob";
import { analyzeRepository } from "@/server/repomap/analyze-repository.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/repository/analyze
 *
 * body:    { "repository": "https://github.com/owner/repo" | "owner/repo" }
 * success: { "success": true, "analysis": RepoMap }
 * failure: { "success": false, "error": { "code", "message" } }
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return failure("INVALID_REQUEST", "Request body must be JSON.");
  }

  const parsed = repoMapRequestSchema.safeParse(body);
  if (!parsed.success) {
    return failure("INVALID_REQUEST", "Provide a repository URL or owner/repo in `repository`.");
  }

  let repository;
  try {
    repository = parseRepositoryRef(parsed.data.repository);
  } catch (error) {
    if (error instanceof InvalidRepositoryError) {
      return failure("INVALID_REPOSITORY", error.message);
    }
    return failure("INTERNAL_ERROR", "Could not read the repository input.");
  }

  try {
    const analysis = await analyzeRepository(repository);
    return NextResponse.json({ success: true as const, analysis });
  } catch (error) {
    if (error instanceof EnvConfigError) {
      return failure("PROVIDER_UNAVAILABLE", error.message);
    }
    if (error instanceof InvalidRepositoryError) {
      return failure("INVALID_REPOSITORY", error.message);
    }
    if (error instanceof InvalidAnalysisError) {
      return failure("INVALID_ANALYSIS", error.message);
    }
    if (error instanceof BobProviderError) {
      const unavailable =
        error.message.includes("BOB_API_KEY") ||
        error.message.includes("not configured") ||
        error.message.includes("Could not clone");
      return failure(
        unavailable ? "PROVIDER_UNAVAILABLE" : "PROVIDER_FAILED",
        error.message,
      );
    }
    return failure("INTERNAL_ERROR", "Repository analysis failed unexpectedly.");
  }
}

function failure(code: AnalyzeErrorResponse["error"]["code"], message: string) {
  return NextResponse.json({ success: false as const, error: { code, message } }, { status: statusFor(code) });
}

function statusFor(code: AnalyzeErrorResponse["error"]["code"]): number {
  switch (code) {
    case "INVALID_REQUEST":
    case "INVALID_REPOSITORY":
      return 400;
    case "INVALID_ANALYSIS":
      return 502;
    case "PROVIDER_UNAVAILABLE":
      return 503;
    case "PROVIDER_FAILED":
      return 502;
    default:
      return 500;
  }
}

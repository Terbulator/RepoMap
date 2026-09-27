import { NextResponse } from "next/server";
import { scopeShieldRequestSchema } from "@/features/scope-shield/provider-schema.ts";
import type { ScopeShieldErrorCode } from "@/features/scope-shield/provider-schema.ts";
import { InvalidRepositoryError, parseRepositoryRef } from "@/lib/repository-url.ts";
import { BobProviderError } from "@/server/bob";
import { analyzeScope } from "@/server/scope-shield/analyze-scope.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/scope-shield
 *
 * body:    { "request": string, "repository": "owner/repo" | url, "repoMap": RepoMap | null }
 * success: { "success": true, "result": ScopeAnalysisResult }
 * failure: { "success": false, "error": { "code", "message" } }
 *
 * This is the only place IBM Bob is called from for ScopeShield, and it runs
 * server-side: the browser posts a request, never a provider call. The real
 * `repoMap` is the Onboarding Map result, passed on as supporting evidence.
 *
 * A Bob failure is reported as a failure. There is deliberately no fallback to
 * mock data — a ScopeShield result that looks real but was invented locally is
 * the one outcome this product must not produce.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return failure("INVALID_REQUEST", "Request body must be JSON.");
  }

  const parsed = scopeShieldRequestSchema.safeParse(body);
  if (!parsed.success) {
    return failure("INVALID_REQUEST", firstIssue(parsed.error));
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
    const result = await analyzeScope(repository, parsed.data.request, parsed.data.repoMap ?? null);
    return NextResponse.json({ success: true as const, result });
  } catch (error) {
    if (error instanceof InvalidRepositoryError) {
      return failure("INVALID_REPOSITORY", error.message);
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
    return failure("INTERNAL_ERROR", "Scope analysis failed unexpectedly.");
  }
}

function firstIssue(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid request.";
  const field = issue.path.join(".");
  return field ? `${field}: ${issue.message}` : issue.message;
}

function failure(code: ScopeShieldErrorCode, message: string) {
  return NextResponse.json({ success: false as const, error: { code, message } }, { status: statusFor(code) });
}

function statusFor(code: ScopeShieldErrorCode): number {
  switch (code) {
    case "INVALID_REQUEST":
    case "INVALID_REPOSITORY":
      return 400;
    case "PROVIDER_UNAVAILABLE":
      return 503;
    case "PROVIDER_FAILED":
      return 502;
    case "INVALID_ANALYSIS":
      return 502;
    default:
      return 500;
  }
}

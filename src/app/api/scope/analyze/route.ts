import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { bobScopeRequestSchema, type AnalyzeScopeErrorResponse } from "@/features/scope-shield/bob-provider";
import { callBobScopeApi, BobScopeProviderError, type ScopeAnalysisRequest } from "@/features/scope-shield/bob-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/scope/analyze
 *
 * body:    { "request": "...", "repositoryContext": {...}, "stackContext": {...} }
 * success: { "success": true, "result": BobScopeResponse }
 * failure: { "success": false, "error": { "code", "message" } }
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return failure("INVALID_REQUEST", "Request body must be JSON.");
  }

  const parsed = bobScopeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return failure("INVALID_REQUEST", "Provide a feature request and repository context.");
  }

  const { request: featureRequest, repositoryContext, stackContext } = parsed.data;
  const payload: ScopeAnalysisRequest = {
    request: featureRequest,
    repositoryContext,
    stackContext,
  };

  if (!env.BOB_ENDPOINT || !env.BOB_API_KEY) {
    return failure(
      "PROVIDER_UNAVAILABLE",
      "IBM Bob 2.0 is not configured. Set BOB_ENDPOINT and BOB_API_KEY to enable live scope analysis.",
    );
  }

  try {
    const result = await callBobScopeApi(payload, {
      endpoint: env.BOB_ENDPOINT,
      apiKey: env.BOB_API_KEY,
      timeoutMs: env.BOB_SCOPE_TIMEOUT_MS,
    });
    return NextResponse.json({ success: true as const, result });
  } catch (error) {
    if (error instanceof BobScopeProviderError) {
      return failure(
        "PROVIDER_FAILED",
        `IBM Bob 2.0 scope analysis failed: ${error.message}`,
      );
    }
    return failure("INTERNAL_ERROR", "Scope analysis failed unexpectedly.");
  }
}

function failure(code: AnalyzeScopeErrorResponse["error"]["code"], message: string) {
  const status = scopeStatusFor(code);
  return NextResponse.json(
    { success: false as const, error: { code, message } },
    { status },
  );
}

function scopeStatusFor(code: AnalyzeScopeErrorResponse["error"]["code"]): number {
  switch (code) {
    case "INVALID_REQUEST":
      return 400;
    case "PROVIDER_UNAVAILABLE":
      return 503;
    case "PROVIDER_FAILED":
      return 502;
    default:
      return 500;
  }
}

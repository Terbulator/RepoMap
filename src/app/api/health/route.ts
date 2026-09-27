import { NextResponse } from "next/server";
import { EnvConfigError } from "@/lib/env";
import { describeProviderReadiness } from "@/server/bob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  let provider;
  try {
    provider = describeProviderReadiness();
  } catch (error) {
    if (error instanceof EnvConfigError) {
      return NextResponse.json(
        { status: "degraded", service: "repomap", provider: { selected: null, ready: false, reason: error.message } },
        { status: 503 },
      );
    }
    throw error;
  }

  return NextResponse.json({
    status: "ok",
    service: "repomap",
    provider: {
      selected: provider.provider,
      ready: provider.ready,
      reason: provider.reason,
      bobBinary: provider.binary,
      bobApiKeyPresent: provider.apiKeyPresent,
    },
  });
}

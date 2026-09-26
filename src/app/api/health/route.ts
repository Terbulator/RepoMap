import { NextResponse } from "next/server";
import { describeProviderReadiness } from "@/server/bob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const provider = describeProviderReadiness();

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

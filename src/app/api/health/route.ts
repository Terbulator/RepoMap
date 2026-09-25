import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { isBobConfigured } from "@/server/bob";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "repomap",
    bob: {
      configured: isBobConfigured(),
      analysisPath: env.BOB_ANALYSIS_PATH,
      model: env.BOB_MODEL ?? null,
    },
  });
}

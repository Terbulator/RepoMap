import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "repomap",
    bob: {
      configured: Boolean(env.BOB_API_BASE_URL && env.BOB_API_KEY),
    },
  });
}

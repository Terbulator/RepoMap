import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "RepoMap analysis endpoint. Use POST to trigger analysis.",
  });
}
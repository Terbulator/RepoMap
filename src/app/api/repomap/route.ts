import { NextResponse } from "next/server";
import { EmptyRepoMapAnalysisError } from "@/features/repomap/normalize";
import { repoMapRequestSchema } from "@/features/repomap/request";
import { InvalidRepositoryError, parseRepositoryRef } from "@/lib/repository-url";
import { BobProviderError } from "@/server/bob";
import { generateRepoMap } from "@/server/repomap/generate";

export const dynamic = "force-dynamic";

/**
 * POST /api/repomap
 * body: { "repository": "https://github.com/owner/repo" | "owner/repo" }
 * returns: the RepoMap contract (PRD 5.1) or a labelled error.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const parsed = repoMapRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  let repository;
  try {
    repository = parseRepositoryRef(parsed.data.repository);
  } catch (error) {
    if (error instanceof InvalidRepositoryError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  try {
    const repoMap = await generateRepoMap(repository);
    return NextResponse.json(repoMap);
  } catch (error) {
    if (error instanceof BobProviderError || error instanceof EmptyRepoMapAnalysisError) {
      const notConfigured = error.message.includes("not configured");
      return NextResponse.json(
        { error: error.message, source: "bob-2.0" },
        { status: notConfigured ? 503 : 502 },
      );
    }

    return NextResponse.json(
      { error: "Repo map generation failed.", detail: String(error) },
      { status: 500 },
    );
  }
}

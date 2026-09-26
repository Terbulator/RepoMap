/**
 * Alias kept for the endpoint name used before M1 settled on
 * /api/repository/analyze. Same handler, same contract — the canonical route is
 * src/app/api/repository/analyze/route.ts.
 */
export { POST } from "@/app/api/repository/analyze/route.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

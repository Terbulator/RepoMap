import { NextResponse } from "next/server";
import { mockOnboardingData } from "@/data/mock-onboarding";

export const dynamic = "force-dynamic";

export async function GET() {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return NextResponse.json(mockOnboardingData);
}
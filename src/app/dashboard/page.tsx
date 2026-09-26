import type { Metadata } from "next";
import { OnboardingMap } from "@/features/onboarding-map/onboarding-map";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Analyze a repository and explore its Onboarding Map.",
};

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <OnboardingMap />
    </div>
  );
}

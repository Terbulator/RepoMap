import type { Metadata } from "next";
import { FeatureRequestForm } from "@/features/scope-shield/feature-request-form";

export const metadata: Metadata = {
  title: "ScopeShield",
  description:
    "Describe a feature request and store it for the scope analysis that follows.",
};

export default function ScopeShieldPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="border-b border-neutral-200 pb-6 dark:border-neutral-800">
        <h1 className="text-2xl font-semibold tracking-tight">ScopeShield</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Stage 1 — feature request input. The request is cleaned up and stored
          in your browser. The scope analysis itself is not built yet.
        </p>
      </div>

      <section aria-label="Feature request" className="mt-8">
        <FeatureRequestForm />
      </section>
    </div>
  );
}

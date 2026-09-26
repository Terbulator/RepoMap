import type { Metadata } from "next";
import { ScopeShield } from "@/features/scope-shield/scope-shield";

export const metadata: Metadata = {
  title: "ScopeShield",
  description:
    "Describe a feature request and store it for the scope analysis that follows.",
};

export default function ScopeShieldPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <p className="border-b border-neutral-200 pb-6 text-sm text-neutral-600 dark:border-neutral-300 dark:border-neutral-800">
        Stage 1 — feature request input. The request is cleaned up and stored
        in your browser. The scope analysis itself is not built yet.
      </p>

      <div className="mt-8">
        <ScopeShield />
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import type { OnboardingMapData } from "@/types/onboarding";
import { DashboardHeader, ProjectSummary } from "./ProjectSummary";
import { ModuleCards } from "./ModuleCards";
import { RecommendedFiles } from "./RecommendedFiles";
import { Gotchas } from "./Gotchas";
import { ArchitectureDiagram } from "./ArchitectureDiagram";
import { ModuleDetailDrawer } from "./ModuleDetailDrawer";
import { cn } from "@/lib/cn";
import { AlertTriangle } from "lucide-react";

interface LoadingSkeletonProps {
  className?: string;
}

function LoadingSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800",
        className
      )}
    />
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <LoadingSkeleton className="h-24 w-full" />
      <LoadingSkeleton className="h-48 w-full" />
      <LoadingSkeleton className="h-[600px] w-full" />
      <LoadingSkeleton className="h-64 w-full" />
      <LoadingSkeleton className="h-64 w-full" />
      <LoadingSkeleton className="h-64 w-full" />
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/30 dark:bg-red-900/10">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
        <div>
          <p className="font-medium text-red-800 dark:text-red-200">Failed to load onboarding map</p>
          <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
        </div>
      </div>
      <button
        onClick={onRetry}
        className="mt-4 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}

export function OnboardingMap() {
  const [data, setData] = useState<OnboardingMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/onboarding");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const json = await response.json();
        if (!cancelled) {
          setData(json);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  const handleRetry = () => {
    setRetryKey((k) => k + 1);
  };

  const handleSelectModule = (id: string) => {
    setSelectedModuleId((prev) => (prev === id ? null : id));
  };

  const selectedModule = data?.modules.find((m) => m.id === selectedModuleId) || null;

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={handleRetry} />;
  }

  if (!data) {
    return <ErrorState message="No data received" onRetry={handleRetry} />;
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <DashboardHeader data={data} />
      <ProjectSummary data={data} />
      <ArchitectureDiagram
        modules={data.modules}
        relationships={data.relationships}
        selectedModuleId={selectedModuleId}
        onSelectModule={handleSelectModule}
      />
      <div className="grid gap-8 lg:grid-cols-2">
        <RecommendedFiles files={data.recommendedFiles} />
        <Gotchas gotchas={data.gotchas} />
      </div>
      <ModuleCards
        modules={data.modules}
        selectedModuleId={selectedModuleId}
        onSelectModule={handleSelectModule}
      />
      <ModuleDetailDrawer module={selectedModule} onClose={() => setSelectedModuleId(null)} />
    </div>
  );
}
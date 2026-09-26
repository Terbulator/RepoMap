export interface RepoMapAnalysis {
  projectSummary: string;
  stack: string[];
  modules: Module[];
  recommendedFiles: RecommendedFile[];
  gotchas: (string | Gotcha)[];
  relationships: Relationship[];
  provenance?: {
    provider: "bob-2.0" | "mock";
    bobTaskId: string | null;
    generatedAt: string;
    durationMs: number;
    notice: string | null;
  };
}

export interface Module {
  id: string;
  name: string;
  path: string;
  purpose: string;
  files: (string | ModuleFile)[];
  dependencies: string[];
  bobExplanation?: string;
}

export interface ModuleFile {
  path: string;
  language?: string;
  size?: number;
}

export interface RecommendedFile {
  path: string;
  reason: string;
  rank: number;
}

export interface Gotcha {
  id: string;
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  filePaths: string[];
}

export interface Relationship {
  source: string;
  target: string;
  type: string;
}

export interface OnboardingMapData {
  repository: {
    name: string;
    url: string;
    branch: string;
    commitSha: string;
    analyzedAt: string;
  };
  projectSummary: string;
  stack: string[];
  modules: Module[];
  recommendedFiles: RecommendedFile[];
  gotchas: Gotcha[];
  relationships: Relationship[];
}
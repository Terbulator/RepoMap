export interface RepositoryMeta {
  name: string;
  url: string;
  branch: string;
  commitSha: string;
  analyzedAt: string;
}

export interface ModuleFile {
  path: string;
  language: string;
  size: number;
}

export interface Module {
  id: string;
  name: string;
  path: string;
  purpose: string;
  files: ModuleFile[];
  dependencies: string[];
  bobExplanation?: string;
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
  type: "imports" | "calls" | "extends" | "uses";
}

export interface OnboardingMapData {
  repository: RepositoryMeta;
  projectSummary: string;
  stack: string[];
  modules: Module[];
  recommendedFiles: RecommendedFile[];
  gotchas: Gotcha[];
  relationships: Relationship[];
}
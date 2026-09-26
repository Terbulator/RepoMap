export interface RepoMapAnalysis {
  projectSummary: string;
  stack: string[];
  modules: Module[];
  recommendedFiles: RecommendedFile[];
  gotchas: string[];
  relationships: Relationship[];
}

export interface Module {
  id: string;
  name: string;
  path: string;
  purpose: string;
  files: string[];
  dependencies: string[];
}

export interface RecommendedFile {
  path: string;
  reason: string;
  rank: number;
}

export interface Relationship {
  source: string;
  target: string;
  type: string;
}
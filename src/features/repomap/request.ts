import { z } from "zod";

export const repoMapRequestSchema = z.object({
  repository: z.string().trim().min(1, "A repository URL or owner/repo is required."),
});

export type RepoMapRequest = z.infer<typeof repoMapRequestSchema>;

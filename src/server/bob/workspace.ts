import { execFile } from "node:child_process";
import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";
import { BobProviderError } from "./provider.ts";
import type { RepositoryRef } from "@/features/repomap/schema.ts";

/**
 * IBM Bob 2.0 analyses a local workspace, so a target repository must exist on
 * disk before Bob can read it.
 *
 * Two modes:
 * - REPOMAP_WORKSPACE_DIR set: analyse that local checkout as-is.
 * - otherwise: shallow-clone the repository into .repomap-cache/<owner>__<repo>
 *   (gitignored) and analyse the clone.
 */
export const WORKSPACE_CACHE_DIR = ".repomap-cache";

export function workspaceDirName(repository: RepositoryRef): string {
  return repository.slug.replace(/[^a-zA-Z0-9._-]+/g, "__");
}

export async function resolveWorkspace(
  repository: RepositoryRef,
  root: string = env.REPOMAP_WORKSPACE_DIR ?? path.join(process.cwd(), WORKSPACE_CACHE_DIR),
): Promise<string> {
  const target = path.join(root, workspaceDirName(repository));
  await mkdir(target, { recursive: true });

  if (await isGitCheckout(target)) return target;

  await cloneRepository(repository.url, target);
  return target;
}

async function isGitCheckout(directory: string): Promise<boolean> {
  try {
    await access(path.join(directory, ".git"));
    return true;
  } catch {
    return false;
  }
}

function cloneRepository(url: string, target: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      "git",
      ["clone", "--depth", "1", "--single-branch", url, target],
      { timeout: env.REPOMAP_CLONE_TIMEOUT_MS, windowsHide: true, maxBuffer: 8 * 1024 * 1024 },
      (error, _stdout, stderr) => {
        if (error) {
          reject(
            new BobProviderError(
              `Could not clone ${url} for analysis: ${String(stderr || error.message)
                .trim()
                .slice(0, 300)}`,
              error,
            ),
          );
          return;
        }
        resolve();
      },
    );
  });
}

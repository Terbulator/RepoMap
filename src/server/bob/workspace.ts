import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { inflateRawSync } from "node:zlib";
import { env } from "@/lib/env";
import { BobProviderError } from "./provider.ts";
import type { RepositoryRef } from "@/features/repomap/schema.ts";

/**
 * IBM Bob 2.0 analyses a local workspace, so a target repository must exist on
 * disk before Bob can read it.
 *
 * Two modes:
 * - REPOMAP_WORKSPACE_DIR set: use that directory as the cache root.
 * - otherwise: use .repomap-cache/<owner>__<repo> (gitignored).
 *
 * The repository arrives as a GitHub source archive rather than a `git clone`:
 * the serverless runtime has no `git` executable, and Bob only reads files, so
 * nothing here needs a checkout.
 */
export const WORKSPACE_CACHE_DIR = ".repomap-cache";

/** GitHub serves a repository archive per branch; `main` first, then `master`. */
const ARCHIVE_BRANCHES = ["main", "master"] as const;

export function workspaceDirName(repository: RepositoryRef): string {
  return repository.slug.replace(/[^a-zA-Z0-9._-]+/g, "__");
}

export async function resolveWorkspace(
  repository: RepositoryRef,
  root: string = env.REPOMAP_WORKSPACE_DIR ?? path.join(process.cwd(), WORKSPACE_CACHE_DIR),
): Promise<string> {
  const target = path.join(root, workspaceDirName(repository));
  await mkdir(target, { recursive: true });

  if (await isPopulated(target)) return target;

  await downloadRepository(repository, target);
  return target;
}

/** A workspace is reusable once it holds files, however they got there. */
async function isPopulated(directory: string): Promise<boolean> {
  try {
    const entries = await readdir(directory);
    return entries.length > 0;
  } catch {
    return false;
  }
}

async function downloadRepository(repository: RepositoryRef, target: string): Promise<void> {
  const failures: string[] = [];

  for (const branch of ARCHIVE_BRANCHES) {
    const archive = `https://github.com/${repository.slug}/archive/refs/heads/${branch}.zip`;

    let response: Response;
    try {
      // GitHub redirects to codeload, so redirects are followed.
      response = await fetch(archive, {
        redirect: "follow",
        signal: AbortSignal.timeout(env.REPOMAP_CLONE_TIMEOUT_MS),
      });
    } catch (error) {
      throw new BobProviderError(
        `Could not reach ${archive} for analysis: ${describe(error)}`,
        error,
      );
    }

    if (!response.ok) {
      // A missing `main` is expected on older repositories, so try the next one.
      failures.push(`${branch}.zip returned ${response.status} ${response.statusText}`.trim());
      continue;
    }

    const bytes = Buffer.from(await response.arrayBuffer());

    try {
      await extractZip(bytes, target);
    } catch (error) {
      throw new BobProviderError(
        `Could not extract ${repository.url} for analysis: ${describe(error)}`,
        error,
      );
    }

    return;
  }

  // Every branch failed, so report them all: a 404 on `main` and a 500 on
  // `master` point at different problems.
  throw new BobProviderError(
    `Could not download ${repository.url} for analysis: ${failures.join("; ")}`,
  );
}

// ponytail: central-directory-only reader, so ZIP64 (entries over 4GB or
// archives with more than 65535 files) is not supported. Public GitHub source
// archives stay far below both. Swap in a streaming unzipper if that ceiling
// is ever reached.
async function extractZip(bytes: Buffer, target: string): Promise<void> {
  const end = findEndOfCentralDirectory(bytes);
  if (end < 0) throw new Error("not a ZIP archive: no end-of-central-directory record");

  const entryCount = bytes.readUInt16LE(end + 10);
  let offset = bytes.readUInt32LE(end + 16);

  for (let index = 0; index < entryCount; index += 1) {
    if (bytes.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`corrupt central directory at entry ${index}`);
    }

    const method = bytes.readUInt16LE(offset + 10);
    const compressedSize = bytes.readUInt32LE(offset + 20);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const localOffset = bytes.readUInt32LE(offset + 42);
    const name = bytes.toString("utf8", offset + 46, offset + 46 + nameLength);

    offset += 46 + nameLength + extraLength + commentLength;

    // GitHub wraps every entry in a single "<repo>-<branch>/" directory, and Bob
    // expects the repository files directly inside the workspace.
    const relative = stripArchiveRoot(name);
    if (!relative) continue;

    const destination = resolveInside(target, relative);
    if (!destination) continue;

    if (name.endsWith("/")) {
      await mkdir(destination, { recursive: true });
      continue;
    }

    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, readEntry(bytes, localOffset, method, compressedSize));
  }
}

/**
 * Drops the archive's single top-level directory, e.g. `jersey-store-main/`.
 *
 * Separators are normalised because some producers emit `\` instead of the `/`
 * the ZIP spec requires; without this every entry looks top-level and the
 * extraction would quietly write nothing. An entry with no top-level directory
 * at all is kept as-is, so unwrapped archives land correctly too.
 */
function stripArchiveRoot(name: string): string {
  const normalized = name.replace(/\\/g, "/");
  const slash = normalized.indexOf("/");
  return slash < 0 ? normalized : normalized.slice(slash + 1);
}

/**
 * An archive is untrusted input, so an entry name that climbs out of the
 * workspace is dropped rather than written.
 */
function resolveInside(root: string, relative: string): string | null {
  const base = path.resolve(root);
  const destination = path.resolve(base, relative);
  return destination.startsWith(base + path.sep) ? destination : null;
}

function findEndOfCentralDirectory(bytes: Buffer): number {
  // The record is 22 bytes and is followed only by an optional comment.
  for (let offset = bytes.length - 22; offset >= 0; offset -= 1) {
    if (bytes.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  return -1;
}

function readEntry(bytes: Buffer, localOffset: number, method: number, compressedSize: number): Buffer {
  if (bytes.readUInt32LE(localOffset) !== 0x04034b50) {
    throw new Error("corrupt local file header");
  }

  // Sizes come from the central directory, so an entry that streams its sizes
  // in a trailing data descriptor still reads correctly.
  const nameLength = bytes.readUInt16LE(localOffset + 26);
  const extraLength = bytes.readUInt16LE(localOffset + 28);
  const start = localOffset + 30 + nameLength + extraLength;
  const data = bytes.subarray(start, start + compressedSize);

  if (method === 0) return data;
  if (method === 8) return inflateRawSync(data);
  throw new Error(`unsupported ZIP compression method ${method}`);
}

function describe(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).trim().slice(0, 300);
}

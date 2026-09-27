import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { env } from "@/lib/env";
import { parseBobOutput, parseScopeOutput } from "./output.ts";
import { buildRepoMapPrompt, buildScopeShieldPrompt } from "./prompts.ts";
import {
  BobProviderError,
  type BobProvider,
  type RepositoryAnalysis,
  type ScopeAnalysis,
} from "./provider.ts";

export type CliBobProviderOptions = {
  workspace: string;
  binary?: string;
  maxTurns?: number;
  timeoutMs?: number;
  apiKey?: string;
  runImpl?: typeof execFile;
};

export function createCliBobProvider(
  options: CliBobProviderOptions,
): BobProvider {
  const {
    workspace,
    binary = env.BOB_CLI_PATH,
    maxTurns = env.BOB_MAX_TURNS,
    timeoutMs = env.BOB_TIMEOUT_MS,
    apiKey = process.env.BOB_API_KEY,
    runImpl = execFile,
  } = options;

  return {
    name: "bob-2.0",

    async analyzeRepository(
      repositoryUrl: string,
    ): Promise<RepositoryAnalysis> {
      const stdout = await runPrompt(buildRepoMapPrompt(repositoryUrl));
      return parseBobOutput(stdout, binary);
    },

    async analyzeScope(
      repositoryUrl: string,
      request: string,
      context?: string | null,
    ): Promise<ScopeAnalysis> {
      const stdout = await runPrompt(
        buildScopeShieldPrompt(repositoryUrl, request, context),
      );
      return parseScopeOutput(stdout, binary);
    },
  };

  async function runPrompt(prompt: string): Promise<string> {
    if (!apiKey) {
      throw new BobProviderError(
        "BOB_API_KEY is not set. Headless IBM Bob 2.0 runs require it; export it before starting the app.",
      );
    }

    return runBob(
      buildCommand(binary, [
        "run",
        "--format",
        "json",
        "--max-turns",
        String(maxTurns),
        "--disable-mcp",
        "--disable-subagents",
        "--workspace",
        workspace,
        prompt,
      ]),
      binary,
      timeoutMs,
      runImpl,
    );
  }
}

type ExecFile = typeof execFile;

export function buildCommand(
  binary: string,
  args: string[],
): { file: string; args: string[] } {
  if (/\.(c|m)?js$/i.test(binary)) {
    return { file: process.execPath, args: [binary, ...args] };
  }

  return { file: binary, args };
}

async function runBob(
  command: { file: string; args: string[] },
  binary: string,
  timeoutMs: number,
  runImpl: ExecFile,
): Promise<string> {
  const bobHome = await mkdtemp(join(tmpdir(), "repomap-bob-"));

  await mkdir(join(bobHome, ".bob"), { recursive: true });

  return new Promise<string>((resolve, reject) => {
    const child = runImpl(
      command.file,
      command.args,
      {
        timeout: timeoutMs,
        maxBuffer: 32 * 1024 * 1024,
        windowsHide: true,
        env: {
          ...process.env,
          HOME: bobHome,
        },
      },
      (error, stdout, stderr) => {
        void rm(bobHome, { recursive: true, force: true });

        if (error) {
          const detail = String(stderr || error.message)
            .trim()
            .slice(0, 500);

          reject(
            new BobProviderError(
              `IBM Bob 2.0 (${binary}) failed: ${detail}`,
              error,
            ),
          );
          return;
        }

        resolve(String(stdout));
      },
    );

    child.stdin?.end();
  });
}
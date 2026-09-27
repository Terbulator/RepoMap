import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Repositories Bob analyses are cloned here at runtime. Already gitignored;
    // linting downloaded third-party repos only ever produced noise.
    ".repomap-cache/**",
    // Stale linked worktrees and agent scratch space. Not part of the app, and
    // without this `eslint .` walks hundreds of foreign files and never exits.
    ".kilo/**",
  ]),
]);

export default eslintConfig;

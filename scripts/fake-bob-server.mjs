/**
 * Local stand-in for IBM Bob 2.0, used only to verify the RepoMap pipeline
 * end-to-end before real credentials exist. Not part of the app.
 *
 * Run: node scripts/fake-bob-server.mjs
 */
import { createServer } from "node:http";

const analysis = {
  summary:
    "RepoMap is a hackathon proof of concept that turns IBM Bob 2.0 repository analysis into a shared map of a codebase.",
  stack: ["TypeScript", "Next.js", "React", "Tailwind CSS"],
  modules: [
    {
      name: "web",
      path: "src/app",
      responsibility: "Renders the landing page, the dashboard shell and the API routes.",
      entryPoints: ["src/app/page.tsx", "src/app/dashboard/page.tsx"],
      dependsOn: ["src/server"],
    },
    {
      name: "server",
      path: "src/server",
      responsibility: "Calls IBM Bob 2.0 and normalises its answer into the RepoMap contract.",
      entryPoints: ["src/server/repomap/generate.ts"],
      dependsOn: [],
    },
    {
      name: "shared",
      path: "src/features",
      responsibility: "Holds the RepoMap data contract and the product module registry.",
      entryPoints: [],
      dependsOn: [],
    },
  ],
  recommendedFiles: [
    { path: "README.md", why: "Explains the product and how to run it." },
    { path: "src/features/repomap/schema.ts", why: "The contract every other module depends on." },
    { path: "src/app/page.tsx", why: "Shows the product's front door." },
  ],
  gotchas: [
    {
      title: "Bob responses can arrive fenced",
      detail: "Model output may be wrapped in a markdown fence, so extraction is not optional.",
    },
  ],
};

const server = createServer((request, response) => {
  let body = "";
  request.on("data", (chunk) => {
    body += chunk;
  });
  request.on("end", () => {
    console.log(`[fake-bob] ${request.method} ${request.url}`);
    const payload = JSON.parse(body || "{}");
    console.log(`[fake-bob] repositoryUrl=${payload.repositoryUrl}`);
    response.writeHead(200, {
      "content-type": "application/json",
      "x-bob-task-id": "task_fake_001",
    });
    response.end(
      JSON.stringify({
        taskId: "task_fake_001",
        data: "```json\n" + JSON.stringify(analysis) + "\n```",
      }),
    );
  });
});

server.listen(4010, () => console.log("[fake-bob] listening on http://127.0.0.1:4010"));

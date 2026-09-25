const ALLOWED_HOSTS = new Set(["github.com", "www.github.com"]);

export type RepositoryRef = {
  url: string;
  slug: string;
  name: string;
};

export class InvalidRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidRepositoryError";
  }
}

/**
 * FR-1 accepts a target repository. Accepts a GitHub URL or the `owner/repo`
 * shorthand people type into a demo, and returns a canonical https URL.
 */
export function parseRepositoryRef(input: string): RepositoryRef {
  const value = input.trim();
  if (value === "") {
    throw new InvalidRepositoryError("A repository is required.");
  }

  if (/^[\w.-]+\/[\w.-]+$/.test(value)) {
    return toRef(`https://github.com/${value}`);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new InvalidRepositoryError(
      `"${value}" is not a repository URL. Use https://github.com/owner/repo or owner/repo.`,
    );
  }

  if (url.protocol !== "https:") {
    throw new InvalidRepositoryError("Only https repository URLs are accepted.");
  }

  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) {
    throw new InvalidRepositoryError(
      `Unsupported host "${url.hostname}". RepoMap currently accepts GitHub repositories.`,
    );
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const [owner, repo] = segments;
  if (!owner || !repo) {
    throw new InvalidRepositoryError("Repository URLs must include an owner and a repository name.");
  }

  return toRef(`https://github.com/${owner}/${repo.replace(/\.git$/, "")}`);
}

function toRef(url: string): RepositoryRef {
  const slug = url.replace(/^https?:\/\/[^/]+\//, "").replace(/\/$/, "");
  return { url, slug, name: slug.split("/").pop() || slug };
}

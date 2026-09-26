import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          RepoMap
        </Link>
        <nav className="flex items-center gap-6 text-sm text-neutral-600 dark:text-neutral-300">
          <Link href="/" className="hover:text-neutral-900 dark:hover:text-white">
            Home
          </Link>
          <Link
            href="/dashboard"
            className="hover:text-neutral-900 dark:hover:text-white"
          >
            Dashboard
          </Link>
          <Link
            href="/scope-shield"
            className="hover:text-neutral-900 dark:hover:text-white"
          >
            ScopeShield
          </Link>
        </nav>
      </div>
    </header>
  );
}

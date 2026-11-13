import { createHash } from 'node:crypto';

/**
 * Page versions: what gives each sitemap entry an honest `lastmod`.
 *
 * A page's `lastmod` moves only when the content of its <main> changes. The
 * manifest (src/data/page-versions.json) is committed, so a rebuild on another
 * day does not pretend every page was modified, and a changed page cannot keep
 * its old date — `npm run verify` fails until the manifest is re-stamped.
 */
export interface PageVersion {
  hash: string;
  /** ISO 8601 UTC timestamp of the stamp that first saw this content. */
  lastmod: string;
}

export type Versions = Record<string, PageVersion>;

/** Hashes the page's own content. Shared chrome (header, nav, footer) is left out. */
export function mainContentHash(html: string): string {
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/.exec(html)?.[1] ?? html;
  return createHash('sha256').update(main).digest('hex').slice(0, 16);
}

export function nextVersions(
  previous: Versions,
  pages: ReadonlyArray<{ route: string; html: string }>,
  now: string,
): Versions {
  const next: Versions = {};
  for (const { route, html } of pages) {
    const hash = mainContentHash(html);
    const before = previous[route];
    // Unchanged content keeps its date. Changed or new content takes this stamp's.
    next[route] = before && before.hash === hash ? before : { hash, lastmod: now };
  }
  return next;
}

/** Routes whose current content does not match the manifest. */
export function staleRoutes(
  versions: Versions,
  pages: ReadonlyArray<{ route: string; html: string }>,
): string[] {
  return pages.filter(({ route, html }) => versions[route]?.hash !== mainContentHash(html)).map((p) => p.route);
}

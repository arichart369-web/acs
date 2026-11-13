/**
 * One address per page.
 *
 * Every page is a directory with an index.html, and its only address is the
 * directory path with a trailing slash: `/products/te200/`. Every other way of
 * spelling it redirects there permanently; nothing else returns 200.
 *
 * This function is the single statement of that rule. The preview server uses
 * it, the tests exercise it, and whichever host eventually serves the site has
 * to apply the same rule — a static host that also answers `/x/index.html`
 * with 200 would quietly give every page a second address.
 */
export type Resolution =
  | { status: 200; file: string }
  | { status: 301; location: string }
  | { status: 404 };

/** `files` holds paths relative to the site root, e.g. `products/te200/index.html`. */
export function resolveAddress(rawPath: string, files: ReadonlySet<string>): Resolution {
  let path: string;
  try {
    path = decodeURIComponent(rawPath.split('?')[0]?.split('#')[0] ?? '/');
  } catch {
    return { status: 404 };
  }
  if (!path.startsWith('/') || path.includes('..') || path.includes('//')) return { status: 404 };

  const rel = path.slice(1);
  const pageAt = (dir: string) => files.has(dir === '' ? 'index.html' : `${dir}/index.html`);

  // The canonical form: a directory path ending in a slash.
  if (path.endsWith('/')) {
    const dir = rel.replace(/\/$/, '');
    return pageAt(dir) ? { status: 200, file: dir === '' ? 'index.html' : `${dir}/index.html` } : { status: 404 };
  }

  // `/x/index.html` → `/x/`
  if (rel === 'index.html' || rel.endsWith('/index.html')) {
    const dir = rel.replace(/\/?index\.html$/, '');
    return pageAt(dir) ? { status: 301, location: dir === '' ? '/' : `/${dir}/` } : { status: 404 };
  }

  // `/x.html` → `/x/`, when that page exists. The error page is not a page address.
  if (rel.endsWith('.html')) {
    const dir = rel.replace(/\.html$/, '');
    return pageAt(dir) ? { status: 301, location: `/${dir}/` } : { status: 404 };
  }

  // `/x` → `/x/`
  if (pageAt(rel)) return { status: 301, location: `/${rel}/` };

  // Anything else is a plain file: an asset, robots.txt, sitemap.xml.
  return files.has(rel) ? { status: 200, file: rel } : { status: 404 };
}

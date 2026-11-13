import type { Product } from '../data/catalog';

/** Lower-cases and removes spaces, hyphens and slashes so "TE 200" finds TE200. */
export function normaliseQuery(text: string): string {
  return text.normalize('NFKC').toLowerCase().replace(/[\s\-_/]+/g, '');
}

export function searchHaystack(product: Product): string {
  return normaliseQuery(
    [product.id, product.brand, product.name, product.thaiTitle, product.thaiDescription, product.tag, product.keywords].join(' '),
  );
}

export function matchesQuery(product: Product, query: string): boolean {
  const q = normaliseQuery(query);
  return q === '' || searchHaystack(product).includes(q);
}

export function filterProducts(
  all: readonly Product[],
  opts: { query?: string; category?: string },
): Product[] {
  return all.filter(
    (p) => (!opts.category || opts.category === 'all' || p.category === opts.category) && matchesQuery(p, opts.query ?? ''),
  );
}

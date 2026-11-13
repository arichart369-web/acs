import { SITE } from '../config/site';
import { categoryById, productPath, type Product } from '../data/catalog';

/**
 * Structured data for product pages.
 *
 * It describes only what the page itself states: a name, a description, a
 * brand, a category. It carries NO offer, price, availability, rating or
 * review, because ACS has none of those in evidence and a plausible stand-in
 * would be an invented claim in machine-readable form.
 *
 * Without an offer or a review this markup is valid schema.org but is not
 * eligible for a Google product rich result. That is the honest state until a
 * dated price list exists.
 */
export const FORBIDDEN_KEYS = [
  'offers', 'price', 'priceCurrency', 'lowPrice', 'highPrice', 'priceValidUntil', 'availability',
  'aggregateRating', 'review', 'ratingValue', 'reviewCount', 'ratingCount',
] as const;

export type JsonLd = Record<string, unknown>;

/** Only entries that are products get Product markup. */
export function hasProductMarkup(p: Product): boolean {
  return p.kind === 'model' || p.kind === 'family';
}

export function productJsonLd(p: Product): JsonLd | null {
  if (!hasProductMarkup(p)) return null;
  const category = categoryById(p.category);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    alternateName: p.thaiTitle,
    description: p.thaiDescription,
    brand: { '@type': 'Brand', name: p.brand },
    ...(category ? { category: category.title } : {}),
    url: SITE.origin + productPath(p.id),
  };
}

export function breadcrumbJsonLd(p: Product): JsonLd {
  const item = (position: number, name: string, path: string) => ({
    '@type': 'ListItem', position, name, item: SITE.origin + path,
  });
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [item(1, 'หน้าแรก', '/'), item(2, 'สินค้า', '/products/'), item(3, p.thaiTitle, productPath(p.id))],
  };
}

/** Every key used anywhere in the object, however deeply nested. */
export function allKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(allKeys);
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, inner]) => [key, ...allKeys(inner)]);
  }
  return [];
}

export function forbiddenKeysIn(value: unknown): string[] {
  const forbidden = new Set<string>(FORBIDDEN_KEYS);
  return [...new Set(allKeys(value).filter((key) => forbidden.has(key)))];
}

/** Every string value in the object, however deeply nested. */
export function allStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(allStrings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(allStrings);
  return [];
}

/** `<` is escaped so no value can close the script element early. */
export function jsonLdScript(data: JsonLd): string {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

export function extractJsonLd(html: string): JsonLd[] {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    (m) => JSON.parse(m[1] ?? 'null') as JsonLd,
  );
}

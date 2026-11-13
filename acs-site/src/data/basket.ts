import { products } from './catalog';

/**
 * The request basket holds product ids only — never a name, phone, email or
 * anything else about the visitor. That is why it may live in sessionStorage
 * while the enquiry form's own state may not.
 */
export const BASKET_KEY = 'acs:basket:v1';

const validIds = new Set(products.map((p) => p.id));

export function parseBasket(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    const out: string[] = [];
    for (const id of value) if (typeof id === 'string' && validIds.has(id) && !out.includes(id)) out.push(id);
    return out;
  } catch {
    return [];
  }
}

export function addToBasket(current: readonly string[], id: string): string[] {
  return validIds.has(id) && !current.includes(id) ? [...current, id] : [...current];
}

export function removeFromBasket(current: readonly string[], id: string): string[] {
  return current.filter((x) => x !== id);
}

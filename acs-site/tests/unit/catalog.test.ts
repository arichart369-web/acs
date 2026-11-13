import { describe, expect, it } from 'vitest';
import { addToBasket, parseBasket, removeFromBasket } from '../../src/data/basket';
import { categories, productPath, products, referenceLink } from '../../src/data/catalog';

describe('catalogue data', () => {
  it('holds the 14 products and 6 categories of the live catalogue', () => {
    expect(products).toHaveLength(14);
    expect(categories).toHaveLength(6);
  });

  it('has unique ids that are safe as URL segments', () => {
    const ids = products.map((p) => p.id);
    expect(new Set(ids).size).toBe(14);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it('puts every product in a known category', () => {
    const known = new Set(categories.map((c) => c.id));
    for (const p of products) expect(known.has(p.category)).toBe(true);
  });

  it('has distinct Thai titles, so no two product pages share an h1', () => {
    expect(new Set(products.map((p) => p.thaiTitle)).size).toBe(14);
  });

  it('keeps the live provenance marking as found', () => {
    const tally: Record<string, number> = {};
    for (const p of products) tally[p.evidence ?? 'absent'] = (tally[p.evidence ?? 'absent'] ?? 0) + 1;
    expect(tally).toEqual({ manufacturer_reference: 7, acs_named_family: 3, acs_named_model: 2, absent: 2 });
  });

  it('builds one trailing-slash path per product', () => {
    expect(productPath('1950g')).toBe('/products/1950g/');
  });

  it('never links to an asiancoding.com URL from the data, since those return 404', () => {
    const dead = products.filter((p) => referenceLink(p) === null).map((p) => p.id).sort();
    expect(dead).toEqual(['labels', 'resin-ribbons', 'rfid', 'wax-resin-ribbons', 'wax-ribbons']);
    for (const p of products) {
      const link = referenceLink(p);
      if (link) expect(new URL(link).hostname).not.toMatch(/asiancoding\.com$/);
    }
  });
});

describe('request basket', () => {
  it('accepts only known product ids', () => {
    expect(parseBasket('["te200","nope","te200",42,"1950g"]')).toEqual(['te200', '1950g']);
  });

  it('survives junk in storage', () => {
    expect(parseBasket(null)).toEqual([]);
    expect(parseBasket('not json')).toEqual([]);
    expect(parseBasket('{"name":"x"}')).toEqual([]);
  });

  it('adds without duplicates and removes', () => {
    expect(addToBasket(['te200'], 'te200')).toEqual(['te200']);
    expect(addToBasket(['te200'], '1950g')).toEqual(['te200', '1950g']);
    expect(addToBasket([], 'unknown')).toEqual([]);
    expect(removeFromBasket(['te200', '1950g'], 'te200')).toEqual(['1950g']);
  });
});

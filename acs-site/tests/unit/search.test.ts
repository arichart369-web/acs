import { describe, expect, it } from 'vitest';
import { products } from '../../src/data/catalog';
import { filterProducts, normaliseQuery } from '../../src/rules/search';

const ids = (query: string, category?: string) => filterProducts(products, { query, category }).map((p) => p.id);

describe('catalogue search', () => {
  it('returns everything for an empty query', () => {
    expect(ids('')).toHaveLength(14);
  });

  it('finds a model number however it is spaced or cased', () => {
    expect(ids('TE200')).toEqual(['te200']);
    expect(ids('te 200')).toEqual(['te200']);
    expect(ids('Te-200')).toEqual(['te200']);
  });

  it('finds Thai terms', () => {
    expect(ids('เครื่องสแกนบาร์โค้ด').sort()).toEqual(['1950g', '1960g', 'ds2208', 'ds3600'].sort());
    expect(ids('ริบบอน').sort()).toEqual(['resin-ribbons', 'wax-resin-ribbons', 'wax-ribbons']);
  });

  it('finds English terms', () => {
    // te200's keywords mention "labels" and "ribbon" does not appear there.
    expect(ids('ribbon').sort()).toEqual(['resin-ribbons', 'wax-resin-ribbons', 'wax-ribbons']);
    expect(ids('zebra').sort()).toEqual(['ds2208', 'ds3600', 'tc22', 'zd421', 'zt411']);
  });

  it('filters by category, alone and with a query', () => {
    expect(ids('', 'scanners').sort()).toEqual(['1950g', '1960g', 'ds2208', 'ds3600']);
    expect(ids('', 'printers').sort()).toEqual(['m510', 'te200', 'zd421', 'zt411']);
    expect(ids('zebra', 'printers').sort()).toEqual(['zd421', 'zt411']);
    expect(ids('', 'all')).toHaveLength(14);
  });

  it('returns nothing for a term that is not there', () => {
    expect(ids('ไม่มีสินค้านี้')).toEqual([]);
  });

  it('normalises width, case and separators', () => {
    expect(normaliseQuery(' ＴＥ－200 ')).toBe(normaliseQuery('te200'));
  });
});

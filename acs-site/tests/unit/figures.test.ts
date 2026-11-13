import { describe, expect, it } from 'vitest';
import { products } from '../../src/data/catalog';
import { extractFigures, hasSpecFigure, normaliseFigure } from '../../src/rules/figures';

describe('spec figure detection', () => {
  // Every feature line in the live catalogue that states a measured figure.
  // These are regression cases taken from the data, not a formula.
  const expected: Record<string, string[]> = {
    '1950g': ['มาตรฐานการป้องกัน IP52', 'ช่วงอุณหภูมิใช้งาน 0–50 °C'],
    '1960g': ['มาตรฐานการป้องกัน IP52'],
    m510: ['พิมพ์แบบ Thermal Transfer ความละเอียด 300 dpi', 'รองรับฉลากกว้างสูงสุด 1.5 นิ้ว (38.1 มม.)'],
    zd421: ['ความละเอียด 203 หรือ 300 dpi ตามรุ่นย่อย'],
    ds2208: ['เซนเซอร์ภาพ 640 × 480 พิกเซล'],
  };

  it('flags exactly the figure-bearing lines of the live catalogue', () => {
    const found: Record<string, string[]> = {};
    for (const p of products) {
      const lines = p.features.filter(hasSpecFigure);
      if (lines.length) found[p.id] = lines;
    }
    expect(found).toEqual(expected);
  });

  it('finds 7 figure lines across 5 products', () => {
    const lines = products.flatMap((p) => p.features.filter(hasSpecFigure));
    expect(lines).toHaveLength(7);
    expect(products.filter((p) => p.features.some(hasSpecFigure))).toHaveLength(5);
  });

  it.each([
    ['อ่านบาร์โค้ด 1D/2D'],
    ['เชื่อมต่อแบบมีสาย; USB, RS-232, RS-485 และ Keyboard Wedge ตามชุดอุปกรณ์'],
    ['ZT400 series industrial printer'],
    ['TC22 / TC27 handheld mobile computer family'],
    ['เครื่องสแกนแบบมีสาย (DS2208); ไม่ใช่รุ่นไร้สาย DS2278'],
    ['อ่านบาร์โค้ด 1D และ 2D'],
    ['TE series desktop printer'],
  ])('does not treat a model or interface name as a figure: %s', (line) => {
    expect(extractFigures(line)).toEqual([]);
  });

  it('extracts the figure text itself', () => {
    expect(extractFigures('มาตรฐานการป้องกัน IP52')).toEqual(['IP52']);
    expect(extractFigures('ช่วงอุณหภูมิใช้งาน 0–50 °C')).toEqual(['0–50 °C']);
    expect(extractFigures('เซนเซอร์ภาพ 640 × 480 พิกเซล')).toEqual(['640 × 480 พิกเซล']);
    expect(extractFigures('รองรับฉลากกว้างสูงสุด 1.5 นิ้ว (38.1 มม.)')).toEqual(['1.5 นิ้ว', '38.1 มม.']);
    expect(extractFigures('ความละเอียด 203 หรือ 300 dpi ตามรุ่นย่อย')).toEqual(['203 หรือ 300 dpi']);
  });

  it('matches Thai units, which an ASCII word boundary would miss', () => {
    expect(hasSpecFigure('อ่านได้ไกล 10 เมตร')).toBe(true);
    expect(hasSpecFigure('หนัก 250 กรัม')).toBe(true);
    expect(hasSpecFigure('กว้าง 104 มม.')).toBe(true);
  });

  it('normalises dashes and spacing', () => {
    expect(normaliseFigure('0–50 °C')).toBe(normaliseFigure('0-50°C'));
  });
});

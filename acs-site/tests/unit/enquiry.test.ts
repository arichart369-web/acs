import { describe, expect, it } from 'vitest';
import {
  emptyEnquiry, errorsForStep, INTERESTS, MESSAGE_MAX, validateEnquiry, type EnquiryFields,
} from '../../src/rules/enquiry';

const valid = (over: Partial<EnquiryFields> = {}): EnquiryFields => ({
  ...emptyEnquiry(),
  name: 'สมชาย ทดสอบ',
  phone: '081-234-5678',
  company: 'บริษัท ทดสอบ จำกัด',
  email: 'somchai@example.com',
  industry: 'retail',
  businessScale: 'single_site',
  country: 'TH',
  interests: ['scanners'],
  serviceConsent: true,
  ...over,
});

describe('enquiry validation', () => {
  it('accepts a complete enquiry', () => {
    expect(validateEnquiry(valid())).toEqual({});
  });

  it('reports every required field on an empty form', () => {
    const errors = validateEnquiry(emptyEnquiry());
    expect(Object.keys(errors).sort()).toEqual(
      ['businessScale', 'company', 'email', 'industry', 'interests', 'name', 'phone', 'serviceConsent'].sort(),
    );
  });

  it('starts with both consents unticked and Thailand selected', () => {
    const f = emptyEnquiry();
    expect(f.serviceConsent).toBe(false);
    expect(f.marketingConsent).toBe(false);
    expect(f.country).toBe('TH');
  });

  it('requires service consent', () => {
    expect(validateEnquiry(valid({ serviceConsent: false })).serviceConsent).toBeTruthy();
  });

  it('never requires marketing consent', () => {
    expect(validateEnquiry(valid({ marketingConsent: false }))).toEqual({});
    expect(validateEnquiry(valid({ marketingConsent: true }))).toEqual({});
  });

  it.each(['abc', '12345', '08-1234', '081 234 5678 ext'])('rejects phone %s', (phone) => {
    expect(validateEnquiry(valid({ phone })).phone).toBeTruthy();
  });

  it.each(['081-234-5678', '+66 81 234 5678', '(02) 203 0232', '0812345678'])('accepts phone %s', (phone) => {
    expect(validateEnquiry(valid({ phone })).phone).toBeUndefined();
  });

  it.each(['plain', 'a@b', 'a b@c.com', '@c.com'])('rejects email %s', (email) => {
    expect(validateEnquiry(valid({ email })).email).toBeTruthy();
  });

  it('rejects values outside the closed sets', () => {
    const errors = validateEnquiry(valid({ industry: 'x', businessScale: 'y', country: 'ZZ', interests: ['nope'] }));
    expect(Object.keys(errors).sort()).toEqual(['businessScale', 'country', 'industry', 'interests']);
  });

  it('offers the six catalogue categories as interests', () => {
    expect(INTERESTS).toEqual(['printers', 'scanners', 'labels', 'ribbons', 'rfid', 'mobile']);
  });

  it('counts Thai text in code points, not UTF-16 units', () => {
    // อริย์ธัช is 8 code points.
    expect([...'อริย์ธัช']).toHaveLength(8);
    expect(validateEnquiry(valid({ message: 'ก'.repeat(MESSAGE_MAX) })).message).toBeUndefined();
    expect(validateEnquiry(valid({ message: 'ก'.repeat(MESSAGE_MAX + 1) })).message).toBeTruthy();
    // 200 astral-plane characters are 400 UTF-16 units but still 200 characters.
    expect(validateEnquiry(valid({ name: '𠮷'.repeat(200) })).name).toBeUndefined();
    expect(validateEnquiry(valid({ name: '𠮷'.repeat(201) })).name).toBeTruthy();
  });

  it('limits errors to the fields of the step being checked', () => {
    const f = emptyEnquiry();
    expect(Object.keys(errorsForStep(f, 1)).sort()).toEqual(['name', 'phone']);
    expect(Object.keys(errorsForStep(f, 2)).sort()).toEqual(['company', 'email']);
    expect(Object.keys(errorsForStep(f, 3)).sort()).toEqual(['businessScale', 'industry', 'interests', 'serviceConsent']);
  });
});

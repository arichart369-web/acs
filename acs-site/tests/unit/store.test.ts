import { describe, expect, it } from 'vitest';
import { statusConfig, type StatusConfig } from '../../src/config/status';
import { NOT_CONNECTED_MESSAGE, submitEnquiry } from '../../src/data/store';
import { emptyEnquiry } from '../../src/rules/enquiry';

describe('store boundary', () => {
  it('refuses the write and says why', async () => {
    const out = await submitEnquiry(emptyEnquiry());
    expect(out).toEqual({ ok: false, status: 'not_connected', message: NOT_CONNECTED_MESSAGE });
  });

  it('still refuses if someone flips the config to live, because no backend exists', async () => {
    const forced: StatusConfig = { system: 'live', features: { ...statusConfig.features, enquiry: 'live' } };
    const out = await submitEnquiry(emptyEnquiry(), forced);
    expect(out.ok).toBe(false);
  });

  it('never hands back a reference number', async () => {
    const out = await submitEnquiry(emptyEnquiry());
    expect(JSON.stringify(out)).not.toMatch(/reference/);
  });

  it('tells the visitor nothing was saved and how to reach ACS', () => {
    expect(NOT_CONNECTED_MESSAGE).toContain('ยังไม่ได้ส่งคำขอ');
    expect(NOT_CONNECTED_MESSAGE).toContain('02-203-0232');
  });
});

import { statusConfig, type StatusConfig } from '../config/status';
import { SITE } from '../config/site';
import type { EnquiryFields } from '../rules/enquiry';

/**
 * The store boundary. Every write in the application goes through here.
 *
 * Until a real backend passes its gate, every write is REFUSED and says so.
 * The UI renders the message it gets and never shows a success it did not
 * receive. There is no fallback that pretends: no local queue, no fake id.
 */
export type StoreStatus = 'not_connected';

export type StoreResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: StoreStatus; message: string };

export interface EnquiryReceipt {
  reference: string;
  createdAt: string;
}

export const NOT_CONNECTED_MESSAGE =
  `ยังไม่ได้ส่งคำขอนี้ — ระบบรับคำขอยังไม่เชื่อมต่อ ข้อมูลที่กรอกไม่ได้ถูกบันทึกหรือส่งไปที่ใด ` +
  `หากต้องการติดต่อ ACS ตอนนี้ กรุณาโทร ${SITE.phoneDisplay}`;

export async function submitEnquiry(
  _payload: EnquiryFields,
  _config: StatusConfig = statusConfig,
): Promise<StoreResult<EnquiryReceipt>> {
  // No backend exists. Whatever the config says, there is nothing to write to,
  // so the honest answer is a refusal. A backend that passes its gate replaces
  // this body; it does not get a flag to skip the gate.
  return { ok: false, status: 'not_connected', message: NOT_CONNECTED_MESSAGE };
}

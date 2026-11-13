import type { EvidenceRecord } from '../rules/evidence';

/**
 * Active and draft evidence records.
 *
 * Empty on purpose. No vendor datasheet has been supplied (source gap SRC-03),
 * so no spec figure is evidenced and none is rendered. Records are added here
 * only through rules/evidence.ts `activate`, never typed in as `active`.
 */
export const evidenceRecords: readonly EvidenceRecord[] = [];

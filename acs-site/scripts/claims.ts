/**
 * Runs the ACS claim scanner over the built HTML and records the result.
 * Fails when anything is BLOCKED. Writes test-results/claims.json, which is
 * also the record of every spec figure the build held back (T8, T15).
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const scanner = join(root, '..', 'acs-seo', 'tools', 'claim-scan.mjs');
const out = join(root, 'test-results');
mkdirSync(out, { recursive: true });

interface Finding { cr: string; cls: string; rule: string; match: string }
interface ScanFile { file: string; findings: Finding[] }

const run = spawnSync('node', [scanner, 'dist', '--all', '--json'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
let files: ScanFile[] = [];
let error = '';
try {
  files = (JSON.parse(run.stdout) as { files: ScanFile[] }).files;
} catch {
  error = `scanner output could not be read (exit ${run.status}): ${run.stderr.slice(0, 300)}`;
}

const tally: Record<string, number> = {};
const byClass: Record<string, number> = { BLOCKED: 0, EVIDENCE_REQUIRED: 0, OWNER_REQUIRED: 0 };
const blocked: Array<{ file: string; cr: string; match: string }> = [];
for (const f of files) {
  for (const x of f.findings) {
    tally[`${x.cr} ${x.cls} ${x.rule}`] = (tally[`${x.cr} ${x.cls} ${x.rule}`] ?? 0) + 1;
    byClass[x.cls] = (byClass[x.cls] ?? 0) + 1;
    if (x.cls === 'BLOCKED') blocked.push({ file: f.file, cr: x.cr, match: x.match });
  }
}

const report = JSON.parse(readFileSync(join(root, 'dist', 'build-report.json'), 'utf8')) as {
  omittedFigures: unknown[]; activeEvidenceRecords: number;
};
const pass = !error && files.length > 0 && blocked.length === 0;
writeFileSync(join(out, 'claims.json'), JSON.stringify({
  ranAt: new Date().toISOString(),
  scanner: 'acs-seo/tools/claim-scan.mjs over dist/',
  filesScanned: files.length,
  pass,
  error,
  byClass,
  tally,
  blocked,
  activeEvidenceRecords: report.activeEvidenceRecords,
  omittedFigures: report.omittedFigures,
}, null, 2) + '\n');

console.log(`${pass ? 'PASS' : 'FAIL'}  claim scan: BLOCKED ${byClass.BLOCKED} · EVIDENCE_REQUIRED ${byClass.EVIDENCE_REQUIRED} · OWNER_REQUIRED ${byClass.OWNER_REQUIRED} · files ${files.length}`);
console.log(`      figures held back for want of evidence: ${report.omittedFigures.length}`);
if (error) console.log(`      ${error}`);
process.exit(pass ? 0 : 1);

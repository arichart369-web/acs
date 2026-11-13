/**
 * Static build. Renders every page to dist/ as plain HTML, so product text is
 * in the server response and never depends on JavaScript.
 */
import { build as esbuild } from 'esbuild';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderSite } from '../src/build/site';
import { isIndexable, statusConfig } from '../src/config/status';
import { evidenceRecords } from '../src/data/evidence';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const asOf = new Date().toISOString().slice(0, 10);

const site = renderSite(statusConfig, evidenceRecords, asOf);

rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, 'assets'), { recursive: true });
for (const [file, content] of site.files) {
  const target = join(dist, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

cpSync(join(root, 'src/styles/site.css'), join(dist, 'assets/site.css'));
await esbuild({
  entryPoints: [join(root, 'src/client/main.ts')],
  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: true,
  outfile: join(dist, 'assets/app.js'),
  logLevel: 'warning',
});

// The build says exactly which figures it held back, and which pages it opened to crawlers.
const report = {
  builtOn: asOf,
  system: statusConfig.system,
  indexable: isIndexable(),
  routes: site.pages.map((p) => p.route),
  indexableRoutes: site.pages.filter((p) => p.indexable).map((p) => p.route),
  activeEvidenceRecords: evidenceRecords.filter((r) => r.status === 'active').length,
  omittedFigures: site.omittedFigures,
};
writeFileSync(join(dist, 'build-report.json'), JSON.stringify(report, null, 2) + '\n');

console.log(
  `built ${site.pages.length} pages · system=${statusConfig.system} · indexable=${report.indexableRoutes.length} · omitted figures=${site.omittedFigures.length}`,
);

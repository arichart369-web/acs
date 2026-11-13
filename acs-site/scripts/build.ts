/**
 * Static build. Renders every page to dist/ as plain HTML, so product text is
 * in the server response and never depends on JavaScript.
 */
import { build as esbuild } from 'esbuild';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isIndexable, statusConfig } from '../src/config/status';
import { productPath, products } from '../src/data/catalog';
import { evidenceRecords } from '../src/data/evidence';
import { splitFeatures } from '../src/rules/evidence';
import {
  basketPage, cataloguePage, companyPage, enquiryPage, homePage, notFoundPage, productPage, statusPage,
} from '../src/render/pages';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const asOf = new Date().toISOString().slice(0, 10);

function write(path: string, html: string): void {
  const file = path.endsWith('.html') || path.endsWith('.txt') || path.endsWith('.json')
    ? join(dist, path)
    : join(dist, path, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, 'assets'), { recursive: true });

const routes: string[] = [];
const page = (path: string, html: string) => { routes.push(path); write(path, html); };

page('/', homePage());
page('/products/', cataloguePage());
for (const p of products) page(productPath(p.id), productPage(p, evidenceRecords, asOf));
page('/basket/', basketPage());
page('/enquiry/', enquiryPage());
page('/company/', companyPage());
page('/status/', statusPage());
write('/404.html', notFoundPage());

// A build that is not live is closed to crawlers wherever it ends up hosted.
write('/robots.txt', isIndexable() ? 'User-agent: *\nAllow: /\n' : 'User-agent: *\nDisallow: /\n');

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

// The build says exactly which figures it held back, and why.
const omitted = products.flatMap((p) =>
  splitFeatures(p.id, p.features, evidenceRecords, asOf).omitted.map((feature) => ({ productId: p.id, feature })),
);
const report = {
  builtOn: asOf,
  system: statusConfig.system,
  indexable: isIndexable(),
  routes,
  activeEvidenceRecords: evidenceRecords.filter((r) => r.status === 'active').length,
  omittedFigures: omitted,
};
write('/build-report.json', JSON.stringify(report, null, 2) + '\n');

console.log(`built ${routes.length} pages · system=${statusConfig.system} · omitted figures=${omitted.length}`);

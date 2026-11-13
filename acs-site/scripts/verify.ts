/**
 * Discoverability checks for a LIVE configuration, without ever writing a live
 * build to dist/. The shipped build is demo and closed to crawlers, so these
 * rules can only be proven on a variant rendered in memory.
 *
 * Writes test-results/canonical.json and test-results/sitemap.json.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveAddress } from '../src/build/address';
import { absoluteUrl, canonicalOf, htmlIsIndexable, renderSite } from '../src/build/site';
import { statusConfig, type StatusConfig } from '../src/config/status';
import { evidenceRecords } from '../src/data/evidence';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'test-results');
mkdirSync(out, { recursive: true });
const asOf = new Date().toISOString().slice(0, 10);

const live: StatusConfig = { system: 'live', features: { ...statusConfig.features } };
const site = renderSite(live, evidenceRecords, asOf);
const demo = renderSite(statusConfig, evidenceRecords, asOf);
const fileSet = new Set(site.files.keys());

interface Check { name: string; pass: boolean; detail: string }
const canonicalChecks: Check[] = [];
const sitemapChecks: Check[] = [];
const add = (list: Check[], name: string, pass: boolean, detail = '') => {
  list.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${pass || !detail ? '' : `  — ${detail}`}`);
};

/* ---------- canonical: T4 ---------- */
const pageRows = site.pages.map((p) => {
  const html = site.files.get(p.file) ?? '';
  const canonical = canonicalOf(html);
  return { route: p.route, indexable: p.indexable, canonical, noindex: !htmlIsIndexable(html) };
});
const wrongCanonical = pageRows.filter((r) => r.indexable && !(r.canonical.length === 1 && r.canonical[0] === absoluteUrl(r.route)));
add(canonicalChecks, 'every indexable page has exactly one canonical, pointing at itself', wrongCanonical.length === 0, wrongCanonical.map((r) => r.route).join(' '));
const mixed = pageRows.filter((r) => !r.indexable && (r.canonical.length > 0 || !r.noindex));
add(canonicalChecks, 'a page that is not indexable says noindex and names no canonical', mixed.length === 0, mixed.map((r) => r.route).join(' '));
const notFound = site.files.get('404.html') ?? '';
add(canonicalChecks, 'the error page is noindex with no canonical', !htmlIsIndexable(notFound) && canonicalOf(notFound).length === 0);

const htmlFiles = [...fileSet].filter((f) => f.endsWith('.html'));
const strays = htmlFiles.filter((f) => f !== '404.html' && f !== 'index.html' && !f.endsWith('/index.html'));
add(canonicalChecks, 'no page is emitted under a second file name', strays.length === 0, strays.join(' '));

const variants: string[] = [];
for (const p of site.pages) {
  const bare = p.route === '/' ? null : p.route.replace(/\/$/, '');
  const forms = [`${p.route}index.html`, ...(bare ? [bare, `${bare}.html`] : [])];
  if (resolveAddress(p.route, fileSet).status !== 200) variants.push(`${p.route} is not 200`);
  for (const form of forms) {
    const r = resolveAddress(form, fileSet);
    if (!(r.status === 301 && r.location === p.route)) variants.push(`${form} → ${r.status}`);
  }
}
add(canonicalChecks, `each of ${site.pages.length} pages answers 200 at one address and 301 from every other form`, variants.length === 0, variants.join(' | '));

const demoRows = demo.pages.map((p) => demo.files.get(p.file) ?? '');
add(canonicalChecks, 'the shipped demo build: every page noindex, no canonical anywhere', demoRows.every((h) => !htmlIsIndexable(h) && canonicalOf(h).length === 0));

/* ---------- sitemap and robots: T7 ---------- */
const xml = site.files.get('sitemap.xml') ?? '';
const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1] ?? '');
const expected = site.pages.filter((p) => p.indexable).map((p) => absoluteUrl(p.route));
add(sitemapChecks, 'the sitemap lists every indexable URL', expected.every((u) => locs.includes(u)), expected.filter((u) => !locs.includes(u)).join(' '));
add(sitemapChecks, 'the sitemap lists nothing else', locs.every((u) => expected.includes(u)), locs.filter((u) => !expected.includes(u)).join(' '));
add(sitemapChecks, 'no URL appears twice', new Set(locs).size === locs.length);
const unresolved = locs.filter((u) => resolveAddress(new URL(u).pathname, fileSet).status !== 200);
add(sitemapChecks, 'every sitemap entry resolves to 200', unresolved.length === 0, unresolved.join(' '));
const robots = site.files.get('robots.txt') ?? '';
const sitemapLine = /^Sitemap: (\S+)$/m.exec(robots)?.[1] ?? '';
add(sitemapChecks, 'robots.txt names the sitemap, and the sitemap is there', sitemapLine === absoluteUrl('/sitemap.xml') && resolveAddress('/sitemap.xml', fileSet).status === 200, sitemapLine);
add(sitemapChecks, 'robots.txt of a live build does not close the site', !/^Disallow: \/\s*$/m.test(robots));
add(sitemapChecks, 'the shipped demo build: no sitemap, robots closes the site', !demo.files.has('sitemap.xml') && /^Disallow: \/\s*$/m.test(demo.files.get('robots.txt') ?? ''));

const failed = [...canonicalChecks, ...sitemapChecks].filter((c) => !c.pass);
const stamp = { ranAt: new Date().toISOString(), variant: 'live (rendered in memory, never written to dist/)' };
writeFileSync(join(out, 'canonical.json'), JSON.stringify({ ...stamp, passed: canonicalChecks.filter((c) => c.pass).length, failed: canonicalChecks.filter((c) => !c.pass).length, checks: canonicalChecks, pages: pageRows }, null, 2) + '\n');
writeFileSync(join(out, 'sitemap.json'), JSON.stringify({ ...stamp, passed: sitemapChecks.filter((c) => c.pass).length, failed: sitemapChecks.filter((c) => !c.pass).length, checks: sitemapChecks, urls: locs }, null, 2) + '\n');
console.log(`\n${canonicalChecks.length + sitemapChecks.length - failed.length}/${canonicalChecks.length + sitemapChecks.length} checks passed · ${locs.length} URLs in the live sitemap`);
process.exit(failed.length ? 1 : 0);

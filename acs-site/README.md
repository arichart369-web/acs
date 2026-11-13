# ACS website rebuild

A rebuild of asiancoding.com as a tested static site. **It runs in demo mode and is not
deployed anywhere.** Nothing here touches the live domain, DNS or traffic; go-live is a
separate Owner decision with its own gate (backup, rollback plan, explicit approval).

PRD: https://claude.ai/artifact/YXVU5Vr7byRo78XAD1rino

## Run it

```sh
npm install
npm run build      # renders dist/ and writes dist/build-report.json
npm test           # unit tests (Vitest) → test-results/unit.json
npm run verify     # canonical, sitemap and structured-data rules on a live-config variant → test-results/
npm run stamp      # re-stamp page versions after changing page content; commit the result
npm run e2e        # Playwright + axe against the preview server → test-results/
npm run claims     # ACS claim scanner over the built HTML
npm run preview    # serve dist/ on http://127.0.0.1:4173
```

`npm run e2e` expects Playwright to be installed globally (it is in the build container).
Do not add it as a project dependency. It starts its own preview server on a free port and
checks that the server answering is this project's, because a fixed port once left it
testing a stale server from an earlier run.

## Increments

| # | What | Unit | E2E | Claims |
|---|---|---|---|---|
| M0 | Skeleton: 20 pages reachable in demo mode, one status config, store boundary, evidence gate, enquiry wizard, basket | 82/82 | 30/30 | BLOCKED 0 |
| M1 | Discoverability: one address per page, self-referencing canonical, sitemap of exactly the indexable pages, robots naming it; family pages say so | 108/108 | 34/34 | BLOCKED 0 |
| M2a | Product structured data with no price, offer, availability or rating; sitemap `lastmod` from a committed content-hash manifest | 125/125 | 35/35 | BLOCKED 0 |

`npm run verify` on the live-config variant: 13/13 at M1, 23/23 at M2a (17 URLs in its sitemap).

**M2 is only partly done.** M2a is the part that does not wait on the Owner. The rest of
M2 — spec figures, prices, stock, category pages, the ribbon decision and the company
page — cannot start until the material and decisions listed under "Still missing" arrive.

## Non-negotiables, and where each one lives

| Rule | File |
|---|---|
| One place says live / demo / not connected | `src/config/status.ts` |
| Every write is refused until a backend passes its gate | `src/data/store.ts` |
| A spec figure renders only under an active evidence record | `src/rules/evidence.ts`, `src/rules/figures.ts` |
| Evidence goes draft → active only if the source quotes every figure, a source is named, and approver ≠ author; decisions are append-only | `src/rules/evidence.ts` |
| Nothing personal in URLs, storage, cookies or logs | `src/client/main.ts` (state in memory), checked by E21–E23 |
| A build that is not live is closed to crawlers | `isIndexable()` in `src/config/status.ts` |
| One address per page; every other spelling is a 301 | `src/build/address.ts` |
| The sitemap lists exactly the pages whose own HTML is indexable | `src/build/site.ts` |
| Structured data never carries a price, offer, availability, rating or review | `src/render/structured.ts` |
| A page's `lastmod` moves only when its content does; a changed page cannot keep its old date | `src/build/versions.ts`, `src/data/page-versions.json` |
| Catalogue data is a verbatim snapshot, never edited to fit | `src/data/catalog.source.json` |

## Status rules

`system` is `demo`. A feature moves to `live` only when its acceptance test passes **and**
the material behind it is named. Four features cannot move until the Owner supplies
something: spec figures (datasheets), prices (a dated price list), stock (dated stock
data) and the company page (its URL, decision D-11).

## How the live rules are proven while the build stays demo

The shipped build is demo: every page is `noindex`, there is no sitemap, and `robots.txt`
closes the site. Canonicals and the sitemap only exist on a live system, so they are
proven on a **live-config variant rendered in memory** (`renderSite` in
`src/build/site.ts`), never written to `dist/`. `npm run verify` and
`tests/unit/site.test.ts` both do this. Nothing flips the shipped config.

On a live system 17 pages are indexable: home, catalogue, 14 products and the enquiry
page. The basket, the status page and the error page never are, and the company page
joins only when its content is live.

## Limits right now

- **The one-address rule is proven on the preview server only.** `scripts/serve.ts`
  applies `src/build/address.ts`, and e2e checks all 20 pages against it. Whichever host
  serves the site must apply the same rule; a static host that also answers
  `/x/index.html` with 200 would give every page a second address. The canonical tag
  still names the right one, but the redirect is a hosting requirement, not something
  this build can enforce on its own.
- **Structured data is valid schema.org but not rich-result eligible.** Google's product
  rich results need an offer, a review or a rating. ACS has none in evidence, so none is
  emitted. The five supplies and solution entries carry no Product markup at all, since
  they are not products; whether they become category pages is decision D-09.
- **`lastmod` tracks the page's `<main>` only.** A change to the header, the footer or
  the structured data alone does not move a date.
- **Model numbers that end in a unit letter read as figures.** `1950g` matches the figure
  rule as "1950 g". It fails safe — a feature line naming such a model would be omitted,
  not wrongly shown — and no current feature line does. Worth fixing before one does.
- **DS3600 does not list its models.** The catalogue names the family but not which
  models ACS sells, so the page says it is a family and lists none rather than guessing.

- **Demo mode.** The enquiry form validates and then refuses to submit; nothing is stored
  or sent anywhere. The basket keeps product ids in `sessionStorage` and nothing else.
- **No evidence records.** Zero are active, so 7 figure lines across 5 products are
  omitted. `dist/build-report.json` lists each one.
- **The audit log is in memory.** It is append-only by construction but does not persist.
- **No product images.** The live assets were not available to this build; pages show a
  labelled placeholder.
- **Company page is a placeholder.** The approved copy exists
  (`../acs-seo/packages/about-acs/`) but its URL is undecided.

## Not yet tested

- Core Web Vitals. No lab measurement has been run.
- Structured data against an external validator. It is parsed and checked against this
  project's own rules; it has not been run through Google's Rich Results Test or the
  schema.org validator, neither of which is reachable from the build container.
- Screen readers. axe-core passes at 360 px and 1280 px, but no manual pass with a real
  screen reader has been done, and axe does not catch everything.
- Browsers other than Chromium.
- Real fonts. Google Fonts are blocked in the build container, so screenshots in
  `test-results/screens/` use fallback fonts and are not typographically final.
- Touch-target check covers standalone controls only; links inside running text are
  exempt, as WCAG allows.

## Still missing (planned, not built)

- A redirect plan for the 81 dead URLs of the old site — needs Search Console data.
- Category pages, the three-ribbon decision, the company URL — Owner decisions D-09,
  D-10, D-11.
- A backend for enquiries, with its own gate.

## Known scanner note

`npm run claims` reports 71 `EVIDENCE_REQUIRED` findings (54 before structured data
repeated each brand name), all CR-06 on a manufacturer's
name used as a product brand (Honeywell, TSC, Zebra, Brady). That is the rule working as
written — a vendor name needs a human to confirm it is a spec reference and not a
partnership claim — and here each one is the brand field of a catalogue entry.

## Review

**This milestone has not been reviewed by anyone but its author.** Until another reviewer
checks it against the exact commit SHA, it counts as NOT RECEIVED, whatever the test
counts say.

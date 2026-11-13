# 08 · Re-verification of the live site, 13 November 2026

The 23 October observations were three weeks old and the PRD made re-verifying them the
first task of M0. Fetched again on 13 November 2026, through Brightdata.

| Observation from 23 Oct | 13 Nov |
|---|---|
| `catalog-data.js?v=5`: 14 products, 6 categories | **Unchanged.** Same 14 entries, same fields, same text. |
| Five catalogue entries link to ACS's own 404s | **Unchanged.** `acsUrl` on `1950g` and `m510`, `url` on `rfid`, `labels` and the three ribbons. |
| Footer links to `www.asiancoding.com/contact` | **Unchanged**, still present in `products.html`. |
| `/sitemap.xml` returns 404 | **Unchanged.** |
| `/sales` answers 200 unauthenticated, no `robots` meta, no auth gate in its HTML | **Unchanged.** Still loads `catalog-data.js?v=4`. |

**The `/sales` finding is therefore three weeks older and still open.** As before, only the
page shell was fetched; the customer data behind it was deliberately not loaded, so whether
it is exposed remains unverified.

The catalogue snapshot the rebuild uses is `../acs-site/src/data/catalog.source.json`,
transcribed from this fetch.

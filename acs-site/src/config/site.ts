/**
 * Site constants. Each value was read off the live site on 2026-11-13; none is
 * invented. Change them here and nowhere else.
 */
export const SITE = {
  name: 'ACS · Asian Coding Systems',
  shortName: 'ACS',
  lang: 'th',
  /**
   * The host canonical URLs and the sitemap are written for. On 2026-10-23 the
   * apex asiancoding.com answered with a 301 to this host, so this is the one
   * ACS already treats as preferred.
   */
  origin: 'https://www.asiancoding.com',
  /** Shown on the live site's header, footer and contact dialog. */
  phoneDisplay: '02-203-0232',
  phoneHref: 'tel:+6622030232',
  /** The address the live site's "Copy email" button copies. */
  salesEmail: 'sales@asiancoding.com',
  city: 'Bangkok, Thailand',
} as const;

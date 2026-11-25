// Public origin of this site (e.g. https://sme.niaraglobal.com). It comes from
// NEXT_PUBLIC_SITE_URL, never hardcoded, so the same code can run on the
// production domain, a preview or a local machine. The localhost fallback is
// only for local development: every deployed environment must set the variable.

const LOCAL_FALLBACK_ORIGIN = "http://localhost:3000";

/** The site's origin without a trailing slash, e.g. "https://sme.niaraglobal.com". */
export function getSiteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || LOCAL_FALLBACK_ORIGIN;
  // new URL() throws on a malformed value, so a bad env var fails the build
  // instead of silently producing wrong canonical URLs.
  return new URL(raw).origin;
}

/** Absolute URL for a site path, e.g. absoluteUrl("/ativos"). */
export function absoluteUrl(path: string): string {
  return new URL(path, getSiteOrigin()).toString();
}

/**
 * Canonical URL for a page's metadata. Spread it into the page's own
 * generateMetadata return value. It must be set per page: a canonical in the
 * root layout would be inherited by every route and point them all at the home.
 */
export function canonicalMetadata(path: string): { alternates: { canonical: string } } {
  return { alternates: { canonical: absoluteUrl(path) } };
}

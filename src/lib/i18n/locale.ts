/**
 * The part of the language handling that does not depend on the server: the locale type, the
 * cookie constants and normalization. Kept apart from server.ts on purpose: that module imports
 * `next/headers`, which only exists on the server, and a client component importing a constant
 * from there would break the build.
 */

export type Locale = "pt" | "en";

export const LOCALES: readonly Locale[] = ["pt", "en"];

/** Cookie that stores the visitor's explicit choice (the EN · PT switcher in the header). */
export const LOCALE_COOKIE = "niara_locale";

/** One year. */
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Any value other than "pt" | "en" (tampered cookie, old version) becomes null. */
export function parseLocale(value: string | undefined | null): Locale | null {
  return value === "pt" || value === "en" ? value : null;
}

/**
 * First visit (no cookie): follow the browser. Any Portuguese variant (pt, pt-BR, pt-PT) → "pt";
 * anything else, or no header at all → "en". The order of preference in the header is respected.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return "en";
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { tag: tag.toLowerCase(), q: q ? Number(q.slice(2)) || 0 : 1 };
    })
    .filter((entry) => entry.tag && entry.q > 0)
    .sort((a, b) => b.q - a.q);
  for (const { tag } of ranked) {
    if (tag === "pt" || tag.startsWith("pt-")) return "pt";
    if (tag === "en" || tag.startsWith("en-")) return "en";
  }
  return "en";
}

/** Value for <html lang>. */
export function htmlLang(locale: Locale): string {
  return locale === "pt" ? "pt-BR" : "en";
}

/** BCP 47 tag for Intl number/date formatting in the interface language. */
export function intlLocale(locale: Locale): string {
  return locale === "pt" ? "pt-BR" : "en-US";
}

/**
 * Demo content written in both languages next to the data itself (fictitious companies in the
 * mock catalog) instead of in the dictionaries — see src/lib/mock/offerings.ts.
 */
export type LocalizedText = Record<Locale, string>;

export function localize(text: LocalizedText, locale: Locale): string {
  return text[locale];
}

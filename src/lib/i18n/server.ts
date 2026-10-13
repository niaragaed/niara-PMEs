import "server-only";
import { cookies, headers } from "next/headers";
import { dictionaries, type Dictionary } from "./dictionaries";
import { LOCALE_COOKIE, localeFromAcceptLanguage, parseLocale, type Locale } from "./locale";

/**
 * The visitor's language, for Server Components and Server Actions: the cookie set by the header's
 * switcher wins; without it, the browser's Accept-Language decides (see locale.ts). Routes don't
 * change with the language.
 */
export async function getLocale(): Promise<Locale> {
  // Next 16: cookies() and headers() are async.
  const store = await cookies();
  const chosen = parseLocale(store.get(LOCALE_COOKIE)?.value);
  if (chosen) return chosen;
  return localeFromAcceptLanguage((await headers()).get("accept-language"));
}

/** The interface copy in the visitor's language. */
export async function getDictionary(): Promise<Dictionary> {
  return dictionaries[await getLocale()];
}

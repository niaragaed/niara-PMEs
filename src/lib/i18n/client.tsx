"use client";

import { createContext, useContext } from "react";
import { dictionaries, type Dictionary } from "./dictionaries";
import type { Locale } from "./locale";

const LocaleContext = createContext<Locale>("pt");

/**
 * Mounted once in the root layout, with the locale resolved on the server (cookie or
 * Accept-Language). Client components read the copy through useDictionary(); both dictionaries are
 * in the client bundle, so switching never waits for a fetch.
 */
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useDictionary(): Dictionary {
  return dictionaries[useContext(LocaleContext)];
}

"use client";

import { useTransition } from "react";
import { switchLocale } from "@/app/actions/set-locale";
import { useDictionary, useLocale } from "@/lib/i18n/client";
import { LOCALES } from "@/lib/i18n/locale";

/**
 * "EN · PT" switcher in the header. A <form> with one submit button per language, so it also works
 * without JS; the Server Action stores the cookie and re-renders the layout on the same URL (routes
 * don't change with the language). The current language is marked with aria-pressed.
 */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const dict = useDictionary();
  const current = useLocale();
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => startTransition(() => switchLocale(formData))}
      aria-label={dict.nav.language.ariaLabel}
      className={`flex items-center gap-1 text-xs font-medium ${pending ? "opacity-60" : ""} ${className}`}
    >
      {LOCALES.map((locale, index) => (
        <span key={locale} className="flex items-center gap-1">
          {index > 0 && (
            <span aria-hidden="true" className="text-ink-muted">
              ·
            </span>
          )}
          <button
            type="submit"
            name="locale"
            value={locale}
            lang={locale === "pt" ? "pt-BR" : "en"}
            aria-label={dict.nav.language[locale]}
            aria-pressed={current === locale}
            disabled={pending}
            className={`rounded px-1 py-0.5 uppercase transition-colors focus-visible:outline-2 focus-visible:outline-salmon ${
              current === locale ? "text-ink" : "text-ink-muted hover:text-ink"
            }`}
          >
            {locale}
          </button>
        </span>
      ))}
    </form>
  );
}

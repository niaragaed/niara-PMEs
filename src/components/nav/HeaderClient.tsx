"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { NavDropdown } from "@/components/nav/NavDropdown";
import { AccountMenu } from "@/components/nav/AccountMenu";
import { LanguageSwitcher } from "@/components/nav/LanguageSwitcher";
import { getNavItems } from "@/lib/nav-items";
import type { HeaderAccount } from "@/lib/nav/headerAccount";
import { useDictionary } from "@/lib/i18n/client";

// All of the Header's interaction (scroll, mobile menu) lives here — Header.tsx
// itself became a thin Server Component, only to resolve `account` (session)
// on the server (see headerAccount.ts) and pass it as a prop, since client
// components can't read cookies/Supabase directly.
export function HeaderClient({ account }: { account: HeaderAccount | null }) {
  const dict = useDictionary();
  const navItems = getNavItems(dict);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileAccordionOpen, setMobileAccordionOpen] = useState<string | null>(null);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function closeMobileMenu() {
    setMobileOpen(false);
    setMobileAccordionOpen(null);
  }

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors ${
        scrolled ? "border-border bg-surface shadow-soft" : "border-transparent bg-bg/70 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo />

        <nav aria-label={dict.nav.mainAriaLabel} className="hidden md:block">
          <ul className="flex items-center gap-8">
            {navItems.map((item) =>
              item.children ? (
                <li key={item.key}>
                  <NavDropdown item={item} />
                </li>
              ) : (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="text-sm text-ink-muted transition-colors hover:text-ink"
                  >
                    {item.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <LanguageSwitcher />
          {account ? (
            <AccountMenu account={account} />
          ) : (
            <Link
              href="/entrar"
              className="inline-flex items-center gap-2 rounded-full bg-salmon px-4 py-2 text-sm font-medium text-on-salmon transition-colors hover:bg-salmon-600"
            >
              {dict.nav.signIn}
            </Link>
          )}
        </div>

        <button
          type="button"
          aria-label={mobileOpen ? dict.nav.closeMenu : dict.nav.openMenu}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((current) => !current)}
          className="text-ink md:hidden"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <nav
          aria-label={dict.nav.mobileAriaLabel}
          className="border-t border-border bg-surface px-6 py-4 md:hidden"
        >
          <ul className="flex flex-col gap-4">
            <li>
              <LanguageSwitcher />
            </li>
            {navItems.map((item) => {
              if (!item.children) {
                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      onClick={closeMobileMenu}
                      className="text-sm text-ink-muted hover:text-ink"
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              }

              const isAccordionOpen = mobileAccordionOpen === item.key;
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    aria-expanded={isAccordionOpen}
                    onClick={() =>
                      setMobileAccordionOpen((current) => (current === item.key ? null : item.key))
                    }
                    className="flex w-full items-center justify-between text-sm text-ink-muted hover:text-ink"
                  >
                    {item.label}
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${isAccordionOpen ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />
                  </button>
                  {isAccordionOpen && (
                    <ul className="mt-3 flex flex-col gap-3 border-l border-border pl-4">
                      {item.children.map((child) => {
                        const Icon = child.icon;
                        return (
                          <li key={child.href}>
                            <Link href={child.href} onClick={closeMobileMenu} className="flex items-start gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-alt text-ink-muted">
                                <Icon className="h-4 w-4" aria-hidden="true" />
                              </span>
                              <span>
                                <span className="block text-sm text-ink">{child.label}</span>
                                <span className="block text-xs text-ink-muted">{child.description}</span>
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
            <li>
              {account ? (
                <AccountMenu account={account} />
              ) : (
                <Link
                  href="/entrar"
                  onClick={closeMobileMenu}
                  className="inline-flex items-center gap-2 rounded-full bg-salmon px-4 py-2 text-sm font-medium text-on-salmon transition-colors hover:bg-salmon-600"
                >
                  {dict.nav.signIn}
                </Link>
              )}
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

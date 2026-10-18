import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { getNavItems } from "@/lib/nav-items";
import { getDictionary } from "@/lib/i18n/server";

export async function Footer() {
  const dict = await getDictionary();
  const navItems = getNavItems(dict);
  const tradeLinks = navItems.find((item) => item.key === "trade")?.children ?? [];
  const aboutLinks = navItems.find((item) => item.key === "about")?.children ?? [];
  const platformLinks = navItems.filter((item) => !item.children);
  return (
    // isolate: guarantees the Footer always paints on top of the inner screens' SectionGlow
    // (fixed, -z-10) when the boxes overlap near the end of the scroll — see the "SIDE EFFECT"
    // comment in src/components/ui/SectionGlow.tsx for why.
    <footer className="isolate border-t border-border bg-surface-alt">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-12 sm:grid-cols-4">
        <div className="col-span-2 flex flex-col gap-3 sm:col-span-1">
          <Logo />
          <p className="max-w-xs text-sm text-ink-muted">{dict.footer.brandDescription}</p>
        </div>

        <nav aria-label={dict.footer.footerAriaLabel}>
          <h3 className="text-sm font-semibold text-ink">{dict.footer.columnTrade}</h3>
          <ul className="mt-4 flex flex-col gap-3">
            {tradeLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-ink-muted transition-colors hover:text-ink">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={dict.footer.columnPlatform}>
          <h3 className="text-sm font-semibold text-ink">{dict.footer.columnPlatform}</h3>
          <ul className="mt-4 flex flex-col gap-3">
            {platformLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-ink-muted transition-colors hover:text-ink">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={dict.footer.columnAbout}>
          <h3 className="text-sm font-semibold text-ink">{dict.footer.columnAbout}</h3>
          <ul className="mt-4 flex flex-col gap-3">
            {aboutLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-ink-muted transition-colors hover:text-ink">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-border px-6 py-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl">{dict.footer.disclaimer}</p>
          <p className="whitespace-nowrap">{dict.footer.copyright}</p>
        </div>
      </div>
    </footer>
  );
}

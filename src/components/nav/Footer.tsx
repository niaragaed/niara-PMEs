import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { NAV_ITEMS } from "@/lib/nav-items";
import { ptBr } from "@/lib/i18n/pt-br";

const negociarLinks = NAV_ITEMS.find((item) => item.label === ptBr.nav.negociar)?.children ?? [];
const sobreLinks = NAV_ITEMS.find((item) => item.label === ptBr.nav.sobre)?.children ?? [];
const plataformaLinks = NAV_ITEMS.filter((item) => !item.children);

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface-alt">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-12 sm:grid-cols-4">
        <div className="col-span-2 flex flex-col gap-3 sm:col-span-1">
          <Logo />
          <p className="max-w-xs text-sm text-ink-muted">{ptBr.footer.brandDescription}</p>
        </div>

        <nav aria-label={ptBr.footer.footerAriaLabel}>
          <h3 className="text-sm font-semibold text-ink">{ptBr.footer.columnNegociar}</h3>
          <ul className="mt-4 flex flex-col gap-3">
            {negociarLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-ink-muted transition-colors hover:text-ink">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={ptBr.footer.columnPlataforma}>
          <h3 className="text-sm font-semibold text-ink">{ptBr.footer.columnPlataforma}</h3>
          <ul className="mt-4 flex flex-col gap-3">
            {plataformaLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-ink-muted transition-colors hover:text-ink">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={ptBr.footer.columnSobre}>
          <h3 className="text-sm font-semibold text-ink">{ptBr.footer.columnSobre}</h3>
          <ul className="mt-4 flex flex-col gap-3">
            {sobreLinks.map((link) => (
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
          <p className="max-w-2xl">{ptBr.footer.disclaimer}</p>
          <p className="whitespace-nowrap">{ptBr.footer.copyright}</p>
        </div>
      </div>
    </footer>
  );
}

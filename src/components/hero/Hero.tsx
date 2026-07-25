import Link from "next/link";
import { ptBr } from "@/lib/i18n/pt-br";

// O astronauta agora é um elemento 2D persistente e fixo (AstronautGuide,
// renderizado uma vez em page.tsx), guiado pelo scroll — não mais um canvas
// embutido aqui. Esta seção só reserva o espaço vertical/visual para ele
// "pousar" centralizado na base da tela durante o hero.
export function Hero() {
  return (
    <section
      id="hero"
      className="relative flex min-h-[86vh] flex-col items-center justify-center overflow-hidden px-6 py-16 text-center sm:min-h-[90vh]"
    >
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6">
        <span className="rounded-full bg-military-100 px-4 py-1 text-sm font-medium text-military">
          {ptBr.hero.badge}
        </span>

        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
          {ptBr.hero.title}
        </h1>

        <p className="max-w-lg text-lg text-ink-muted">{ptBr.hero.subtitle}</p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled
            aria-disabled="true"
            title={ptBr.common.emBreve}
            className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-full bg-salmon/50 px-6 py-3 text-sm font-medium text-ink/60"
          >
            {ptBr.hero.ctaPrimary}
            <span className="text-xs font-normal">({ptBr.common.emBreve})</span>
          </button>

          <Link
            href="/sobre/documentos"
            className="inline-flex items-center justify-center rounded-full border border-military px-6 py-3 text-sm font-medium text-military transition-colors hover:bg-military-100"
          >
            {ptBr.hero.ctaSecondary}
          </Link>
        </div>

        <p className="max-w-md text-sm text-ink-muted">{ptBr.common.avisoDemonstracao}</p>
      </div>
    </section>
  );
}

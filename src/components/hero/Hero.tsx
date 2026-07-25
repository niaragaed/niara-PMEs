import Link from "next/link";
import { HeroParallaxLayers } from "./HeroParallaxLayers";
import { ptBr } from "@/lib/i18n/pt-br";

// Hero centrado no texto, sem elemento central 3D: o astronauta foi
// removido (ver CLAUDE.md). No lugar, HeroParallaxLayers desenha um motivo
// decorativo sutil (planeta anelado da logo + glow suave) atrás do texto.
// Fundo sálvia CHEIO (bg-military) — mesmo padrão de texto claro
// (on-military) das demais seções verdes / faixa CTA final.
export function Hero() {
  return (
    <section
      id="hero"
      className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden bg-military px-6 py-20 text-center sm:min-h-[85vh]"
    >
      <HeroParallaxLayers />

      <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-7">
        <span className="rounded-full bg-military-100 px-4 py-1 text-sm font-medium text-military">
          {ptBr.hero.badge}
        </span>

        <h1 className="text-5xl font-semibold leading-tight tracking-tight text-on-military sm:text-6xl">
          {ptBr.hero.title}
        </h1>

        <p className="max-w-lg text-lg text-on-military/80">{ptBr.hero.subtitle}</p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled
            aria-disabled="true"
            title={ptBr.common.emBreve}
            className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-full bg-salmon/90 px-6 py-3 text-sm font-medium text-on-salmon"
          >
            {ptBr.hero.ctaPrimary}
            <span className="text-xs font-normal">({ptBr.common.emBreve})</span>
          </button>

          <Link
            href="/sobre/documentos"
            className="inline-flex items-center justify-center rounded-full border border-on-military px-6 py-3 text-sm font-medium text-on-military transition-colors hover:bg-on-military/10"
          >
            {ptBr.hero.ctaSecondary}
          </Link>
        </div>

        <p className="max-w-md text-sm text-on-military/80">{ptBr.common.avisoDemonstracao}</p>
      </div>
    </section>
  );
}

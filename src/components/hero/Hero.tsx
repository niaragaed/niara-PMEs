"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ptBr } from "@/lib/i18n/pt-br";

// WebGL não roda em SSR — carregado só no cliente e envolto em Suspense.
const Astronaut = dynamic(() => import("./Astronaut"), { ssr: false });

function HeroCanvasFallback() {
  return <div className="h-full w-full animate-pulse rounded-full bg-surface-alt" aria-hidden="true" />;
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-24">
        <div className="flex flex-col items-start gap-6 text-left">
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

        <div className="h-[320px] w-full sm:h-[420px]">
          <Suspense fallback={<HeroCanvasFallback />}>
            <Astronaut />
          </Suspense>
        </div>
      </div>
    </section>
  );
}

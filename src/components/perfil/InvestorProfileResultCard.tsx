"use client";

import { RefreshCw, TrendingUp } from "lucide-react";
import { usePerfil } from "./PerfilContext";
import { SCORE_MAX, SCORE_MIN } from "@/lib/investor-profile";
import { ptBr } from "@/lib/i18n/pt-br";

export function InvestorProfileResultCard({ onRetake }: { onRetake: () => void }) {
  const { investorProfile } = usePerfil();
  const t = ptBr.perfil.investidor;
  const details = t.categoryDetails[investorProfile.category];
  const percent = ((investorProfile.score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100;
  const date = new Date(investorProfile.completedAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="rounded-lg border border-panel-border bg-panel p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-salmon/40 bg-salmon/10 px-3 py-1.5">
          <TrendingUp className="h-4 w-4 text-salmon" aria-hidden="true" />
          <span className="text-sm font-semibold text-on-military">
            {t.categorias[investorProfile.category]}
          </span>
        </div>
        <span className="text-xs text-on-military-muted">{t.avaliadoEm(date)}</span>
      </div>

      <div className="mt-6">
        <div className="flex justify-between text-[10px] uppercase tracking-wide text-on-military-muted">
          <span>{t.categorias.conservador}</span>
          <span>{t.categorias.moderado}</span>
          <span>{t.categorias.arrojado}</span>
        </div>
        <div className="relative mt-2">
          <div
            aria-hidden="true"
            className="h-2 w-full rounded-full"
            style={{
              background:
                "linear-gradient(to right, var(--color-military-600), var(--color-chip-sage), var(--color-salmon))",
            }}
          />
          <div
            aria-hidden="true"
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-panel bg-on-military"
            style={{ left: `${percent}%` }}
          />
        </div>
      </div>

      <dl className="mt-6 flex flex-col gap-4 border-t border-panel-border pt-5 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-on-military-muted">
            {t.resultado.oQueSignifica}
          </dt>
          <dd className="mt-1 text-on-military-muted">{details.summary}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-on-military-muted">
            {t.resultado.reacaoRisco}
          </dt>
          <dd className="mt-1 text-on-military-muted">{details.riskReaction}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-on-military-muted">
            {t.resultado.classesAtivos}
          </dt>
          <dd className="mt-1 text-on-military-muted">{details.assetClasses}</dd>
        </div>
      </dl>

      <p className="mt-6 rounded-md border border-salmon/30 bg-salmon/10 px-3 py-2 text-xs text-on-military-muted">
        {t.resultado.disclaimer}
      </p>

      <button
        type="button"
        onClick={onRetake}
        className="mt-6 inline-flex items-center gap-1.5 rounded-md border border-panel-border px-4 py-2 text-sm font-medium text-on-military hover:border-salmon"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        {t.resultado.refazer}
      </button>
    </div>
  );
}

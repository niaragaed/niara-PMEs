import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { RealOnChainInvestPanel } from "@/components/investir-onchain/RealOnChainInvestPanel";
import { CategoryBadge } from "./CategoryChip";
import { OfertaBanner } from "./OfertaBanner";
import { SectionGlow } from "@/components/ui/SectionGlow";
import { CATEGORY_META } from "@/lib/categories";
import { ptBr } from "@/lib/i18n/pt-br";
import { DOCUMENTOS_PADRAO } from "@/lib/mock/ofertas";
import type { ConfirmedOnChainOffering } from "@/lib/web3/confirmedOfferings";

// Página de detalhe para uma oferta PME self-service (publicada pelo próprio emissor via
// OfertaOrquestrador, já confirmada on-chain) — irmã enxuta de OfertaDetailPage.tsx, não uma
// generalização dela com condicionais. OfertaDetailPage.tsx é construída inteira em torno do tipo
// mock `Oferta` (financeiro simulado, indicadores fundamentalistas fictícios, termos fixos) — uma
// oferta self-service é uma empresa REAL (dados que o próprio emissor preencheu em /perfil), sem
// nada disso. Forçar esses campos aqui exigiria fabricar indicadores/financeiro fictícios para uma
// empresa de verdade — o inverso exato da regra "nada simulado pode parecer real" do projeto.
// Por isso este componente só mostra: banner/logo reais, dados públicos reais do emissor, termos +
// investimento ao vivo da chain (RealOnChainInvestPanel, 100% real), documentos placeholder
// genéricos (mesma lista "Em breve" de todas as ofertas, não específica de nenhuma empresa) e os
// riscos genéricos da Res. CVM 88 (texto idêntico ao de OfertaDetailPage.tsx, não fictício).
export function SelfServiceOfertaDetailPage({
  oferta,
  isSocio = false,
}: {
  oferta: ConfirmedOnChainOffering & { category: NonNullable<ConfirmedOnChainOffering["category"]> };
  isSocio?: boolean;
}) {
  const t = ptBr.negociar.oferta;
  const nome = oferta.issuerTradeName ?? oferta.issuerLegalName;

  return (
    <main className="isolate flex flex-1 flex-col bg-military">
      <SectionGlow />
      <div className="border-b border-panel-border bg-panel px-4 py-2 text-center text-xs text-on-military-muted sm:text-sm">
        <span className="font-semibold text-salmon">{ptBr.common.demonstracao}</span> — {t.demoBannerSelfService}
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <Link
          href={CATEGORY_META[oferta.category].href}
          className="text-sm font-medium text-on-military-muted transition-colors hover:text-on-military"
        >
          {t.voltarCategoria}
        </Link>

        <div className="mt-6 overflow-hidden rounded-lg shadow-soft">
          <OfertaBanner bannerUrl={oferta.bannerUrl} logoUrl={oferta.logoUrl} nomeFantasia={nome} categoria={oferta.category} size="hero" />
        </div>

        <div className="mt-6">
          <CategoryBadge categoria={oferta.category} />
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-on-military">{nome}</h1>
        </div>

        <div className="mt-8 flex flex-col gap-6">
          <p className="flex items-start gap-2 rounded-md border border-salmon/40 bg-salmon/10 px-4 py-3 text-sm text-on-military">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-salmon" aria-hidden="true" />
            {t.avisoSelfService}
          </p>

          <RealOnChainInvestPanel tokenAddress={oferta.tokenAddress} ofertaAddress={oferta.contractAddress} isSocio={isSocio} />

          {(oferta.issuerSector || oferta.issuerBusinessSummary) && (
            <section className="rounded-lg bg-surface p-6 shadow-soft">
              <h2 className="text-lg font-semibold text-ink">{t.dadosPublicos.title}</h2>
              <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-ink-muted">{t.dadosPublicos.razaoSocial}</dt>
                  <dd className="mt-0.5 text-sm text-ink">{oferta.issuerLegalName}</dd>
                </div>
                {oferta.issuerSector && (
                  <div>
                    <dt className="text-xs text-ink-muted">{t.dadosPublicos.setor}</dt>
                    <dd className="mt-0.5 text-sm text-ink">{oferta.issuerSector}</dd>
                  </div>
                )}
              </dl>
              {oferta.issuerBusinessSummary && (
                <div className="mt-4">
                  <dt className="text-xs text-ink-muted">{t.dadosPublicos.resumo}</dt>
                  <dd className="mt-0.5 text-sm leading-relaxed text-ink">{oferta.issuerBusinessSummary}</dd>
                </div>
              )}
            </section>
          )}

          <section className="rounded-lg bg-surface p-6 shadow-soft">
            <h2 className="text-lg font-semibold text-ink">{t.documentos.title}</h2>
            <ul className="mt-4 flex flex-col gap-2">
              {DOCUMENTOS_PADRAO.map((documento) => (
                <li
                  key={documento}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-2.5 text-sm text-ink-muted"
                >
                  {documento}
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    title={t.documentos.emBreve}
                    className="shrink-0 cursor-not-allowed rounded-full bg-military-100 px-3 py-1 text-xs font-medium text-military"
                  >
                    {t.documentos.emBreve}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-salmon/40 bg-surface p-6 shadow-soft">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-salmon" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-ink">{t.riscos.title}</h2>
            </div>
            <ul className="mt-4 flex flex-col gap-2">
              {t.riscos.itens.map((risco) => (
                <li key={risco} className="flex gap-2 text-sm text-ink-muted">
                  <span aria-hidden="true">•</span>
                  <span>{risco}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}

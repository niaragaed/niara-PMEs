import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { RealOnChainInvestPanel } from "@/components/investir-onchain/RealOnChainInvestPanel";
import { SolanaInvestPanel } from "@/components/investir-onchain/SolanaInvestPanel";
import { NetworkBadge } from "@/components/solana/RedeBadge";
import { CategoryBadge } from "./CategoryChip";
import { OfferingBanner } from "./OfertaBanner";
import { SectionGlow } from "@/components/ui/SectionGlow";
import { CATEGORY_META } from "@/lib/categories";
import { DEFAULT_DOCUMENTS } from "@/lib/mock/ofertas";
import type { ConfirmedOnChainOffering } from "@/lib/web3/confirmedOfferings";
import { getDictionary } from "@/lib/i18n/server";

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
export async function SelfServiceOfferingDetailPage({
  offering,
  isPartner: isSocio = false,
  isIssuer: isEmissor = false,
}: {
  offering: ConfirmedOnChainOffering & { category: NonNullable<ConfirmedOnChainOffering["category"]> };
  isPartner?: boolean;
  /** `true` só quando o emissor logado (resolveAccount()) é o dono desta oferta específica — ver
   * [slug]/page.tsx. Libera o botão "Encerrar oferta" pra empresa, além dos sócios (ver
   * RealOnChainInvestPanel.tsx). */
  isIssuer?: boolean;
}) {
  const dict = await getDictionary();
  const t = dict.trade.offering;
  const nome = offering.issuerTradeName ?? offering.issuerLegalName;

  return (
    <main className="isolate flex flex-1 flex-col bg-military">
      <SectionGlow />
      <div className="border-b border-panel-border bg-panel px-4 py-2 text-center text-xs text-on-military-muted sm:text-sm">
        <span className="font-semibold text-salmon">{dict.common.demo}</span> — {offering.rede === "solana-devnet" ? t.demoBannerSelfServiceSolana : t.demoBannerSelfService}
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <Link
          href={CATEGORY_META[offering.category].href}
          className="text-sm font-medium text-on-military-muted transition-colors hover:text-on-military"
        >
          {t.backToCategory}
        </Link>

        <div className="mt-6 overflow-hidden rounded-lg shadow-soft">
          <OfferingBanner bannerUrl={offering.bannerUrl} logoUrl={offering.logoUrl} tradeName={nome} category={offering.category} size="hero" />
        </div>

        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={offering.category} />
            <NetworkBadge rede={offering.rede} />
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-on-military">{nome}</h1>
        </div>

        <div className="mt-8 flex flex-col gap-6">
          <p className="flex items-start gap-2 rounded-md border border-salmon/40 bg-salmon/10 px-4 py-3 text-sm text-on-military">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-salmon" aria-hidden="true" />
            {offering.rede === "solana-devnet" ? t.selfServiceSolanaNotice : t.selfServiceNotice}
          </p>

          {offering.rede === "sepolia" ? (
            <RealOnChainInvestPanel
              tokenAddress={offering.tokenAddress}
              offeringAddress={offering.contractAddress}
              isPartner={isSocio}
              isIssuer={isEmissor}
            />
          ) : (
            <SolanaInvestPanel offeringAddress={offering.contractAddress} isPartner={isSocio} isEmissor={isEmissor} />
          )}

          {(offering.issuerSector || offering.issuerBusinessSummary) && (
            <section className="rounded-lg bg-surface p-6 shadow-soft">
              <h2 className="text-lg font-semibold text-ink">{t.publicData.title}</h2>
              <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-ink-muted">{t.publicData.legalName}</dt>
                  <dd className="mt-0.5 text-sm text-ink">{offering.issuerLegalName}</dd>
                </div>
                {offering.issuerSector && (
                  <div>
                    <dt className="text-xs text-ink-muted">{t.publicData.sector}</dt>
                    <dd className="mt-0.5 text-sm text-ink">{offering.issuerSector}</dd>
                  </div>
                )}
              </dl>
              {offering.issuerBusinessSummary && (
                <div className="mt-4">
                  <dt className="text-xs text-ink-muted">{t.publicData.summary}</dt>
                  <dd className="mt-0.5 text-sm leading-relaxed text-ink">{offering.issuerBusinessSummary}</dd>
                </div>
              )}
            </section>
          )}

          <section className="rounded-lg bg-surface p-6 shadow-soft">
            <h2 className="text-lg font-semibold text-ink">{t.documents.title}</h2>
            <ul className="mt-4 flex flex-col gap-2">
              {DEFAULT_DOCUMENTS.map((documento) => (
                <li
                  key={documento}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-2.5 text-sm text-ink-muted"
                >
                  {documento}
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    title={t.documents.comingSoon}
                    className="shrink-0 cursor-not-allowed rounded-full bg-military-100 px-3 py-1 text-xs font-medium text-military"
                  >
                    {t.documents.comingSoon}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-salmon/40 bg-surface p-6 shadow-soft">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-salmon" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-ink">{t.risks.title}</h2>
            </div>
            <ul className="mt-4 flex flex-col gap-2">
              {t.risks.items.map((risk) => (
                <li key={risk} className="flex gap-2 text-sm text-ink-muted">
                  <span aria-hidden="true">•</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}

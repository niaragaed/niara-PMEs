"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { RealOnChainInvestPanel } from "@/components/investir-onchain/RealOnChainInvestPanel";
import { getOnChainAddresses } from "@/lib/web3/addresses";
import { CategoryBadge } from "./CategoryChip";
import { FinancialChart } from "./FinanceiroChart";
import { FundamentalIndicators } from "./FundamentalIndicators";
import { OfferingBanner } from "./OfertaBanner";
import { OrderTicket } from "./OrderTicket";
import { SectionGlow } from "@/components/ui/SectionGlow";
import { CATEGORY_META } from "@/lib/categories";
import { formatBRL } from "@/lib/format";
import { ptBr } from "@/lib/i18n/pt-br";
import { DEFAULT_DOCUMENTS, type Offering } from "@/lib/mock/ofertas";

export function OfferingDetailPage({
  offering,
  bannerUrl = null,
  logoUrl = null,
  onChainIndex = null,
  isPartner: isSocio = false,
}: {
  offering: Offering;
  bannerUrl?: string | null;
  logoUrl?: string | null;
  onChainIndex?: number | null;
  isPartner?: boolean;
}) {
  const [ticketOpen, setTicketOpen] = useState(false);
  const t = ptBr.trade.offering;
  // Fase 4, sub-etapa 5.2: RealOnChainInvestPanel não aceita mais índice, só o par de endereços
  // — esta tela continua só com as 10 ofertas legadas (env var), nunca ofertas self-service (ver
  // PLANO_FASE_3_PUBLICACAO_ONCHAIN.md — /negociar/token-pmes fica fora desta sub-etapa de
  // propósito), então o índice ainda resolve direto contra a lista legada.
  const legacyAddresses = onChainIndex !== null ? (getOnChainAddresses()?.offerings[onChainIndex] ?? null) : null;
  const isOnChain = legacyAddresses !== null;

  return (
    <main className="isolate flex flex-1 flex-col bg-military">
      <SectionGlow />
      <div className="border-b border-panel-border bg-panel px-4 py-2 text-center text-xs text-on-military-muted sm:text-sm">
        <span className="font-semibold text-salmon">{ptBr.common.demo}</span> —{" "}
        {isOnChain ? t.demoBannerOnChain : t.demoBanner}
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <Link
          href={CATEGORY_META[offering.category].href}
          className="text-sm font-medium text-on-military-muted transition-colors hover:text-on-military"
        >
          {t.backToCategory}
        </Link>

        <div className="mt-6 overflow-hidden rounded-lg shadow-soft">
          <OfferingBanner
            bannerUrl={bannerUrl}
            logoUrl={logoUrl}
            tradeName={offering.company.tradeName}
            category={offering.category}
            size="hero"
          />
        </div>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <CategoryBadge category={offering.category} />
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-on-military">{offering.name}</h1>
            <p className="mt-1 text-on-military-muted">{offering.company.tradeName}</p>
          </div>

          {!ticketOpen && !isOnChain && (
            <button
              type="button"
              onClick={() => setTicketOpen(true)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-salmon px-6 py-3 text-sm font-semibold text-on-salmon transition-colors hover:bg-salmon-600"
            >
              {t.tradeButton}
            </button>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className={`flex flex-col gap-6 ${ticketOpen ? "lg:col-span-8" : "lg:col-span-12"}`}>
            {isOnChain && (
              <>
                <p className="flex items-start gap-2 rounded-md border border-salmon/40 bg-salmon/10 px-4 py-3 text-sm text-on-military">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-salmon" aria-hidden="true" />
                  {t.mixedNotice}
                </p>
                {legacyAddresses && (
                  <RealOnChainInvestPanel
                    tokenAddress={legacyAddresses.token}
                    offeringAddress={legacyAddresses.offering}
                    isPartner={isSocio}
                  />
                )}
              </>
            )}

            <section className="rounded-lg bg-surface p-6 shadow-soft">
              <h2 className="text-lg font-semibold text-ink">{t.publicData.title}</h2>
              <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-ink-muted">{t.publicData.legalName}</dt>
                  <dd className="mt-0.5 text-sm text-ink">{offering.company.legalName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">{t.publicData.cnpj}</dt>
                  <dd className="mt-0.5 font-mono text-sm text-ink">{offering.company.cnpj}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">{t.publicData.sector}</dt>
                  <dd className="mt-0.5 text-sm text-ink">{offering.company.sector}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">{t.publicData.location}</dt>
                  <dd className="mt-0.5 text-sm text-ink">{offering.company.location}</dd>
                </div>
              </dl>
              <div className="mt-4">
                <dt className="text-xs text-ink-muted">{t.publicData.summary}</dt>
                <dd className="mt-0.5 text-sm leading-relaxed text-ink">{offering.company.summary}</dd>
              </div>
            </section>

            <section className="rounded-lg bg-surface p-6 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-ink">{t.financial.title}</h2>
                <span className="text-xs font-medium text-ink-muted">{t.financial.note}</span>
              </div>
              <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-ink-muted">{t.financial.annualRevenue}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-ink">{formatBRL(offering.financial.annualRevenue)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">{t.financial.availableCash}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-ink">
                    {formatBRL(offering.financial.availableCash)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">{t.financial.endividamento}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-ink">{formatBRL(offering.financial.endividamento)}</dd>
                </div>
              </dl>
              <div className="mt-6">
                <FinancialChart series={offering.financial.monthlySeries} />
              </div>
            </section>

            <FundamentalIndicators indicators={offering.indicators} />

            {!isOnChain && (
              <section className="rounded-lg bg-surface p-6 shadow-soft">
                <h2 className="text-lg font-semibold text-ink">{t.terms.title}</h2>
                <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-ink-muted">{t.terms.tokenType}</dt>
                    <dd className="mt-0.5 text-sm text-ink">{t.terms.tokenTypeValues[offering.terms.tokenType]}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-muted">{t.terms.fundraisingTarget}</dt>
                    <dd className="mt-0.5 text-sm text-ink">{formatBRL(offering.terms.fundraisingTarget)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-muted">{t.terms.valuePerToken}</dt>
                    <dd className="mt-0.5 text-sm text-ink">{formatBRL(offering.terms.valuePerToken)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-muted">{t.terms.quantityTokens}</dt>
                    <dd className="mt-0.5 text-sm text-ink">
                      {offering.terms.quantityTokens.toLocaleString("pt-BR")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-muted">{t.terms.deadline}</dt>
                    <dd className="mt-0.5 text-sm text-ink">{t.terms.deadlineMonths(offering.terms.deadlineMonths)}</dd>
                  </div>
                </dl>
                <p className="mt-4 text-xs text-ink-muted">{t.terms.note}</p>
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

          {ticketOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-ink/50 lg:hidden"
                onClick={() => setTicketOpen(false)}
                aria-hidden="true"
              />
              <div className="lg:col-span-4">
                <div className="lg:sticky lg:top-24">
                  <OrderTicket offering={offering} onClose={() => setTicketOpen(false)} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

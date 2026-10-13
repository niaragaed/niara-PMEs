import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { RealOnChainInvestPanel } from "@/components/investir-onchain/RealOnChainInvestPanel";
import { SolanaInvestPanel } from "@/components/investir-onchain/SolanaInvestPanel";
import { NetworkBadge } from "@/components/solana/NetworkBadge";
import { CategoryBadge } from "./CategoryChip";
import { OfferingBanner } from "./OfferingBanner";
import { SectionGlow } from "@/components/ui/SectionGlow";
import { CATEGORY_META } from "@/lib/categories";
import type { ConfirmedOnChainOffering } from "@/lib/web3/confirmedOfferings";
import { getDictionary } from "@/lib/i18n/server";

// Detail page for a self-service SME offering (published by the issuer itself via
// OfertaOrquestrador, already confirmed on-chain) — a lean sibling of OfferingDetailPage.tsx, not a
// generalization of it with conditionals. OfferingDetailPage.tsx is built entirely around the
// `Offering` mock type (simulated financials, fictitious fundamental indicators, fixed terms) — a
// self-service offering is a REAL company (data the issuer itself filled in on /perfil), with none
// of that. Forcing those fields here would require making up fictitious indicators/financials
// for a real company — the exact opposite of the project's "nothing simulated may look real" rule.
// That's why this component only shows: the real banner/logo, the issuer's real public data, the
// terms + live investment from the chain (RealOnChainInvestPanel, 100% real), generic placeholder
// documents (the same "Coming soon" list for every offering, not specific to any company) and the
// generic CVM Res. 88 risks (text identical to OfferingDetailPage.tsx's, not fictitious).
export async function SelfServiceOfferingDetailPage({
  offering,
  isPartner = false,
  isIssuer = false,
}: {
  offering: ConfirmedOnChainOffering & { category: NonNullable<ConfirmedOnChainOffering["category"]> };
  isPartner?: boolean;
  /** `true` only when the signed-in issuer (resolveAccount()) owns this specific offering — see
   * [slug]/page.tsx. Unlocks the "Close offering" button for the company, besides the partners (see
   * RealOnChainInvestPanel.tsx). */
  isIssuer?: boolean;
}) {
  const dict = await getDictionary();
  const t = dict.trade.offering;
  const name = offering.issuerTradeName ?? offering.issuerLegalName;

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
          <OfferingBanner bannerUrl={offering.bannerUrl} logoUrl={offering.logoUrl} tradeName={name} category={offering.category} size="hero" />
        </div>

        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={offering.category} />
            <NetworkBadge rede={offering.rede} />
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-on-military">{name}</h1>
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
              isPartner={isPartner}
              isIssuer={isIssuer}
            />
          ) : (
            <SolanaInvestPanel offeringAddress={offering.contractAddress} isPartner={isPartner} isIssuer={isIssuer} />
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
              {dict.common.defaultDocuments.map((doc) => (
                <li
                  key={doc}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-2.5 text-sm text-ink-muted"
                >
                  {doc}
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

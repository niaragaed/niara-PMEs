import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { SolanaInvestPanel } from "@/components/investir-onchain/SolanaInvestPanel";
import { NetworkBadge } from "@/components/solana/NetworkBadge";
import { CategoryBadge } from "./CategoryChip";
import { OfferingBanner } from "./OfferingBanner";
import { DocumentsAndRisks } from "./DocumentsAndRisks";
import { SectionGlow } from "@/components/ui/SectionGlow";
import { CATEGORY_META } from "@/lib/categories";
import { solanaExplorerAccountLink } from "@/lib/solana/config";
import { getDictionary } from "@/lib/i18n/server";

// Detail page for an offering that exists ONLY in the niara-pmes-solana program (no Supabase
// row): the demo offerings created by the niara-pmes-solana admin script. The only company data is
// the name recorded on-chain (fictitious); terms, position and actions come live from the network
// through SolanaInvestPanel (the same one as the Solana self-service offerings). No fictitious
// financials/indicators (OfferingDetailPage): this page doesn't invent data the network doesn't
// have.
export async function SolanaOfferingDetailPage({
  address,
  company,
  isPartner = false,
}: {
  address: string;
  company: string;
  isPartner?: boolean;
}) {
  const dict = await getDictionary();
  const t = dict.trade.offering;

  return (
    <main className="isolate flex flex-1 flex-col bg-military">
      <SectionGlow />
      <div className="border-b border-panel-border bg-panel px-4 py-2 text-center text-xs text-on-military-muted sm:text-sm">
        <span className="font-semibold text-salmon">{dict.common.demo}</span> — {t.demoBannerSolanaProgram}
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <Link
          href={CATEGORY_META.pmes.href}
          className="text-sm font-medium text-on-military-muted transition-colors hover:text-on-military"
        >
          {t.backToCategory}
        </Link>

        <div className="mt-6 overflow-hidden rounded-lg shadow-soft">
          <OfferingBanner bannerUrl={null} logoUrl={null} tradeName={company} category="pmes" size="hero" />
        </div>

        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category="pmes" />
            <NetworkBadge rede="solana-devnet" />
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-on-military">{company}</h1>
          <a
            href={solanaExplorerAccountLink(address)}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block break-all font-mono text-xs text-on-military-muted hover:text-salmon"
          >
            {address}
          </a>
        </div>

        <div className="mt-8 flex flex-col gap-6">
          <p className="flex items-start gap-2 rounded-md border border-salmon/40 bg-salmon/10 px-4 py-3 text-sm text-on-military">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-salmon" aria-hidden="true" />
            {t.solanaProgramNotice}
          </p>

          <SolanaInvestPanel offeringAddress={address} isPartner={isPartner} />

          <DocumentsAndRisks />
        </div>
      </div>
    </main>
  );
}

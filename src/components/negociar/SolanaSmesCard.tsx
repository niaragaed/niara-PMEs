"use client";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { OfferingBanner } from "./OfferingBanner";
import { useDictionary } from "@/lib/i18n/client";
import type { SolanaOfferingState } from "@/lib/solana/program";

// Showcase card for an offering that exists ONLY in the niara-pmes-solana program (devnet), with
// no Supabase row: the demo offerings created by the niara-pmes-solana admin script (fictitious
// company, name recorded on-chain). A sibling of SmesOnChainCard (the 10 legacy Sepolia ones) and
// SelfServiceSmesCard (published by the issuer on the site, Solana included). Every number comes
// from the offering account read from the network on the server (CategoryPage.tsx), never from
// constants, and arrives here already formatted in mBRL (SPL MockBRL, no backing), never "R$".
export function SolanaSmesCard({
  address,
  name,
  maxTargetMbrl,
  pricePerShareMbrl,
  shares,
  state,
}: {
  address: string;
  name: string;
  maxTargetMbrl: string;
  pricePerShareMbrl: string;
  shares: string;
  state: SolanaOfferingState | "Pausada";
}) {
  const dict = useDictionary();
  const t = dict.trade.smesOnChain;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg bg-surface shadow-soft ring-2 ring-salmon">
      <OfferingBanner bannerUrl={null} logoUrl={null} tradeName={name} category="pmes" size="card" />

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-salmon px-3 py-1 text-xs font-semibold text-on-salmon">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {t.solanaBadge}
          </span>
          <span className="inline-flex w-fit items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-ink-muted">
            {t.solanaState[state]}
          </span>
        </div>

        <h3 className="text-sm font-semibold text-ink">{name}</h3>

        <p className="text-xs font-medium italic text-ink-muted">{t.fictitiousCompany}</p>

        <dl className="mt-1 grid grid-cols-3 gap-x-3 gap-y-2">
          <div>
            <dt className="text-xs text-ink-muted">{t.fundraisingTarget}</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">{maxTargetMbrl} mBRL</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">{t.pricePerShare}</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">{pricePerShareMbrl} mBRL</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">{t.shares}</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">{shares}</dd>
          </div>
        </dl>

        <Link
          href={`/negociar/oferta/${address}`}
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-military px-4 py-2 text-sm font-medium text-on-military transition-colors hover:bg-military-600"
        >
          {t.viewOffering}
        </Link>
      </div>
    </div>
  );
}

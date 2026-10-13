"use client";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { OfferingBanner } from "./OfferingBanner";
import { useDictionary } from "@/lib/i18n/client";

// Showcase card for a self-service SME offering (published by the issuer itself via
// OfertaOrquestrador, see CLAUDE.md "/empresa/ofertas screen" → Phase 3) already confirmed
// on-chain — a sibling of PmesOnChainCard.tsx (the 10 legacy ones, fictitious company), but
// deliberately a separate component instead of generalizing the same card with conditionals: the
// company data here is REAL (filled in by the issuer), never the fictitious fields of the
// `Offering` mock (financials, fundamental indicators etc. — see SelfServiceOfferingDetailPage.tsx).
//
// Target/price/shares ARE shown here (unlike an earlier version of this card, which left all three
// out out of caution) — they're real and safe to show without an on-chain read per card:
// hardCapCents/sharePriceCents come from offerings.hard_cap_cents/share_price_cents, the same
// column that confirmPublication()/checkConsistency() (onchain-actions.ts) already check against
// the metaMaxima/precoPorCota mined on-chain — for any offering with sync_status='confirmada',
// this value already matched the chain at confirmation time (and will keep being checked on each
// reconciliation, see "Continuous reconciliation" in CLAUDE.md). 1 MockBRL unit = 1 "real
// equivalent" (UNIT_ON_CHAIN's comment, src/lib/web3/gates.ts) — hence cents/100 → mBRL, the same
// conversion already used in checkConsistency()'s diff messages.
function formatMbrl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export function SelfServiceSmesCard({
  id,
  name,
  sector,
  bannerUrl,
  logoUrl,
  hardCapCents,
  sharePriceCents,
  sharesCount,
  rede: network = "sepolia",
}: {
  id: string;
  name: string;
  sector: string | null;
  bannerUrl: string | null;
  logoUrl: string | null;
  hardCapCents: number;
  sharePriceCents: number | null;
  sharesCount: number | null;
  rede?: "sepolia" | "solana-devnet";
}) {
  const dict = useDictionary();
  const t = dict.trade.smesOnChain;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg bg-surface shadow-soft ring-2 ring-salmon">
      <OfferingBanner bannerUrl={bannerUrl} logoUrl={logoUrl} tradeName={name} category="pmes" size="card" />

      <div className="flex flex-1 flex-col gap-3 p-5">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-salmon px-3 py-1 text-xs font-semibold text-on-salmon">
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {network === "solana-devnet" ? t.solanaBadge : t.badge}
        </span>

        <div>
          <h3 className="text-sm font-semibold text-ink">{name}</h3>
          {sector && <p className="text-xs text-ink-muted">{sector}</p>}
        </div>

        <p className="text-xs font-medium italic text-ink-muted">{t.issuerData}</p>

        <dl className="mt-1 grid grid-cols-3 gap-x-3 gap-y-2">
          <div>
            <dt className="text-xs text-ink-muted">{t.fundraisingTarget}</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">{formatMbrl(hardCapCents)} mBRL</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">{t.pricePerShare}</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">
              {sharePriceCents === null ? "—" : `${formatMbrl(sharePriceCents)} mBRL`}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">{t.shares}</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">
              {sharesCount === null ? "—" : sharesCount.toLocaleString("pt-BR")}
            </dd>
          </div>
        </dl>

        <Link
          href={`/negociar/oferta/${id}`}
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-military px-4 py-2 text-sm font-medium text-on-military transition-colors hover:bg-military-600"
        >
          {t.viewOffering}
        </Link>
      </div>
    </div>
  );
}

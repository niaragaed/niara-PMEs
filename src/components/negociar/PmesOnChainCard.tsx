"use client";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { OfferingBanner } from "./OfferingBanner";
import type { Offering } from "@/lib/mock/offerings";
import {
  ONCHAIN_SMES_AUTHORIZED_SHARES,
  ONCHAIN_SMES_MAX_TARGET_MBRL,
  ONCHAIN_SMES_PRICE_PER_SHARE_MBRL,
} from "@/lib/web3/demoConstants";
import { useDictionary, useLocale } from "@/lib/i18n/client";
import { localize } from "@/lib/i18n/locale";

// Unified card for the 10 SME offerings that have a real, active offering on Sepolia behind
// them — each one is a fictitious demo company (the same content pattern as ShowcaseCard), but
// the investment is real on the blockchain (see OfferingDetailPage.tsx + RealOnChainInvestPanel.tsx).
// The same visual language as RealOfferCard.tsx/the former RealOnChainCard.tsx (solid badge +
// salmon ring) — the real/fictitious distinction is even more critical here than in the other
// cards, because "real" means an actual blockchain transaction, not just a real row in the
// database. The terms preview always uses the contract's fixed constants (never `offering.terms`,
// which is derived from them only for type consistency) and is labeled in mBRL — never "R$",
// since MockBRL is a test currency with no backing.
export function SmesOnChainCard({
  offering,
  bannerUrl,
  logoUrl,
}: {
  offering: Offering;
  bannerUrl: string | null;
  logoUrl: string | null;
}) {
  const dict = useDictionary();
  const locale = useLocale();
  const t = dict.trade.smesOnChain;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg bg-surface shadow-soft ring-2 ring-salmon">
      <OfferingBanner
        bannerUrl={bannerUrl}
        logoUrl={logoUrl}
        tradeName={offering.company.tradeName}
        category={offering.category}
        size="card"
      />

      <div className="flex flex-1 flex-col gap-3 p-5">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-salmon px-3 py-1 text-xs font-semibold text-on-salmon">
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {t.badge}
        </span>

        <div>
          <h3 className="text-sm font-semibold text-ink">{offering.company.tradeName}</h3>
          <p className="text-xs text-ink-muted">{localize(offering.company.sector, locale)}</p>
        </div>

        <p className="text-xs font-medium italic text-ink-muted">{t.fictitiousCompany}</p>

        <dl className="mt-1 grid grid-cols-3 gap-x-3 gap-y-2">
          <div>
            <dt className="text-xs text-ink-muted">{t.fundraisingTarget}</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">{ONCHAIN_SMES_MAX_TARGET_MBRL} mBRL</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">{t.pricePerShare}</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">{ONCHAIN_SMES_PRICE_PER_SHARE_MBRL} mBRL</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">{t.shares}</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">{ONCHAIN_SMES_AUTHORIZED_SHARES}</dd>
          </div>
        </dl>

        <Link
          href={`/negociar/oferta/${offering.slug}`}
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-military px-4 py-2 text-sm font-medium text-on-military transition-colors hover:bg-military-600"
        >
          {t.viewOffering}
        </Link>
      </div>
    </div>
  );
}

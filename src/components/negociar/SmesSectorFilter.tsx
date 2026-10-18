"use client";

import { useMemo, useState } from "react";
import { SmesOnChainCard } from "./SmesOnChainCard";
import { SelfServiceSmesCard } from "./SelfServiceSmesCard";
import type { Offering } from "@/lib/mock/offerings";
import { useDictionary, useLocale } from "@/lib/i18n/client";
import { intlLocale, localize, type Locale } from "@/lib/i18n/locale";

// Two sources in the same showcase (see CLAUDE.md "Phase 4" → SME showcase unification): the 10
// legacy ones (fictitious company, SmesOnChainCard) and the self-service ones already confirmed
// on-chain (the issuer's real data, SelfServiceSmesCard). A union discriminated by `origin`
// instead of forcing both shapes into one type — the self-service data doesn't have (nor should
// it get) the fictitious fields of the `Offering` mock (financials, fundamental indicators etc.).
export type SmesCardData =
  | { origin: "legacy"; offering: Offering; bannerUrl: string | null; logoUrl: string | null }
  | {
      origin: "selfService";
      id: string;
      name: string;
      sector: string | null;
      bannerUrl: string | null;
      logoUrl: string | null;
      hardCapCents: number;
      sharePriceCents: number | null;
      sharesCount: number | null;
      rede: "sepolia" | "solana-devnet";
    };

function getSector(item: SmesCardData, locale: Locale): string | null {
  return item.origin === "legacy" ? localize(item.offering.company.sector, locale) : item.sector;
}

function getKey(item: SmesCardData): string {
  return item.origin === "legacy" ? item.offering.slug : item.id;
}

// Sector filter for the SME Token showcase (legacy + self-service — see CategoryPage.tsx).
// `bannerUrl`/`logoUrl` come already resolved from the server — this component only filters the
// ready list, client-side (few items, not worth a new query). The options always come from the
// sectors that already exist in `items`, never a fixed list — avoids drifting from the real data
// if an offering changes sector in the future. Items without a sector (self-service that didn't
// fill it in) never produce an empty filter button, but still show up in the showcase when no
// filter is selected.
export function SmesSectorFilter({ items }: { items: SmesCardData[] }) {
  const dict = useDictionary();
  const locale = useLocale();
  const t = dict.trade.categoryTemplate.sectorFilter;

  const sectors = useMemo(() => {
    const unique = new Set(
      items.map((item) => getSector(item, locale)).filter((sector): sector is string => Boolean(sector)),
    );
    return Array.from(unique).sort((a, b) => a.localeCompare(b, intlLocale(locale)));
  }, [items, locale]);

  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  const filteredItems = selectedSector ? items.filter((item) => getSector(item, locale) === selectedSector) : items;

  return (
    <div>
      <div role="group" aria-label={t.ariaLabel} className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={selectedSector === null}
          onClick={() => setSelectedSector(null)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            selectedSector === null
              ? "bg-salmon text-on-salmon"
              : "border border-panel-border bg-military-600/40 text-on-military-muted hover:border-salmon hover:text-on-military"
          }`}
        >
          {t.all}
        </button>
        {sectors.map((sector) => (
          <button
            key={sector}
            type="button"
            aria-pressed={selectedSector === sector}
            onClick={() => setSelectedSector(sector)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedSector === sector
                ? "bg-salmon text-on-salmon"
                : "border border-panel-border bg-military-600/40 text-on-military-muted hover:border-salmon hover:text-on-military"
            }`}
          >
            {sector}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map((item) =>
          item.origin === "legacy" ? (
            <SmesOnChainCard key={getKey(item)} offering={item.offering} bannerUrl={item.bannerUrl} logoUrl={item.logoUrl} />
          ) : (
            <SelfServiceSmesCard
              key={getKey(item)}
              id={item.id}
              name={item.name}
              sector={item.sector}
              bannerUrl={item.bannerUrl}
              logoUrl={item.logoUrl}
              hardCapCents={item.hardCapCents}
              sharePriceCents={item.sharePriceCents}
              sharesCount={item.sharesCount}
              rede={item.rede}
            />
          ),
        )}
      </div>
    </div>
  );
}

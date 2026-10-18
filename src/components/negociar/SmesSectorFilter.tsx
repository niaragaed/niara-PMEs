"use client";

import { useMemo, useState } from "react";
import { SmesOnChainCard } from "./SmesOnChainCard";
import { SelfServiceSmesCard } from "./SelfServiceSmesCard";
import { SolanaSmesCard } from "./SolanaSmesCard";
import type { SolanaOfferingState } from "@/lib/solana/program";
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
    }
  | {
      // An offering that exists only in the niara-pmes-solana program (no Supabase row) — see
      // SolanaSmesCard.tsx. Values already formatted on the server (no bigint across the boundary).
      origin: "solana";
      address: string;
      name: string;
      maxTargetMbrl: string;
      pricePerShareMbrl: string;
      shares: string;
      state: SolanaOfferingState | "Pausada";
    };

type Network = "sepolia" | "solana-devnet";

const NETWORKS: Network[] = ["sepolia", "solana-devnet"];

function getSector(item: SmesCardData, locale: Locale): string | null {
  if (item.origin === "legacy") return localize(item.offering.company.sector, locale);
  if (item.origin === "selfService") return item.sector;
  return null;
}

function getNetwork(item: SmesCardData): Network {
  if (item.origin === "legacy") return "sepolia";
  if (item.origin === "selfService") return item.rede;
  return "solana-devnet";
}

function getKey(item: SmesCardData): string {
  if (item.origin === "legacy") return item.offering.slug;
  if (item.origin === "selfService") return item.id;
  return item.address;
}

function filterClass(active: boolean): string {
  return `rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
    active
      ? "bg-salmon text-on-salmon"
      : "border border-panel-border bg-military-600/40 text-on-military-muted hover:border-salmon hover:text-on-military"
  }`;
}

// Network and sector filters for the SME Token showcase (legacy + self-service + offerings that
// exist only in the Solana program — see CategoryPage.tsx). Both filters combine (network AND
// sector).
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
  const tn = dict.trade.categoryTemplate.networkFilter;

  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);

  // Only the sectors of the selected network's offerings (the Solana demo offerings have no sector
  // recorded on-chain — with "Solana Devnet" selected, no empty sector button shows up).
  const sectors = useMemo(() => {
    const inNetwork = selectedNetwork ? items.filter((item) => getNetwork(item) === selectedNetwork) : items;
    const unique = new Set(
      inNetwork.map((item) => getSector(item, locale)).filter((sector): sector is string => Boolean(sector)),
    );
    return Array.from(unique).sort((a, b) => a.localeCompare(b, intlLocale(locale)));
  }, [items, locale, selectedNetwork]);

  function chooseNetwork(network: Network | null) {
    setSelectedNetwork(network);
    setSelectedSector(null);
  }

  const filteredItems = items.filter(
    (item) =>
      (selectedSector === null || getSector(item, locale) === selectedSector) &&
      (selectedNetwork === null || getNetwork(item) === selectedNetwork),
  );

  return (
    <div>
      <div role="group" aria-label={tn.ariaLabel} className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={selectedNetwork === null}
          onClick={() => chooseNetwork(null)}
          className={filterClass(selectedNetwork === null)}
        >
          {tn.all}
        </button>
        {NETWORKS.map((network) => (
          <button
            key={network}
            type="button"
            aria-pressed={selectedNetwork === network}
            onClick={() => chooseNetwork(network)}
            className={filterClass(selectedNetwork === network)}
          >
            {`${network === "solana-devnet" ? dict.solana.networkName : dict.solana.sepoliaNetwork} (${
              items.filter((item) => getNetwork(item) === network).length
            })`}
          </button>
        ))}
      </div>

      {sectors.length > 0 && (
        <div role="group" aria-label={t.ariaLabel} className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={selectedSector === null}
            onClick={() => setSelectedSector(null)}
            className={filterClass(selectedSector === null)}
          >
            {t.all}
          </button>
          {sectors.map((sector) => (
            <button
              key={sector}
              type="button"
              aria-pressed={selectedSector === sector}
              onClick={() => setSelectedSector(sector)}
              className={filterClass(selectedSector === sector)}
            >
              {sector}
            </button>
          ))}
        </div>
      )}

      {filteredItems.length === 0 && <p className="mt-4 text-sm text-on-military-muted">{tn.empty}</p>}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map((item) =>
          item.origin === "legacy" ? (
            <SmesOnChainCard key={getKey(item)} offering={item.offering} bannerUrl={item.bannerUrl} logoUrl={item.logoUrl} />
          ) : item.origin === "solana" ? (
            <SolanaSmesCard
              key={getKey(item)}
              address={item.address}
              name={item.name}
              maxTargetMbrl={item.maxTargetMbrl}
              pricePerShareMbrl={item.pricePerShareMbrl}
              shares={item.shares}
              state={item.state}
            />
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

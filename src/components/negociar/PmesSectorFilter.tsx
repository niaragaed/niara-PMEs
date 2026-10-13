"use client";

import { useMemo, useState } from "react";
import { SmesOnChainCard } from "./PmesOnChainCard";
import { SelfServiceSmesCard } from "./SelfServicePmesCard";
import { pt } from "@/lib/i18n/pt-br";
import type { Offering } from "@/lib/mock/ofertas";

// Duas origens na mesma vitrine (ver CLAUDE.md "Fase 4" → unificação da vitrine PMEs): as 10
// legadas (empresa fictícia, PmesOnChainCard) e as self-service já confirmadas on-chain (dados
// reais do emissor, SelfServicePmesCard). União discriminada por `origin` em vez de forçar os
// dois formatos num tipo só — os dados self-service não têm (nem deveriam ganhar) os campos
// fictícios do mock `Oferta` (financeiro, indicadores fundamentalistas etc.).
export type SmesCardData =
  | { origin: "legado"; offering: Offering; bannerUrl: string | null; logoUrl: string | null }
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

function getSector(item: SmesCardData): string | null {
  return item.origin === "legado" ? item.offering.company.sector : item.sector;
}

function getKey(item: SmesCardData): string {
  return item.origin === "legado" ? item.offering.slug : item.id;
}

// Filtro por setor da vitrine de Token PMEs (legadas + self-service — ver CategoryPage.tsx).
// `bannerUrl`/`logoUrl` já vêm resolvidos do servidor — este componente só filtra a lista já
// pronta, client-side (poucos itens, não justifica nova consulta). As opções vêm sempre dos
// setores que já existem em `items`, nunca uma lista fixa — evita desalinhar do dado real se uma
// oferta trocar de setor no futuro. Itens sem setor (self-service que não preencheu) nunca geram
// um botão de filtro vazio, mas continuam aparecendo na vitrine sem filtro nenhum selecionado.
export function SmesSectorFilter({ items }: { items: SmesCardData[] }) {
  const t = pt.trade.categoryTemplate.sectorFilter;

  const sectors = useMemo(() => {
    const unique = new Set(items.map(getSector).filter((sector): sector is string => Boolean(sector)));
    return Array.from(unique).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [items]);

  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  const filteredItems = selectedSector ? items.filter((item) => getSector(item) === selectedSector) : items;

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
          item.origin === "legado" ? (
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

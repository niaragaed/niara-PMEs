"use client";

import { useMemo, useState } from "react";
import { PmesOnChainCard } from "./PmesOnChainCard";
import { ptBr } from "@/lib/i18n/pt-br";
import type { Oferta } from "@/lib/mock/ofertas";

export type PmesCardData = { oferta: Oferta; bannerUrl: string | null; logoUrl: string | null };

// Filtro por setor da vitrine de Token PMEs (as 10 ofertas reais em
// Sepolia — ver CategoryPage.tsx). `bannerUrl`/`logoUrl` já vêm resolvidos
// do servidor (getOfertaAssetPaths é server-only, fs-based) — este
// componente só filtra a lista já pronta, client-side (10 itens, não
// justifica nova consulta). As opções vêm sempre dos setores que já existem
// em `items`, nunca uma lista fixa — evita desalinhar do dado real se uma
// oferta trocar de setor no futuro.
export function PmesSectorFilter({ items }: { items: PmesCardData[] }) {
  const t = ptBr.negociar.categoriaTemplate.filtroSetor;

  const setores = useMemo(() => {
    const unicos = new Set(items.map((item) => item.oferta.empresa.setor));
    return Array.from(unicos).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [items]);

  const [setorSelecionado, setSetorSelecionado] = useState<string | null>(null);

  const itensFiltrados = setorSelecionado
    ? items.filter((item) => item.oferta.empresa.setor === setorSelecionado)
    : items;

  return (
    <div>
      <div role="group" aria-label={t.ariaLabel} className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={setorSelecionado === null}
          onClick={() => setSetorSelecionado(null)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            setorSelecionado === null
              ? "bg-salmon text-on-salmon"
              : "border border-panel-border bg-military-600/40 text-on-military-muted hover:border-salmon hover:text-on-military"
          }`}
        >
          {t.todos}
        </button>
        {setores.map((setor) => (
          <button
            key={setor}
            type="button"
            aria-pressed={setorSelecionado === setor}
            onClick={() => setSetorSelecionado(setor)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              setorSelecionado === setor
                ? "bg-salmon text-on-salmon"
                : "border border-panel-border bg-military-600/40 text-on-military-muted hover:border-salmon hover:text-on-military"
            }`}
          >
            {setor}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {itensFiltrados.map(({ oferta, bannerUrl, logoUrl }) => (
          <PmesOnChainCard key={oferta.slug} oferta={oferta} bannerUrl={bannerUrl} logoUrl={logoUrl} />
        ))}
      </div>
    </div>
  );
}

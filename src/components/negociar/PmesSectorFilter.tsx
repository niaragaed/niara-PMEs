"use client";

import { useMemo, useState } from "react";
import { PmesOnChainCard } from "./PmesOnChainCard";
import { SelfServicePmesCard } from "./SelfServicePmesCard";
import { ptBr } from "@/lib/i18n/pt-br";
import type { Oferta } from "@/lib/mock/ofertas";

// Duas origens na mesma vitrine (ver CLAUDE.md "Fase 4" → unificação da vitrine PMEs): as 10
// legadas (empresa fictícia, PmesOnChainCard) e as self-service já confirmadas on-chain (dados
// reais do emissor, SelfServicePmesCard). União discriminada por `origin` em vez de forçar os
// dois formatos num tipo só — os dados self-service não têm (nem deveriam ganhar) os campos
// fictícios do mock `Oferta` (financeiro, indicadores fundamentalistas etc.).
export type PmesCardData =
  | { origin: "legado"; oferta: Oferta; bannerUrl: string | null; logoUrl: string | null }
  | {
      origin: "selfService";
      id: string;
      nome: string;
      setor: string | null;
      bannerUrl: string | null;
      logoUrl: string | null;
    };

function getSetor(item: PmesCardData): string | null {
  return item.origin === "legado" ? item.oferta.empresa.setor : item.setor;
}

function getKey(item: PmesCardData): string {
  return item.origin === "legado" ? item.oferta.slug : item.id;
}

// Filtro por setor da vitrine de Token PMEs (legadas + self-service — ver CategoryPage.tsx).
// `bannerUrl`/`logoUrl` já vêm resolvidos do servidor — este componente só filtra a lista já
// pronta, client-side (poucos itens, não justifica nova consulta). As opções vêm sempre dos
// setores que já existem em `items`, nunca uma lista fixa — evita desalinhar do dado real se uma
// oferta trocar de setor no futuro. Itens sem setor (self-service que não preencheu) nunca geram
// um botão de filtro vazio, mas continuam aparecendo na vitrine sem filtro nenhum selecionado.
export function PmesSectorFilter({ items }: { items: PmesCardData[] }) {
  const t = ptBr.negociar.categoriaTemplate.filtroSetor;

  const setores = useMemo(() => {
    const unicos = new Set(items.map(getSetor).filter((setor): setor is string => Boolean(setor)));
    return Array.from(unicos).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [items]);

  const [setorSelecionado, setSetorSelecionado] = useState<string | null>(null);

  const itensFiltrados = setorSelecionado ? items.filter((item) => getSetor(item) === setorSelecionado) : items;

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
        {itensFiltrados.map((item) =>
          item.origin === "legado" ? (
            <PmesOnChainCard key={getKey(item)} oferta={item.oferta} bannerUrl={item.bannerUrl} logoUrl={item.logoUrl} />
          ) : (
            <SelfServicePmesCard
              key={getKey(item)}
              id={item.id}
              nome={item.nome}
              setor={item.setor}
              bannerUrl={item.bannerUrl}
              logoUrl={item.logoUrl}
            />
          ),
        )}
      </div>
    </div>
  );
}

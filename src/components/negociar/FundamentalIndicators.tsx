"use client";

import { useState } from "react";
import { IndicatorHelp } from "./IndicatorHelp";
import { ptBr } from "@/lib/i18n/pt-br";
import type { IndicadoresFundamentalistas } from "@/lib/mock/ofertas";

const GRUPOS = ["valuation", "eficiencia", "rentabilidade", "dividendos", "endividamento", "crescimento"] as const;

const numberFormatter = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatIndicador(valor: number, unidade: "numero" | "percentual"): string {
  const formatted = numberFormatter.format(valor);
  return unidade === "percentual" ? `${formatted}%` : formatted;
}

export function FundamentalIndicators({ indicadores }: { indicadores: IndicadoresFundamentalistas }) {
  const t = ptBr.negociar.oferta.indicadores;
  // Só um popover de explicação aberto por vez, entre todos os grupos/cards.
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <section className="rounded-lg bg-surface p-6 shadow-soft">
      <h2 className="text-lg font-semibold text-ink">{t.title}</h2>
      <p className="mt-1 text-xs font-medium text-ink-muted">{t.nota}</p>

      <div className="mt-6 flex flex-col gap-6">
        {GRUPOS.map((grupoId) => {
          const grupo = t.grupos[grupoId];
          const valores = indicadores[grupoId] as Record<string, number>;
          const itens = Object.entries(grupo.itens) as [string, { nome: string; unidade: "numero" | "percentual"; explicacao: string }][];

          return (
            <div key={grupoId}>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <span className="h-4 w-1 rounded-full bg-salmon" aria-hidden="true" />
                {grupo.label}
              </h3>
              <div className="mt-3 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
                {itens.map(([itemKey, item]) => {
                  const uniqueId = `${grupoId}-${itemKey}`;
                  return (
                    <div key={uniqueId} className="rounded-md border border-border bg-surface-alt p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-ink-muted">{item.nome}</span>
                        <IndicatorHelp
                          nome={item.nome}
                          explicacao={item.explicacao}
                          isOpen={openKey === uniqueId}
                          onOpenChange={(open) => setOpenKey(open ? uniqueId : null)}
                        />
                      </div>
                      <p className="mt-1 text-sm font-semibold text-ink">
                        {formatIndicador(valores[itemKey], item.unidade)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { IndicatorHelp } from "./IndicatorHelp";
import type { FundamentalIndicatorValues } from "@/lib/mock/ofertas";
import { useDictionary } from "@/lib/i18n/client";

const GROUPS = ["valuation", "eficiencia", "rentabilidade", "dividendos", "endividamento", "crescimento"] as const;

const numberFormatter = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatIndicator(value: number, unit: "number" | "percent"): string {
  const formatted = numberFormatter.format(value);
  return unit === "percent" ? `${formatted}%` : formatted;
}

export function FundamentalIndicators({ indicators }: { indicators: FundamentalIndicatorValues }) {
  const dict = useDictionary();
  const t = dict.trade.offering.indicators;
  // Só um popover de explicação aberto por vez, entre todos os grupos/cards.
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <section className="rounded-lg bg-surface p-6 shadow-soft">
      <h2 className="text-lg font-semibold text-ink">{t.title}</h2>
      <p className="mt-1 text-xs font-medium text-ink-muted">{t.note}</p>

      <div className="mt-6 flex flex-col gap-6">
        {GROUPS.map((groupId) => {
          const group = t.groups[groupId];
          const values = indicators[groupId] as Record<string, number>;
          const items = Object.entries(group.items) as [string, { name: string; unit: "number" | "percent"; explanation: string }][];

          return (
            <div key={groupId}>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <span className="h-4 w-1 rounded-full bg-salmon" aria-hidden="true" />
                {group.label}
              </h3>
              <div className="mt-3 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
                {items.map(([itemKey, item]) => {
                  const uniqueId = `${groupId}-${itemKey}`;
                  return (
                    <div key={uniqueId} className="rounded-md border border-border bg-surface-alt p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-ink-muted">{item.name}</span>
                        <IndicatorHelp
                          name={item.name}
                          explanation={item.explanation}
                          isOpen={openKey === uniqueId}
                          onOpenChange={(open) => setOpenKey(open ? uniqueId : null)}
                        />
                      </div>
                      <p className="mt-1 text-sm font-semibold text-ink">
                        {formatIndicator(values[itemKey], item.unit)}
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

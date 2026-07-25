"use client";

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { computeAllocation, type AllocationSlice, type AllocationView } from "@/lib/ativos/derive";
import { formatBRL, formatPercent } from "@/lib/format";
import { ptBr } from "@/lib/i18n/pt-br";
import { MOCK_POSITIONS } from "@/lib/mock/ativos";

const VIEWS: { key: AllocationView; label: string }[] = [
  { key: "classe", label: ptBr.ativos.alocacao.viewClasse },
  { key: "ativo", label: ptBr.ativos.alocacao.viewAtivo },
  { key: "setor", label: ptBr.ativos.alocacao.viewSetor },
];

type DonutTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: AllocationSlice }>;
};

function DonutTooltip({ active, payload }: DonutTooltipProps) {
  const slice = payload?.[0]?.payload;
  if (!active || !slice) return null;

  return (
    <div className="rounded-md border border-panel-border bg-military px-3 py-2 text-xs shadow-soft-lg">
      <p className="font-medium text-on-military">{slice.label}</p>
      <p className="text-on-military-muted">
        {formatPercent(slice.pct)} — {formatBRL(slice.value)}
      </p>
    </div>
  );
}

export function AllocationDonut() {
  const [view, setView] = useState<AllocationView>("classe");
  const slices = computeAllocation(MOCK_POSITIONS, view, ptBr.ativos.categorias, ptBr.ativos.regioes);

  return (
    <div className="rounded-lg border border-panel-border bg-panel p-5">
      <h3 className="text-sm font-semibold text-on-military">{ptBr.ativos.alocacao.title}</h3>

      <div role="tablist" aria-label={ptBr.ativos.alocacao.title} className="mt-3 inline-flex flex-wrap gap-1 rounded-full bg-military-600/40 p-1">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            role="tab"
            aria-selected={view === v.key}
            onClick={() => setView(v.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              view === v.key ? "bg-salmon text-on-salmon" : "text-on-military-muted hover:text-on-military"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="mt-4 @container">
        <div className="flex flex-col gap-4 @md:flex-row @md:items-center">
          <div className="mx-auto h-48 w-48 shrink-0" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="label"
                  innerRadius="60%"
                  outerRadius="100%"
                  paddingAngle={2}
                  stroke="none"
                >
                  {slices.map((slice) => (
                    <Cell key={slice.key} fill={slice.colorVar} />
                  ))}
                </Pie>
                <Tooltip content={(props) => <DonutTooltip {...props} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="flex-1 space-y-2 text-sm">
            {slices.map((slice) => (
              <li key={slice.key} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-on-military-muted">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: slice.colorVar }}
                    aria-hidden="true"
                  />
                  {slice.label}
                </span>
                <span className="shrink-0 text-right text-on-military">
                  {formatPercent(slice.pct)} — {formatBRL(slice.value)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

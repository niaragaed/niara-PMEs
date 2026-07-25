"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatBRL } from "@/lib/format";
import { ptBr } from "@/lib/i18n/pt-br";
import { MOCK_EVOLUTION } from "@/lib/mock/ativos";

type TooltipEntry = {
  value?: unknown;
  name?: string | number;
};

// Tipo próprio em vez dos genéricos do Recharts (`TooltipProps<...>`) —
// evita conflitos de variância entre o tipo esperado por `content` e o
// componente customizado.
type ChartTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: ReadonlyArray<TooltipEntry>;
};

function ChartTooltip({ active, label, payload }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-md border border-panel-border bg-military px-3 py-2 text-xs shadow-soft-lg">
      <p className="mb-1 font-medium text-on-military">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-on-military-muted">
          {entry.name}: <span className="text-on-military">{formatBRL(Number(entry.value ?? 0))}</span>
        </p>
      ))}
    </div>
  );
}

export function PortfolioEvolutionChart() {
  return (
    <div className="rounded-lg border border-panel-border bg-panel p-5">
      <h3 className="text-sm font-semibold text-on-military">{ptBr.ativos.evolucao.title}</h3>

      <div className="mt-4 h-72" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...MOCK_EVOLUTION]} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-panel-border)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: "var(--color-on-military-muted)", fontSize: 12 }}
              axisLine={{ stroke: "var(--color-panel-border)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--color-on-military-muted)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => formatBRL(value)}
              width={90}
            />
            <Tooltip content={(props) => <ChartTooltip {...props} />} cursor={{ fill: "var(--color-panel-border)" }} />
            <Legend formatter={(value: string) => <span className="text-on-military-muted">{value}</span>} />
            <Bar
              dataKey="investido"
              name={ptBr.ativos.evolucao.seriesInvestido}
              stackId="portfolio"
              fill="var(--color-chart-pmes)"
            />
            <Bar
              dataKey="ganho"
              name={ptBr.ativos.evolucao.seriesGanho}
              stackId="portfolio"
              fill="var(--color-value-positive)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-xs text-on-military-muted">{ptBr.ativos.evolucao.description}</p>
    </div>
  );
}

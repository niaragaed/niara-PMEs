"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatBRL } from "@/lib/format";
import { ptBr } from "@/lib/i18n/pt-br";
import type { FinanceiroMensal } from "@/lib/mock/ofertas";

type TooltipEntry = { value?: unknown; name?: string | number };

// Tipo próprio em vez dos genéricos do Recharts — mesmo padrão de
// PortfolioEvolutionChart.tsx (evita conflito de variância na prop `content`).
type ChartTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: ReadonlyArray<TooltipEntry>;
};

function ChartTooltip({ active, label, payload }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-soft-lg">
      <p className="mb-1 font-medium text-ink">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-ink-muted">
          {entry.name}: <span className="text-ink">{formatBRL(Number(entry.value ?? 0))}</span>
        </p>
      ))}
    </div>
  );
}

export function FinanceiroChart({ serie }: { serie: FinanceiroMensal[] }) {
  const t = ptBr.negociar.oferta.financeiro;

  return (
    <div>
      <div className="h-56" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={serie} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="mes"
              tick={{ fill: "var(--color-ink-muted)", fontSize: 12 }}
              axisLine={{ stroke: "var(--color-border)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--color-ink-muted)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => formatBRL(value)}
              width={90}
            />
            <Tooltip content={(props) => <ChartTooltip {...props} />} cursor={{ stroke: "var(--color-border)" }} />
            <Legend formatter={(value: string) => <span className="text-ink-muted">{value}</span>} />
            <Line
              type="monotone"
              dataKey="receita"
              name={t.seriesReceita}
              stroke="var(--color-salmon)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="caixa"
              name={t.seriesCaixa}
              stroke="var(--color-military)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-xs text-ink-muted">{t.chartDescription}</p>
    </div>
  );
}

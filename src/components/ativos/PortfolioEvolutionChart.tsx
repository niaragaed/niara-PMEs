"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatBRL } from "@/lib/format";
import { MOCK_EVOLUTION } from "@/lib/mock/ativos";
import { useDictionary, useLocale } from "@/lib/i18n/client";
import { intlLocale } from "@/lib/i18n/locale";

type TooltipEntry = {
  value?: unknown;
  name?: string | number;
};

// Own type instead of Recharts' generics (`TooltipProps<...>`) —
// avoids variance conflicts between the type expected by `content` and the
// custom component.
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
  const dict = useDictionary();
  const locale = useLocale();
  const monthName = new Intl.DateTimeFormat(intlLocale(locale), { month: "short", timeZone: "UTC" });
  const data = MOCK_EVOLUTION.map((point) => ({ ...point, month: monthName.format(new Date(Date.UTC(2026, point.month, 1))) }));
  return (
    <div className="rounded-lg border border-panel-border bg-panel p-5">
      <h3 className="text-sm font-semibold text-on-military">{dict.assets.evolution.title}</h3>

      <div className="mt-4 h-72" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
              dataKey="invested"
              name={dict.assets.evolution.investedSeries}
              stackId="portfolio"
              fill="var(--color-chart-pmes)"
            />
            <Bar
              dataKey="gain"
              name={dict.assets.evolution.gainSeries}
              stackId="portfolio"
              fill="var(--color-value-positive)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-xs text-on-military-muted">{dict.assets.evolution.description}</p>
    </div>
  );
}

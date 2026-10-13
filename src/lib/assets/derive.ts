import { localize, type Locale } from "@/lib/i18n/locale";
import type { Position, Region, TokenCategory } from "@/lib/mock/assets";

export type AllocationView = "class" | "asset" | "sector";

export type AllocationSlice = {
  key: string;
  label: string;
  value: number;
  pct: number;
  colorVar: string;
};

export type PortfolioTotals = {
  totalEquity: number;
  investedValue: number;
  profitLoss: number;
  returnPercent: number;
};

export const CATEGORY_COLOR_VAR: Record<TokenCategory, string> = {
  pmes: "var(--color-chart-pmes)",
  agro: "var(--color-chart-agro)",
  imobiliario: "var(--color-chart-imobiliario)",
  auto: "var(--color-chart-auto)",
  divida: "var(--color-chart-divida)",
};

const REGION_COLOR_VAR: Record<Region, string> = {
  sudeste: "var(--color-chart-pmes)",
  sul: "var(--color-chart-imobiliario)",
  nordeste: "var(--color-chart-divida)",
  "centro-oeste": "var(--color-chart-agro)",
};

export function computeTotals(positions: Position[]): PortfolioTotals {
  const totalEquity = positions.reduce((sum, p) => sum + p.currentValue, 0);
  const investedValue = positions.reduce((sum, p) => sum + p.shares * p.averagePrice, 0);
  const profitLoss = totalEquity - investedValue;
  const returnPercent = investedValue === 0 ? 0 : (profitLoss / investedValue) * 100;

  return { totalEquity, investedValue, profitLoss, returnPercent };
}

export function computeAllocation(
  positions: Position[],
  view: AllocationView,
  categoryLabels: Record<TokenCategory, string>,
  regionLabels: Record<Region, string>,
  locale: Locale,
): AllocationSlice[] {
  const total = positions.reduce((sum, p) => sum + p.currentValue, 0);

  if (view === "asset") {
    return positions
      .map((p) => ({
        key: p.symbol,
        label: localize(p.name, locale),
        value: p.currentValue,
        pct: total === 0 ? 0 : (p.currentValue / total) * 100,
        colorVar: CATEGORY_COLOR_VAR[p.category],
      }))
      .sort((a, b) => b.value - a.value);
  }

  const groupKey = view === "class" ? "category" : "region";
  const totalsByKey = new Map<string, number>();

  for (const position of positions) {
    const key = position[groupKey];
    totalsByKey.set(key, (totalsByKey.get(key) ?? 0) + position.currentValue);
  }

  return Array.from(totalsByKey.entries())
    .map(([key, value]) => ({
      key,
      label: view === "class" ? categoryLabels[key as TokenCategory] : regionLabels[key as Region],
      value,
      pct: total === 0 ? 0 : (value / total) * 100,
      colorVar: view === "class" ? CATEGORY_COLOR_VAR[key as TokenCategory] : REGION_COLOR_VAR[key as Region],
    }))
    .sort((a, b) => b.value - a.value);
}

import type { Position, Region, TokenCategory } from "@/lib/mock/ativos";

export type AllocationView = "classe" | "ativo" | "setor";

export type AllocationSlice = {
  key: string;
  label: string;
  value: number;
  pct: number;
  colorVar: string;
};

export type PortfolioTotals = {
  patrimonioTotal: number;
  valorInvestido: number;
  lucroPrejuizo: number;
  retornoPercent: number;
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
  const patrimonioTotal = positions.reduce((sum, p) => sum + p.valorAtual, 0);
  const valorInvestido = positions.reduce((sum, p) => sum + p.cotas * p.precoMedio, 0);
  const lucroPrejuizo = patrimonioTotal - valorInvestido;
  const retornoPercent = valorInvestido === 0 ? 0 : (lucroPrejuizo / valorInvestido) * 100;

  return { patrimonioTotal, valorInvestido, lucroPrejuizo, retornoPercent };
}

export function computeAllocation(
  positions: Position[],
  view: AllocationView,
  categoryLabels: Record<TokenCategory, string>,
  regionLabels: Record<Region, string>,
): AllocationSlice[] {
  const total = positions.reduce((sum, p) => sum + p.valorAtual, 0);

  if (view === "ativo") {
    return positions
      .map((p) => ({
        key: p.symbol,
        label: p.name,
        value: p.valorAtual,
        pct: total === 0 ? 0 : (p.valorAtual / total) * 100,
        colorVar: CATEGORY_COLOR_VAR[p.category],
      }))
      .sort((a, b) => b.value - a.value);
  }

  const groupKey = view === "classe" ? "category" : "region";
  const totalsByKey = new Map<string, number>();

  for (const position of positions) {
    const key = position[groupKey];
    totalsByKey.set(key, (totalsByKey.get(key) ?? 0) + position.valorAtual);
  }

  return Array.from(totalsByKey.entries())
    .map(([key, value]) => ({
      key,
      label: view === "classe" ? categoryLabels[key as TokenCategory] : regionLabels[key as Region],
      value,
      pct: total === 0 ? 0 : (value / total) * 100,
      colorVar: view === "classe" ? CATEGORY_COLOR_VAR[key as TokenCategory] : REGION_COLOR_VAR[key as Region],
    }))
    .sort((a, b) => b.value - a.value);
}

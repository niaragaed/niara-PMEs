import { computeTotals } from "@/lib/ativos/derive";
import { formatBRL, formatSignedBRL, formatSignedPercent } from "@/lib/format";
import { ptBr } from "@/lib/i18n/pt-br";
import { MOCK_POSITIONS } from "@/lib/mock/ativos";

export function PortfolioSummary() {
  const { patrimonioTotal, valorInvestido, lucroPrejuizo, retornoPercent } = computeTotals(MOCK_POSITIONS);
  const valueClassName = lucroPrejuizo >= 0 ? "text-value-positive" : "text-value-negative";

  const cards: { label: string; value: string; valueClassName?: string; note?: string }[] = [
    { label: ptBr.ativos.kpis.patrimonioTotal, value: formatBRL(patrimonioTotal) },
    { label: ptBr.ativos.kpis.valorInvestido, value: formatBRL(valorInvestido) },
    { label: ptBr.ativos.kpis.lucroPrejuizo, value: formatSignedBRL(lucroPrejuizo), valueClassName },
    {
      label: ptBr.ativos.kpis.retornoPeriodo,
      value: formatSignedPercent(retornoPercent),
      valueClassName,
      note: ptBr.ativos.kpis.retornoNota,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border border-panel-border bg-panel p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-on-military-muted">{card.label}</p>
          <p className={`mt-2 text-2xl font-semibold ${card.valueClassName ?? "text-on-military"}`}>
            {card.value}
          </p>
          {card.note ? <p className="mt-1 text-xs text-on-military-muted">{card.note}</p> : null}
        </div>
      ))}
    </div>
  );
}

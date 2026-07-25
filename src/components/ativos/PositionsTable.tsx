import { CATEGORY_COLOR_VAR } from "@/lib/ativos/derive";
import { formatBRL, formatSignedPercent } from "@/lib/format";
import { ptBr } from "@/lib/i18n/pt-br";
import { MOCK_POSITIONS, type Position } from "@/lib/mock/ativos";

function variacaoPercent(position: Position): number {
  const investido = position.cotas * position.precoMedio;
  return investido === 0 ? 0 : ((position.valorAtual - investido) / investido) * 100;
}

export function PositionsTable() {
  return (
    <div className="overflow-x-auto rounded-lg border border-panel-border bg-panel">
      <table className="w-full min-w-[640px] text-left text-sm">
        <caption className="sr-only">{ptBr.ativos.tabela.title}</caption>
        <thead>
          <tr className="border-b border-panel-border text-xs uppercase tracking-wide text-on-military-muted">
            <th scope="col" className="px-4 py-3 font-medium">
              {ptBr.ativos.tabela.colAtivo}
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              {ptBr.ativos.tabela.colCategoria}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {ptBr.ativos.tabela.colCotas}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {ptBr.ativos.tabela.colPrecoMedio}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {ptBr.ativos.tabela.colValorAtual}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {ptBr.ativos.tabela.colVariacao}
            </th>
          </tr>
        </thead>
        <tbody>
          {MOCK_POSITIONS.map((position) => {
            const variacao = variacaoPercent(position);
            const valueClassName = variacao >= 0 ? "text-value-positive" : "text-value-negative";

            return (
              <tr key={position.symbol} className="border-b border-panel-border last:border-0">
                <td className="px-4 py-3 font-medium text-on-military">{position.name}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-on-military-muted">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLOR_VAR[position.category] }}
                      aria-hidden="true"
                    />
                    {ptBr.ativos.categorias[position.category]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-on-military">{position.cotas}</td>
                <td className="px-4 py-3 text-right text-on-military">{formatBRL(position.precoMedio)}</td>
                <td className="px-4 py-3 text-right text-on-military">{formatBRL(position.valorAtual)}</td>
                <td className={`px-4 py-3 text-right font-medium ${valueClassName}`}>
                  {formatSignedPercent(variacao)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

import { CATEGORY_COLOR_VAR } from "@/lib/ativos/derive";
import { formatBRL, formatSignedPercent } from "@/lib/format";
import { pt } from "@/lib/i18n/pt-br";
import { MOCK_POSITIONS, type Position } from "@/lib/mock/ativos";

function changePercent(position: Position): number {
  const invested = position.shares * position.averagePrice;
  return invested === 0 ? 0 : ((position.currentValue - invested) / invested) * 100;
}

export function PositionsTable() {
  return (
    <div className="overflow-x-auto rounded-lg border border-panel-border bg-panel">
      <table className="w-full min-w-[640px] text-left text-sm">
        <caption className="sr-only">{pt.assets.table.title}</caption>
        <thead>
          <tr className="border-b border-panel-border text-xs uppercase tracking-wide text-on-military-muted">
            <th scope="col" className="px-4 py-3 font-medium">
              {pt.assets.table.colAsset}
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              {pt.assets.table.colCategory}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {pt.assets.table.colShares}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {pt.assets.table.colAveragePrice}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {pt.assets.table.colCurrentValue}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {pt.assets.table.colChange}
            </th>
          </tr>
        </thead>
        <tbody>
          {MOCK_POSITIONS.map((position) => {
            const change = changePercent(position);
            const valueClassName = change >= 0 ? "text-value-positive" : "text-value-negative";

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
                    {pt.assets.categories[position.category]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-on-military">{position.shares}</td>
                <td className="px-4 py-3 text-right text-on-military">{formatBRL(position.averagePrice)}</td>
                <td className="px-4 py-3 text-right text-on-military">{formatBRL(position.currentValue)}</td>
                <td className={`px-4 py-3 text-right font-medium ${valueClassName}`}>
                  {formatSignedPercent(change)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

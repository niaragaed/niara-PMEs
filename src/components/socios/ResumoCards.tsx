import { formatUnits } from "viem";
import { formatBRL } from "@/lib/format";
import { pt } from "@/lib/i18n/pt-br";
import type { TransactionsSummary } from "@/lib/socios/movimentacoes";
import { KpiCard } from "./SociosDashboard";

function formatToken(valueWei: bigint, decimals: number, symbol: string): string {
  return `${Number(formatUnits(valueWei, decimals)).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${symbol}`;
}

// Resumo agregado acima da timeline única — os mesmos números que antes viviam em duas seções
// separadas (resumo on-chain + resumo mock) agora ficam lado a lado, já que a tabela abaixo não
// separa mais por origem.
export function SummaryCards({ summary }: { summary: TransactionsSummary }) {
  const t = pt.partners;
  const onChain = summary.onChain;
  const singleFeeBps =
    onChain && onChain.taxaBpsPorOferta.every((bps) => bps === onChain.taxaBpsPorOferta[0])
      ? onChain.taxaBpsPorOferta[0]
      : null;

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-on-military">{t.transactions.summaryTitle}</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {onChain ? (
          <>
            <KpiCard
              label={t.realSummary.totalRaised}
              value={formatToken(onChain.totalArrecadadoWei, onChain.mockBrlDecimals, onChain.mockBrlSymbol)}
              note={t.origin.real}
            />
            <KpiCard label={t.realSummary.uniqueWallets} value={String(onChain.carteirasUnicas)} note={t.origin.real} />
            <KpiCard
              label={t.realSummary.configuredRate}
              value={singleFeeBps === 0 ? "0%" : singleFeeBps === null ? t.realSummary.variableFee : `${(singleFeeBps / 100).toFixed(2)}%`}
              note={singleFeeBps === 0 ? t.realSummary.zeroFeeNote : t.origin.real}
            />
            <KpiCard
              label={t.realSummary.feeRevenue}
              value={formatToken(onChain.taxaRecebidaWei, onChain.mockBrlDecimals, onChain.mockBrlSymbol)}
              note={t.realSummary.feeRevenueNote}
            />
          </>
        ) : (
          <div className="rounded-lg border border-panel-border bg-panel p-5 text-sm text-on-military-muted sm:col-span-3">
            {t.realSummary.notConfigured}
          </div>
        )}
        <KpiCard
          label={t.mockSummary.totalPaid}
          value={formatBRL(summary.totalAportesMockCents / 100)}
          note={t.origin.mock}
        />
        <KpiCard
          label={t.mockSummary.uniqueInvestors}
          value={String(summary.investidoresUnicosMock)}
          note={t.origin.mock}
        />
      </div>
    </section>
  );
}

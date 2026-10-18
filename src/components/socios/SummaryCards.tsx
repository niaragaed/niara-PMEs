import { formatUnits } from "viem";
import { formatBRL } from "@/lib/format";
import type { TransactionsSummary } from "@/lib/partners/transactions";
import { KpiCard } from "./PartnersDashboard";
import { SOLANA_MBRL_DECIMALS } from "@/lib/solana/config";
import { getDictionary } from "@/lib/i18n/server";

function formatToken(valueWei: bigint, decimals: number, symbol: string): string {
  return `${Number(formatUnits(valueWei, decimals)).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${symbol}`;
}

// Aggregate summary above the single timeline — the same numbers that used to live in two separate
// sections (on-chain summary + mock summary) now sit side by side, since the table below no
// longer splits by origin.
export async function SummaryCards({ summary }: { summary: TransactionsSummary }) {
  const dict = await getDictionary();
  const t = dict.partners;
  const onChain = summary.onChain;
  const singleFeeBps =
    onChain && onChain.feeBpsByOffering.every((bps) => bps === onChain.feeBpsByOffering[0])
      ? onChain.feeBpsByOffering[0]
      : null;

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-on-military">{t.transactions.summaryTitle}</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {onChain ? (
          <>
            <KpiCard
              label={t.realSummary.totalRaised}
              value={formatToken(onChain.totalRaisedWei, onChain.mockBrlDecimals, onChain.mockBrlSymbol)}
              note={t.origin.real}
            />
            <KpiCard label={t.realSummary.uniqueWallets} value={String(onChain.uniqueWallets)} note={t.origin.real} />
            <KpiCard
              label={t.realSummary.configuredRate}
              value={singleFeeBps === 0 ? "0%" : singleFeeBps === null ? t.realSummary.variableFee : `${(singleFeeBps / 100).toFixed(2)}%`}
              note={singleFeeBps === 0 ? t.realSummary.zeroFeeNote : t.origin.real}
            />
            <KpiCard
              label={t.realSummary.feeRevenue}
              value={formatToken(onChain.feeReceivedWei, onChain.mockBrlDecimals, onChain.mockBrlSymbol)}
              note={t.realSummary.feeRevenueNote}
            />
          </>
        ) : (
          <div className="rounded-lg border border-panel-border bg-panel p-5 text-sm text-on-military-muted sm:col-span-3">
            {t.realSummary.notConfigured}
          </div>
        )}
        {summary.solana ? (
          <>
            <KpiCard
              label={t.solana.totalInvested}
              value={formatToken(summary.solana.totalInvested, SOLANA_MBRL_DECIMALS, "mBRL")}
              note={t.solana.note}
            />
            <KpiCard label={t.solana.uniqueWallets} value={String(summary.solana.uniqueWallets)} note={t.solana.note} />
            <KpiCard
              label={t.solana.offeringsLabel}
              value={t.solana.offerings(summary.solana.offerings, summary.solana.openOfferings)}
              note={t.solana.note}
            />
            <KpiCard
              label={t.solana.feeRevenue}
              value={formatToken(summary.solana.feesCollected, SOLANA_MBRL_DECIMALS, "mBRL")}
              note={t.solana.feeRevenueNote}
            />
          </>
        ) : (
          <div className="rounded-lg border border-panel-border bg-panel p-5 text-sm text-on-military-muted sm:col-span-2">
            {t.solana.unavailable}
          </div>
        )}
        <KpiCard
          label={t.mockSummary.totalPaid}
          value={formatBRL(summary.totalMockInvestmentsCents / 100)}
          note={t.origin.mock}
        />
        <KpiCard
          label={t.mockSummary.uniqueInvestors}
          value={String(summary.uniqueMockInvestors)}
          note={t.origin.mock}
        />
      </div>
    </section>
  );
}

import { formatUnits } from "viem";
import { ExternalLink } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { ptBr } from "@/lib/i18n/pt-br";
import type { EventoOnChain, ResumoOnChain } from "@/lib/web3/events";
import { OrigemBadge, KpiCard, formatUnixSeconds, truncateAddress } from "./SociosDashboard";

function formatToken(valorWei: bigint | null, decimals: number, symbol: string): string {
  if (valorWei === null) return "—";
  return `${Number(formatUnits(valorWei, decimals)).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${symbol}`;
}

// Painéis que dependem de leitura on-chain (Sepolia) — separados de SociosDashboard para
// poderem ficar atrás de um <Suspense> em page.tsx: sem isso, a renderização inteira de /socios
// (inclusive o login que redireciona pra cá) ficava presa esperando o getLogs terminar, que sem
// uma RPC dedicada (NEXT_PUBLIC_SEPOLIA_RPC_URL) pode demorar muito no RPC público rate-limited.
export function RealOnChainPanels({
  eventosOnChain,
  resumoOnChain,
}: {
  eventosOnChain: EventoOnChain[];
  resumoOnChain: ResumoOnChain | null;
}) {
  const t = ptBr.socios;
  const taxaBpsUnica = resumoOnChain?.taxaBpsPorOferta.every((bps) => bps === resumoOnChain.taxaBpsPorOferta[0])
    ? resumoOnChain.taxaBpsPorOferta[0]
    : null;

  return (
    <>
      <section className="mt-8">
        <div className="flex items-center gap-2">
          <OrigemBadge real />
          <h2 className="text-lg font-semibold text-on-military">{t.resumoReal.title}</h2>
        </div>
        {resumoOnChain ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label={t.resumoReal.totalArrecadado}
              value={formatToken(resumoOnChain.totalArrecadadoWei, resumoOnChain.mockBrlDecimals, resumoOnChain.mockBrlSymbol)}
            />
            <KpiCard label={t.resumoReal.carteirasUnicas} value={String(resumoOnChain.carteirasUnicas)} />
            <KpiCard
              label={t.resumoReal.taxaRecebida}
              value={taxaBpsUnica === 0 ? formatBRL(0) : taxaBpsUnica === null ? t.resumoReal.taxaVariavel : `${(taxaBpsUnica / 100).toFixed(2)}%`}
              note={taxaBpsUnica === 0 ? t.resumoReal.taxaZeradaNota : undefined}
            />
            <KpiCard label={t.resumoReal.ofertasConfiguradas} value={String(resumoOnChain.taxaBpsPorOferta.length)} />
          </div>
        ) : (
          <p className="mt-4 rounded-lg border border-panel-border bg-panel p-5 text-sm text-on-military-muted">
            {t.resumoReal.naoConfigurado}
          </p>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-center gap-2">
          <OrigemBadge real />
          <h2 className="text-lg font-semibold text-on-military">{t.tabelaReal.title}</h2>
        </div>
        <div className="mt-4 overflow-x-auto rounded-lg border border-panel-border bg-panel">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-panel-border text-xs uppercase tracking-wide text-on-military-muted">
                <th className="px-4 py-3">{t.tabelaReal.colTipo}</th>
                <th className="px-4 py-3">{t.tabelaReal.colInvestidor}</th>
                <th className="px-4 py-3">{t.tabelaReal.colValor}</th>
                <th className="px-4 py-3">{t.tabelaReal.colData}</th>
                <th className="px-4 py-3">{t.tabelaReal.colTx}</th>
              </tr>
            </thead>
            <tbody>
              {eventosOnChain.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-on-military-muted">
                    {t.tabelaReal.vazio}
                  </td>
                </tr>
              ) : (
                eventosOnChain.map((evento, index) => (
                  <tr key={`${evento.txHash}-${index}`} className="border-b border-panel-border last:border-0">
                    <td className="px-4 py-3 text-on-military">{t.tabelaReal.tipos[evento.tipo]}</td>
                    <td className="px-4 py-3 font-mono text-on-military-muted">
                      {evento.investidor ? truncateAddress(evento.investidor) : "—"}
                    </td>
                    <td className="px-4 py-3 text-on-military">
                      {evento.valorWei !== null
                        ? formatToken(evento.valorWei, resumoOnChain?.mockBrlDecimals ?? 18, resumoOnChain?.mockBrlSymbol ?? "mBRL")
                        : evento.cotas !== null
                          ? `${formatUnits(evento.cotas, 18)} cotas`
                          : "—"}
                    </td>
                    <td className="px-4 py-3 text-on-military-muted">{formatUnixSeconds(evento.timestamp)}</td>
                    <td className="px-4 py-3">
                      <a
                        href={`https://sepolia.etherscan.io/tx/${evento.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-salmon underline underline-offset-2 hover:text-salmon-600"
                      >
                        {truncateAddress(evento.txHash)}
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

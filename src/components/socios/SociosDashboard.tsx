import { formatUnits } from "viem";
import { BadgeCheck, ExternalLink } from "lucide-react";
import { SignOutButton } from "@/components/conta/SignOutButton";
import { formatBRL } from "@/lib/format";
import { ptBr } from "@/lib/i18n/pt-br";
import type { EventoOnChain, ResumoOnChain } from "@/lib/web3/events";
import type { ResumoMock, TransacaoMock } from "@/lib/socios/mockTransacoes";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

function formatUnixSeconds(timestamp: number | null): string {
  if (timestamp === null) return "—";
  return dateFormatter.format(new Date(timestamp * 1000));
}

function formatIso(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatToken(valorWei: bigint | null, decimals: number, symbol: string): string {
  if (valorWei === null) return "—";
  return `${Number(formatUnits(valorWei, decimals)).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${symbol}`;
}

function KpiCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border border-panel-border bg-panel p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-on-military-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-on-military">{value}</p>
      {note && <p className="mt-1 text-xs text-on-military-muted">{note}</p>}
    </div>
  );
}

function OrigemBadge({ real }: { real: boolean }) {
  const t = ptBr.socios.origem;
  return real ? (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-salmon px-2.5 py-0.5 text-xs font-semibold text-on-salmon">
      <BadgeCheck className="h-3 w-3" aria-hidden="true" />
      {t.real}
    </span>
  ) : (
    <span className="inline-flex w-fit items-center rounded-full border border-panel-border px-2.5 py-0.5 text-xs font-medium text-on-military-muted">
      {t.mock}
    </span>
  );
}

export function SociosDashboard({
  email,
  eventosOnChain,
  resumoOnChain,
  transacoesMock,
  resumoMock,
}: {
  email: string;
  eventosOnChain: EventoOnChain[];
  resumoOnChain: ResumoOnChain | null;
  transacoesMock: TransacaoMock[];
  resumoMock: ResumoMock;
}) {
  const t = ptBr.socios;
  const taxaBpsUnica = resumoOnChain?.taxaBpsPorOferta.every((bps) => bps === resumoOnChain.taxaBpsPorOferta[0])
    ? resumoOnChain.taxaBpsPorOferta[0]
    : null;

  return (
    <main className="flex flex-1 flex-col bg-military">
      <div className="border-b border-panel-border bg-panel px-4 py-2 text-center text-xs text-on-military-muted sm:text-sm">
        <span className="font-semibold text-salmon">{t.banner.label}</span> — {t.banner.text}
      </div>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-on-military">{t.titulo}</h1>
            <p className="mt-1 text-sm text-on-military-muted">
              {t.logadoComo} {email}
            </p>
          </div>
          <SignOutButton />
        </div>

        {/* Resumo — Sepolia real */}
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

        {/* Resumo — mock */}
        <section className="mt-8">
          <div className="flex items-center gap-2">
            <OrigemBadge real={false} />
            <h2 className="text-lg font-semibold text-on-military">{t.resumoMock.title}</h2>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <KpiCard label={t.resumoMock.totalPago} value={formatBRL(resumoMock.totalCents / 100)} />
            <KpiCard label={t.resumoMock.investidoresUnicos} value={String(resumoMock.investidoresUnicos)} />
          </div>
          <p className="mt-2 text-xs text-on-military-muted">{t.resumoMock.semTaxaNota}</p>
        </section>

        {/* Tabela — eventos on-chain */}
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

        {/* Tabela — mock */}
        <section className="mt-10">
          <div className="flex items-center gap-2">
            <OrigemBadge real={false} />
            <h2 className="text-lg font-semibold text-on-military">{t.tabelaMock.title}</h2>
          </div>
          <div className="mt-4 overflow-x-auto rounded-lg border border-panel-border bg-panel">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-panel-border text-xs uppercase tracking-wide text-on-military-muted">
                  <th className="px-4 py-3">{t.tabelaMock.colEmissor}</th>
                  <th className="px-4 py-3">{t.tabelaMock.colInvestidor}</th>
                  <th className="px-4 py-3">{t.tabelaMock.colValor}</th>
                  <th className="px-4 py-3">{t.tabelaMock.colStatus}</th>
                  <th className="px-4 py-3">{t.tabelaMock.colData}</th>
                </tr>
              </thead>
              <tbody>
                {transacoesMock.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-on-military-muted">
                      {t.tabelaMock.vazio}
                    </td>
                  </tr>
                ) : (
                  transacoesMock.map((transacao) => (
                    <tr key={transacao.id} className="border-b border-panel-border last:border-0">
                      <td className="px-4 py-3 text-on-military">{transacao.issuerLegalName}</td>
                      <td className="px-4 py-3 text-on-military-muted">{transacao.investorFullName}</td>
                      <td className="px-4 py-3 text-on-military">{formatBRL(transacao.amountCents / 100)}</td>
                      <td className="px-4 py-3 text-on-military-muted">{t.tabelaMock.status[transacao.status]}</td>
                      <td className="px-4 py-3 text-on-military-muted">{formatIso(transacao.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

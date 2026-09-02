import { formatUnits } from "viem";
import { formatBRL } from "@/lib/format";
import { ptBr } from "@/lib/i18n/pt-br";
import type { ResumoMovimentacoes } from "@/lib/socios/movimentacoes";
import { KpiCard } from "./SociosDashboard";

function formatToken(valorWei: bigint, decimals: number, symbol: string): string {
  return `${Number(formatUnits(valorWei, decimals)).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${symbol}`;
}

// Resumo agregado acima da timeline única — os mesmos números que antes viviam em duas seções
// separadas (resumo on-chain + resumo mock) agora ficam lado a lado, já que a tabela abaixo não
// separa mais por origem.
export function ResumoCards({ resumo }: { resumo: ResumoMovimentacoes }) {
  const t = ptBr.socios;
  const onChain = resumo.onChain;
  const taxaBpsUnica =
    onChain && onChain.taxaBpsPorOferta.every((bps) => bps === onChain.taxaBpsPorOferta[0])
      ? onChain.taxaBpsPorOferta[0]
      : null;

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-on-military">{t.movimentacoes.resumoTitle}</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {onChain ? (
          <>
            <KpiCard
              label={t.resumoReal.totalArrecadado}
              value={formatToken(onChain.totalArrecadadoWei, onChain.mockBrlDecimals, onChain.mockBrlSymbol)}
              note={t.origem.real}
            />
            <KpiCard label={t.resumoReal.carteirasUnicas} value={String(onChain.carteirasUnicas)} note={t.origem.real} />
            <KpiCard
              label={t.resumoReal.aliquotaConfigurada}
              value={taxaBpsUnica === 0 ? "0%" : taxaBpsUnica === null ? t.resumoReal.taxaVariavel : `${(taxaBpsUnica / 100).toFixed(2)}%`}
              note={taxaBpsUnica === 0 ? t.resumoReal.taxaZeradaNota : t.origem.real}
            />
            <KpiCard
              label={t.resumoReal.receitaTaxa}
              value={formatToken(onChain.taxaRecebidaWei, onChain.mockBrlDecimals, onChain.mockBrlSymbol)}
              note={t.resumoReal.receitaTaxaNota}
            />
          </>
        ) : (
          <div className="rounded-lg border border-panel-border bg-panel p-5 text-sm text-on-military-muted sm:col-span-3">
            {t.resumoReal.naoConfigurado}
          </div>
        )}
        <KpiCard
          label={t.resumoMock.totalPago}
          value={formatBRL(resumo.totalAportesMockCents / 100)}
          note={t.origem.mock}
        />
        <KpiCard
          label={t.resumoMock.investidoresUnicos}
          value={String(resumo.investidoresUnicosMock)}
          note={t.origem.mock}
        />
      </div>
    </section>
  );
}

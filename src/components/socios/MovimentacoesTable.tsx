import { ExternalLink } from "lucide-react";
import { pt } from "@/lib/i18n/pt-br";
import type { Transaction } from "@/lib/socios/movimentacoes";
import { OriginBadge } from "./SociosDashboard";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

function formatEpoch(timestamp: number): string {
  if (!timestamp) return "—";
  return dateFormatter.format(new Date(timestamp * 1000));
}

// Timeline única com TODAS as movimentações do site (on-chain real + off-chain/Supabase),
// pedido explícito do usuário: uma tabela só, sem separar por seção — cada linha carrega seu
// próprio OrigemBadge pra quem quiser saber de onde veio, mas a lista/ordenação é uma só.
export function TransactionsTable({ transactions: movimentacoes }: { transactions: Transaction[] }) {
  const t = pt.partners.transactions;

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-on-military">{t.title}</h2>
      <p className="mt-1 text-xs text-on-military-muted">{t.subtitle}</p>
      <div className="mt-4 overflow-x-auto rounded-lg border border-panel-border bg-panel">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-panel-border text-xs uppercase tracking-wide text-on-military-muted">
              <th className="px-4 py-3">{t.colOrigin}</th>
              <th className="px-4 py-3">{t.colType}</th>
              <th className="px-4 py-3">{t.colActor}</th>
              <th className="px-4 py-3">{t.colValue}</th>
              <th className="px-4 py-3">{t.colDate}</th>
              <th className="px-4 py-3">{t.colLink}</th>
            </tr>
          </thead>
          <tbody>
            {movimentacoes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-on-military-muted">
                  {t.empty}
                </td>
              </tr>
            ) : (
              movimentacoes.map((mov) => (
                <tr key={mov.id} className="border-b border-panel-border last:border-0">
                  <td className="px-4 py-3">
                    <OriginBadge real={mov.origem === "onchain"} />
                  </td>
                  <td className="px-4 py-3 text-on-military">{mov.tipo}</td>
                  <td className="px-4 py-3 text-on-military-muted">{mov.ator ?? "—"}</td>
                  <td className="px-4 py-3 text-on-military">{mov.valor ?? "—"}</td>
                  <td className="px-4 py-3 text-on-military-muted">{formatEpoch(mov.timestamp)}</td>
                  <td className="px-4 py-3">
                    {mov.link ? (
                      <a
                        href={mov.link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-salmon underline underline-offset-2 hover:text-salmon-600"
                      >
                        {t.viewOnChain}
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

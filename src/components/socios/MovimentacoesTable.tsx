import { ExternalLink } from "lucide-react";
import { ptBr } from "@/lib/i18n/pt-br";
import type { Movimentacao } from "@/lib/socios/movimentacoes";
import { OrigemBadge } from "./SociosDashboard";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

function formatEpoch(timestamp: number): string {
  if (!timestamp) return "—";
  return dateFormatter.format(new Date(timestamp * 1000));
}

// Timeline única com TODAS as movimentações do site (on-chain real + off-chain/Supabase),
// pedido explícito do usuário: uma tabela só, sem separar por seção — cada linha carrega seu
// próprio OrigemBadge pra quem quiser saber de onde veio, mas a lista/ordenação é uma só.
export function MovimentacoesTable({ movimentacoes }: { movimentacoes: Movimentacao[] }) {
  const t = ptBr.socios.movimentacoes;

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-on-military">{t.title}</h2>
      <p className="mt-1 text-xs text-on-military-muted">{t.subtitle}</p>
      <div className="mt-4 overflow-x-auto rounded-lg border border-panel-border bg-panel">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-panel-border text-xs uppercase tracking-wide text-on-military-muted">
              <th className="px-4 py-3">{t.colOrigem}</th>
              <th className="px-4 py-3">{t.colTipo}</th>
              <th className="px-4 py-3">{t.colAtor}</th>
              <th className="px-4 py-3">{t.colValor}</th>
              <th className="px-4 py-3">{t.colData}</th>
              <th className="px-4 py-3">{t.colLink}</th>
            </tr>
          </thead>
          <tbody>
            {movimentacoes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-on-military-muted">
                  {t.vazio}
                </td>
              </tr>
            ) : (
              movimentacoes.map((mov) => (
                <tr key={mov.id} className="border-b border-panel-border last:border-0">
                  <td className="px-4 py-3">
                    <OrigemBadge real={mov.origem === "onchain"} />
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
                        {t.verNaChain}
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

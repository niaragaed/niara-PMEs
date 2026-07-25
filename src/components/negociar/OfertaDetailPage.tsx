"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { CategoryBadge } from "./CategoryChip";
import { FinanceiroChart } from "./FinanceiroChart";
import { OrderTicket } from "./OrderTicket";
import { CATEGORY_META } from "@/lib/categories";
import { formatBRL } from "@/lib/format";
import { ptBr } from "@/lib/i18n/pt-br";
import { DOCUMENTOS_PADRAO, type Oferta } from "@/lib/mock/ofertas";

export function OfertaDetailPage({ oferta }: { oferta: Oferta }) {
  const [ticketOpen, setTicketOpen] = useState(false);
  const t = ptBr.negociar.oferta;

  return (
    <main className="flex flex-1 flex-col bg-military">
      <div className="border-b border-panel-border bg-panel px-4 py-2 text-center text-xs text-on-military-muted sm:text-sm">
        <span className="font-semibold text-salmon">{ptBr.common.demonstracao}</span> — {t.demoBanner}
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <Link
          href={CATEGORY_META[oferta.categoria].href}
          className="text-sm font-medium text-on-military-muted transition-colors hover:text-on-military"
        >
          {t.voltarCategoria}
        </Link>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <CategoryBadge categoria={oferta.categoria} />
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-on-military">{oferta.nome}</h1>
            <p className="mt-1 text-on-military-muted">{oferta.empresa.nomeFantasia}</p>
          </div>

          {!ticketOpen && (
            <button
              type="button"
              onClick={() => setTicketOpen(true)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-salmon px-6 py-3 text-sm font-semibold text-on-salmon transition-colors hover:bg-salmon-600"
            >
              {t.negociarBotao}
            </button>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className={`flex flex-col gap-6 ${ticketOpen ? "lg:col-span-8" : "lg:col-span-12"}`}>
            <section className="rounded-lg bg-surface p-6 shadow-soft">
              <h2 className="text-lg font-semibold text-ink">{t.dadosPublicos.title}</h2>
              <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-ink-muted">{t.dadosPublicos.razaoSocial}</dt>
                  <dd className="mt-0.5 text-sm text-ink">{oferta.empresa.razaoSocial}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">{t.dadosPublicos.cnpj}</dt>
                  <dd className="mt-0.5 font-mono text-sm text-ink">{oferta.empresa.cnpj}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">{t.dadosPublicos.setor}</dt>
                  <dd className="mt-0.5 text-sm text-ink">{oferta.empresa.setor}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">{t.dadosPublicos.localizacao}</dt>
                  <dd className="mt-0.5 text-sm text-ink">{oferta.empresa.localizacao}</dd>
                </div>
              </dl>
              <div className="mt-4">
                <dt className="text-xs text-ink-muted">{t.dadosPublicos.resumo}</dt>
                <dd className="mt-0.5 text-sm leading-relaxed text-ink">{oferta.empresa.resumo}</dd>
              </div>
            </section>

            <section className="rounded-lg bg-surface p-6 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-ink">{t.financeiro.title}</h2>
                <span className="text-xs font-medium text-ink-muted">{t.financeiro.nota}</span>
              </div>
              <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-ink-muted">{t.financeiro.receitaAnual}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-ink">{formatBRL(oferta.financeiro.receitaAnual)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">{t.financeiro.caixaDisponivel}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-ink">
                    {formatBRL(oferta.financeiro.caixaDisponivel)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">{t.financeiro.endividamento}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-ink">{formatBRL(oferta.financeiro.endividamento)}</dd>
                </div>
              </dl>
              <div className="mt-6">
                <FinanceiroChart serie={oferta.financeiro.serieMensal} />
              </div>
            </section>

            <section className="rounded-lg bg-surface p-6 shadow-soft">
              <h2 className="text-lg font-semibold text-ink">{t.termos.title}</h2>
              <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-ink-muted">{t.termos.tipoToken}</dt>
                  <dd className="mt-0.5 text-sm text-ink">{t.termos.tipoTokenValores[oferta.termos.tipoToken]}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">{t.termos.metaCaptacao}</dt>
                  <dd className="mt-0.5 text-sm text-ink">{formatBRL(oferta.termos.metaCaptacao)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">{t.termos.valorPorToken}</dt>
                  <dd className="mt-0.5 text-sm text-ink">{formatBRL(oferta.termos.valorPorToken)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">{t.termos.quantidadeTokens}</dt>
                  <dd className="mt-0.5 text-sm text-ink">{oferta.termos.quantidadeTokens.toLocaleString("pt-BR")}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">{t.termos.prazo}</dt>
                  <dd className="mt-0.5 text-sm text-ink">{t.termos.prazoMeses(oferta.termos.prazoMeses)}</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-ink-muted">{t.termos.nota}</p>
            </section>

            <section className="rounded-lg bg-surface p-6 shadow-soft">
              <h2 className="text-lg font-semibold text-ink">{t.documentos.title}</h2>
              <ul className="mt-4 flex flex-col gap-2">
                {DOCUMENTOS_PADRAO.map((documento) => (
                  <li
                    key={documento}
                    className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-2.5 text-sm text-ink-muted"
                  >
                    {documento}
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      title={t.documentos.emBreve}
                      className="shrink-0 cursor-not-allowed rounded-full bg-military-100 px-3 py-1 text-xs font-medium text-military"
                    >
                      {t.documentos.emBreve}
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border border-salmon/40 bg-surface p-6 shadow-soft">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-salmon" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-ink">{t.riscos.title}</h2>
              </div>
              <ul className="mt-4 flex flex-col gap-2">
                {t.riscos.itens.map((risco) => (
                  <li key={risco} className="flex gap-2 text-sm text-ink-muted">
                    <span aria-hidden="true">•</span>
                    <span>{risco}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {ticketOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-ink/50 lg:hidden"
                onClick={() => setTicketOpen(false)}
                aria-hidden="true"
              />
              <div className="lg:col-span-4">
                <div className="lg:sticky lg:top-24">
                  <OrderTicket oferta={oferta} onClose={() => setTicketOpen(false)} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

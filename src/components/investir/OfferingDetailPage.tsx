"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { AlertTriangle, BadgeCheck, Building2, X } from "lucide-react";
import { reserveInvestment, type PublicOffering, type ReserveInvestmentState } from "@/app/investir/actions";
import { TextField } from "@/components/perfil/FormField";
import { SectionGlow } from "@/components/ui/SectionGlow";
import { formatBRL } from "@/lib/format";
import { ptBr } from "@/lib/i18n/pt-br";
import { DOCUMENTOS_PADRAO } from "@/lib/mock/ofertas";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

function ReserveTicket({ offeringId, onClose }: { offeringId: string; onClose: () => void }) {
  const t = ptBr.investir.form;
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [valorReais, setValorReais] = useState("");
  const [erroValor, setErroValor] = useState<string | undefined>(undefined);
  const [resultado, setResultado] = useState<ReserveInvestmentState | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleValorChange(event: ChangeEvent<HTMLInputElement>) {
    setValorReais(event.target.value);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setResultado(null);
    setIsPending(true);
    const result = await reserveInvestment({ offeringId, valorReais: valorReais.trim() });
    setIsPending(false);
    setResultado(result);
    setErroValor(result.status === "error" ? result.fieldErrors?.valorReais : undefined);
    if (result.status === "success") {
      setValorReais("");
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-2xl border-t border-panel-border bg-panel p-5 lg:static lg:z-auto lg:max-h-none lg:overflow-visible lg:rounded-2xl lg:border">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-on-military">{t.titulo}</h2>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label={t.fecharAria}
          className="rounded-full p-1.5 text-on-military-muted hover:text-on-military"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-4">
        <TextField
          id="reserva-valor"
          label={t.campoValor}
          value={valorReais}
          onChange={handleValorChange}
          error={erroValor}
          inputMode="decimal"
          placeholder="1.000,00"
        />

        {resultado?.status === "error" && (
          <p role="alert" className="text-sm text-value-negative">
            {resultado.message}
          </p>
        )}
        {resultado?.status === "success" && (
          <p role="status" className="text-sm text-value-positive">
            {t.sucesso}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? t.confirmandoBotao : t.confirmarBotao}
        </button>
      </form>
    </div>
  );
}

export function OfferingDetailPage({ oferta, isOwner }: { oferta: PublicOffering; isOwner: boolean }) {
  const t = ptBr.investir;
  const [ticketOpen, setTicketOpen] = useState(false);
  const showTicket = ticketOpen && !isOwner;

  const numeroCotas =
    oferta.sharePriceCents === null || oferta.sharePriceCents === 0
      ? null
      : Math.trunc(oferta.baseCapCents / oferta.sharePriceCents);

  return (
    <main className="isolate flex flex-1 flex-col bg-military">
      <SectionGlow />
      <div className="border-b border-panel-border bg-panel px-4 py-2 text-center text-xs text-on-military-muted sm:text-sm">
        {t.avisoReal}
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <Link
          href="/investir"
          className="text-sm font-medium text-on-military-muted transition-colors hover:text-on-military"
        >
          {t.detalhe.voltar}
        </Link>

        {isOwner && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-salmon/40 bg-panel px-4 py-3 text-sm text-on-military">
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-salmon" aria-hidden="true" />
            <p>
              {t.detalhe.dono.aviso}{" "}
              <Link
                href="/empresa/ofertas"
                className="font-semibold text-salmon underline underline-offset-2 hover:text-salmon-600"
              >
                {t.detalhe.dono.link}
              </Link>
              .
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-panel-border bg-panel">
              {oferta.issuer.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- vem do bucket público do Supabase Storage, não passa pelo otimizador do next/image
                <img src={oferta.issuer.logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-6 w-6 text-on-military-muted" aria-hidden="true" />
              )}
            </div>
            <div>
              {oferta.category && (
                <span className="inline-block rounded-full border border-panel-border bg-military-600/40 px-3 py-1 text-xs font-medium text-on-military">
                  {ptBr.ativos.categorias[oferta.category]}
                </span>
              )}
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-on-military">
                {oferta.issuer.legalName}
              </h1>
              {oferta.issuer.tradeName && <p className="mt-1 text-on-military-muted">{oferta.issuer.tradeName}</p>}
            </div>
          </div>

          {!isOwner && !ticketOpen && (
            <button
              type="button"
              onClick={() => setTicketOpen(true)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-salmon px-6 py-3 text-sm font-semibold text-on-salmon transition-colors hover:bg-salmon-600"
            >
              {t.detalhe.reservarBotao}
            </button>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className={`flex flex-col gap-6 ${showTicket ? "lg:col-span-8" : "lg:col-span-12"}`}>
            <section className="rounded-lg border border-panel-border bg-panel p-6">
              <h2 className="text-lg font-semibold text-on-military">{t.detalhe.dadosPublicos.title}</h2>
              <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-on-military-muted">{t.detalhe.dadosPublicos.razaoSocial}</dt>
                  <dd className="mt-0.5 text-sm text-on-military">{oferta.issuer.legalName}</dd>
                </div>
                {oferta.issuer.tradeName && (
                  <div>
                    <dt className="text-xs text-on-military-muted">{t.detalhe.dadosPublicos.nomeFantasia}</dt>
                    <dd className="mt-0.5 text-sm text-on-military">{oferta.issuer.tradeName}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-on-military-muted">{t.detalhe.dadosPublicos.cnpj}</dt>
                  <dd className="mt-0.5 font-mono text-sm text-on-military">
                    {oferta.issuer.cnpjMasked ?? t.detalhe.dadosPublicos.cnpjNaoPublicado}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-on-military-muted">{t.detalhe.dadosPublicos.setor}</dt>
                  <dd className="mt-0.5 text-sm text-on-military">
                    {oferta.issuer.sector ?? t.detalhe.dadosPublicos.naoInformado}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-on-military-muted">{t.detalhe.dadosPublicos.localizacao}</dt>
                  <dd className="mt-0.5 text-sm text-on-military">
                    {oferta.issuer.city && oferta.issuer.state
                      ? `${oferta.issuer.city} / ${oferta.issuer.state}`
                      : t.detalhe.dadosPublicos.naoInformado}
                  </dd>
                </div>
              </dl>
              <div className="mt-4">
                <dt className="text-xs text-on-military-muted">{t.detalhe.dadosPublicos.resumo}</dt>
                <dd className="mt-0.5 text-sm leading-relaxed text-on-military">
                  {oferta.issuer.businessSummary ?? t.detalhe.dadosPublicos.naoInformado}
                </dd>
              </div>
            </section>

            <section className="rounded-lg border border-panel-border bg-panel p-6">
              <h2 className="text-lg font-semibold text-on-military">{t.detalhe.termos.title}</h2>
              <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-on-military-muted">{t.detalhe.termos.categoria}</dt>
                  <dd className="mt-0.5 text-sm text-on-military">
                    {oferta.category ? ptBr.ativos.categorias[oferta.category] : t.detalhe.termos.naoInformado}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-on-military-muted">{t.detalhe.termos.metaMinima}</dt>
                  <dd className="mt-0.5 text-sm text-on-military">{formatBRL(oferta.targetMinCents / 100)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-on-military-muted">{t.detalhe.termos.teto}</dt>
                  <dd className="mt-0.5 text-sm text-on-military">{formatBRL(oferta.hardCapCents / 100)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-on-military-muted">{t.detalhe.termos.jaReservado}</dt>
                  <dd className="mt-0.5 text-sm text-on-military">{formatBRL(oferta.arrecadadoCents / 100)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-on-military-muted">{t.detalhe.termos.valorPorCota}</dt>
                  <dd className="mt-0.5 text-sm text-on-military">
                    {oferta.sharePriceCents === null
                      ? t.detalhe.termos.naoInformado
                      : formatBRL(oferta.sharePriceCents / 100)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-on-military-muted">{t.detalhe.termos.numeroCotas}</dt>
                  <dd className="mt-0.5 text-sm text-on-military">
                    {numeroCotas === null ? t.detalhe.termos.naoInformado : numeroCotas.toLocaleString("pt-BR")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-on-military-muted">{t.detalhe.termos.janela}</dt>
                  <dd className="mt-0.5 text-sm text-on-military">
                    {formatDate(oferta.opensAt)} – {formatDate(oferta.closesAt)}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-on-military-muted">{t.detalhe.termos.nota}</p>
            </section>

            <section className="rounded-lg border border-panel-border bg-panel p-6">
              <h2 className="text-lg font-semibold text-on-military">{t.detalhe.documentos.title}</h2>
              <ul className="mt-4 flex flex-col gap-2">
                {DOCUMENTOS_PADRAO.map((documento) => (
                  <li
                    key={documento}
                    className="flex items-center justify-between gap-3 rounded-md border border-panel-border px-4 py-2.5 text-sm text-on-military-muted"
                  >
                    {documento}
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      title={t.detalhe.documentos.emBreve}
                      className="shrink-0 cursor-not-allowed rounded-full bg-military-600/40 px-3 py-1 text-xs font-medium text-on-military"
                    >
                      {t.detalhe.documentos.emBreve}
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border border-salmon/40 bg-panel p-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-salmon" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-on-military">{t.detalhe.riscos.title}</h2>
              </div>
              <ul className="mt-4 flex flex-col gap-2">
                {t.detalhe.riscos.itens.map((risco) => (
                  <li key={risco} className="flex gap-2 text-sm text-on-military-muted">
                    <span aria-hidden="true">•</span>
                    <span>{risco}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {showTicket && (
            <>
              <div
                className="fixed inset-0 z-40 bg-ink/50 lg:hidden"
                onClick={() => setTicketOpen(false)}
                aria-hidden="true"
              />
              <div className="lg:col-span-4">
                <div className="lg:sticky lg:top-24">
                  <ReserveTicket offeringId={oferta.id} onClose={() => setTicketOpen(false)} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

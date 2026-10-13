"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { AlertTriangle, BadgeCheck, Building2, X } from "lucide-react";
import { reserveInvestment, type PublicOffering, type ReserveInvestmentState } from "@/app/investir/actions";
import { TextField } from "@/components/perfil/FormField";
import { SectionGlow } from "@/components/ui/SectionGlow";
import { formatBRL } from "@/lib/format";
import { ptBr } from "@/lib/i18n/pt-br";
import { DEFAULT_DOCUMENTS } from "@/lib/mock/ofertas";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

function ReserveTicket({ offeringId, onClose }: { offeringId: string; onClose: () => void }) {
  const t = ptBr.invest.form;
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [amountReais, setAmountReais] = useState("");
  const [errorValue, setErrorValue] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<ReserveInvestmentState | null>(null);
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

  function handleValueChange(event: ChangeEvent<HTMLInputElement>) {
    setAmountReais(event.target.value);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setResult(null);
    setIsPending(true);
    const result = await reserveInvestment({ offeringId, amountReais: amountReais.trim() });
    setIsPending(false);
    setResult(result);
    setErrorValue(result.status === "error" ? result.fieldErrors?.amountReais : undefined);
    if (result.status === "success") {
      setAmountReais("");
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-2xl border-t border-panel-border bg-panel p-5 lg:static lg:z-auto lg:max-h-none lg:overflow-visible lg:rounded-2xl lg:border">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-on-military">{t.title}</h2>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label={t.closeAria}
          className="rounded-full p-1.5 text-on-military-muted hover:text-on-military"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-4">
        <TextField
          id="reserva-valor"
          label={t.fieldValue}
          value={amountReais}
          onChange={handleValueChange}
          error={errorValue}
          inputMode="decimal"
          placeholder="1.000,00"
        />

        {result?.status === "error" && (
          <p role="alert" className="text-sm text-value-negative">
            {result.message}
          </p>
        )}
        {result?.status === "success" && (
          <p role="status" className="text-sm text-value-positive">
            {t.success}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? t.confirmingButton : t.confirmButton}
        </button>
      </form>
    </div>
  );
}

export function OfferingDetailPage({ offering, isOwner }: { offering: PublicOffering; isOwner: boolean }) {
  const t = ptBr.invest;
  const [ticketOpen, setTicketOpen] = useState(false);
  const showTicket = ticketOpen && !isOwner;

  const shareCount =
    offering.sharePriceCents === null || offering.sharePriceCents === 0
      ? null
      : Math.trunc(offering.baseCapCents / offering.sharePriceCents);

  return (
    <main className="isolate flex flex-1 flex-col bg-military">
      <SectionGlow />
      <div className="border-b border-panel-border bg-panel px-4 py-2 text-center text-xs text-on-military-muted sm:text-sm">
        {t.realNotice}
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <Link
          href="/investir"
          className="text-sm font-medium text-on-military-muted transition-colors hover:text-on-military"
        >
          {t.detail.back}
        </Link>

        {isOwner && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-salmon/40 bg-panel px-4 py-3 text-sm text-on-military">
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-salmon" aria-hidden="true" />
            <p>
              {t.detail.owner.notice}{" "}
              <Link
                href="/empresa/ofertas"
                className="font-semibold text-salmon underline underline-offset-2 hover:text-salmon-600"
              >
                {t.detail.owner.link}
              </Link>
              .
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-panel-border bg-panel">
              {offering.issuer.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- vem do bucket público do Supabase Storage, não passa pelo otimizador do next/image
                <img src={offering.issuer.logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-6 w-6 text-on-military-muted" aria-hidden="true" />
              )}
            </div>
            <div>
              {offering.category && (
                <span className="inline-block rounded-full border border-panel-border bg-military-600/40 px-3 py-1 text-xs font-medium text-on-military">
                  {ptBr.assets.categories[offering.category]}
                </span>
              )}
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-on-military">
                {offering.issuer.legalName}
              </h1>
              {offering.issuer.tradeName && <p className="mt-1 text-on-military-muted">{offering.issuer.tradeName}</p>}
            </div>
          </div>

          {!isOwner && !ticketOpen && (
            <button
              type="button"
              onClick={() => setTicketOpen(true)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-salmon px-6 py-3 text-sm font-semibold text-on-salmon transition-colors hover:bg-salmon-600"
            >
              {t.detail.reserveButton}
            </button>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className={`flex flex-col gap-6 ${showTicket ? "lg:col-span-8" : "lg:col-span-12"}`}>
            <section className="rounded-lg border border-panel-border bg-panel p-6">
              <h2 className="text-lg font-semibold text-on-military">{t.detail.publicData.title}</h2>
              <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-on-military-muted">{t.detail.publicData.legalName}</dt>
                  <dd className="mt-0.5 text-sm text-on-military">{offering.issuer.legalName}</dd>
                </div>
                {offering.issuer.tradeName && (
                  <div>
                    <dt className="text-xs text-on-military-muted">{t.detail.publicData.tradeName}</dt>
                    <dd className="mt-0.5 text-sm text-on-military">{offering.issuer.tradeName}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-on-military-muted">{t.detail.publicData.cnpj}</dt>
                  <dd className="mt-0.5 font-mono text-sm text-on-military">
                    {offering.issuer.cnpjMasked ?? t.detail.publicData.cnpjNotPublished}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-on-military-muted">{t.detail.publicData.sector}</dt>
                  <dd className="mt-0.5 text-sm text-on-military">
                    {offering.issuer.sector ?? t.detail.publicData.notProvided}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-on-military-muted">{t.detail.publicData.location}</dt>
                  <dd className="mt-0.5 text-sm text-on-military">
                    {offering.issuer.city && offering.issuer.state
                      ? `${offering.issuer.city} / ${offering.issuer.state}`
                      : t.detail.publicData.notProvided}
                  </dd>
                </div>
              </dl>
              <div className="mt-4">
                <dt className="text-xs text-on-military-muted">{t.detail.publicData.summary}</dt>
                <dd className="mt-0.5 text-sm leading-relaxed text-on-military">
                  {offering.issuer.businessSummary ?? t.detail.publicData.notProvided}
                </dd>
              </div>
            </section>

            <section className="rounded-lg border border-panel-border bg-panel p-6">
              <h2 className="text-lg font-semibold text-on-military">{t.detail.terms.title}</h2>
              <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-on-military-muted">{t.detail.terms.category}</dt>
                  <dd className="mt-0.5 text-sm text-on-military">
                    {offering.category ? ptBr.assets.categories[offering.category] : t.detail.terms.notProvided}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-on-military-muted">{t.detail.terms.minTarget}</dt>
                  <dd className="mt-0.5 text-sm text-on-military">{formatBRL(offering.targetMinCents / 100)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-on-military-muted">{t.detail.terms.cap}</dt>
                  <dd className="mt-0.5 text-sm text-on-military">{formatBRL(offering.hardCapCents / 100)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-on-military-muted">{t.detail.terms.alreadyReserved}</dt>
                  <dd className="mt-0.5 text-sm text-on-military">{formatBRL(offering.arrecadadoCents / 100)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-on-military-muted">{t.detail.terms.valuePerShare}</dt>
                  <dd className="mt-0.5 text-sm text-on-military">
                    {offering.sharePriceCents === null
                      ? t.detail.terms.notProvided
                      : formatBRL(offering.sharePriceCents / 100)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-on-military-muted">{t.detail.terms.shareCount}</dt>
                  <dd className="mt-0.5 text-sm text-on-military">
                    {shareCount === null ? t.detail.terms.notProvided : shareCount.toLocaleString("pt-BR")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-on-military-muted">{t.detail.terms.window}</dt>
                  <dd className="mt-0.5 text-sm text-on-military">
                    {formatDate(offering.opensAt)} – {formatDate(offering.closesAt)}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-on-military-muted">{t.detail.terms.note}</p>
            </section>

            <section className="rounded-lg border border-panel-border bg-panel p-6">
              <h2 className="text-lg font-semibold text-on-military">{t.detail.documents.title}</h2>
              <ul className="mt-4 flex flex-col gap-2">
                {DEFAULT_DOCUMENTS.map((documento) => (
                  <li
                    key={documento}
                    className="flex items-center justify-between gap-3 rounded-md border border-panel-border px-4 py-2.5 text-sm text-on-military-muted"
                  >
                    {documento}
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      title={t.detail.documents.comingSoon}
                      className="shrink-0 cursor-not-allowed rounded-full bg-military-600/40 px-3 py-1 text-xs font-medium text-on-military"
                    >
                      {t.detail.documents.comingSoon}
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border border-salmon/40 bg-panel p-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-salmon" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-on-military">{t.detail.risks.title}</h2>
              </div>
              <ul className="mt-4 flex flex-col gap-2">
                {t.detail.risks.items.map((risk) => (
                  <li key={risk} className="flex gap-2 text-sm text-on-military-muted">
                    <span aria-hidden="true">•</span>
                    <span>{risk}</span>
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
                  <ReserveTicket offeringId={offering.id} onClose={() => setTicketOpen(false)} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

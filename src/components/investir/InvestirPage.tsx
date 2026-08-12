"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { confirmInvestment, type ConfirmInvestmentState } from "@/app/investir/actions";
import { submitKyc } from "@/app/investir/kyc-actions";
import { formatBRL } from "@/lib/format";
import { ptBr } from "@/lib/i18n/pt-br";

export type OfertaAtivaRow = {
  id: string;
  issuerLegalName: string;
  targetMinCents: number;
  hardCapCents: number;
  arrecadadoCents: number;
  opensAt: string;
  closesAt: string;
};

export type MinhaReservaRow = {
  id: string;
  offeringId: string;
  issuerLegalName: string;
  amountCents: number;
  status: "reserved" | "paid";
  paymentRef: string | null;
  createdAt: string;
};

type KycStatus = "pending" | "approved" | "rejected";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function InvestirPage({
  ofertas,
  minhasReservas,
  kycStatus: kycStatusInicial,
}: {
  ofertas: OfertaAtivaRow[];
  minhasReservas: MinhaReservaRow[];
  kycStatus: KycStatus;
}) {
  const t = ptBr.investir;

  const [kycStatus, setKycStatus] = useState<KycStatus>(kycStatusInicial);
  const [reservaResultados, setReservaResultados] = useState<Record<string, ConfirmInvestmentState>>({});
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [isConfirmPending, startConfirmTransition] = useTransition();
  const [isKycPending, startKycTransition] = useTransition();

  function handleConfirmarPagamento(reservaId: string) {
    setConfirmandoId(reservaId);
    startConfirmTransition(async () => {
      const result = await confirmInvestment(reservaId);
      setReservaResultados((prev) => ({ ...prev, [reservaId]: result }));
    });
  }

  function handleFazerKyc(reservaId: string) {
    setConfirmandoId(reservaId);
    startKycTransition(async () => {
      const result = await submitKyc();
      if (result.status === "success") {
        setKycStatus(result.kycStatus);
        setReservaResultados((prev) => {
          const next = { ...prev };
          delete next[reservaId];
          return next;
        });
      } else {
        setReservaResultados((prev) => ({ ...prev, [reservaId]: { status: "error", message: result.message } }));
      }
    });
  }

  return (
    <main className="flex flex-1 flex-col bg-military">
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-on-military">{t.titulo}</h1>
        <p className="mt-2 text-sm text-on-military-muted">{t.subtitulo}</p>

        <p className="mt-4 rounded-md border border-salmon/40 bg-salmon/10 px-4 py-3 text-sm text-on-military">
          {t.avisoReal}
        </p>

        <section className="mt-8">
          {ofertas.length === 0 ? (
            <p className="rounded-lg border border-panel-border bg-panel p-5 text-sm text-on-military-muted">
              {t.vazio}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {ofertas.map((oferta) => (
                <li key={oferta.id}>
                  <Link
                    href={`/investir/${oferta.id}`}
                    className="block rounded-lg border border-panel-border bg-panel p-5 transition-colors hover:border-salmon"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-on-military">{oferta.issuerLegalName}</p>
                      <span className="rounded-full border border-panel-border bg-military-600/40 px-3 py-1 text-xs font-medium text-on-military">
                        {t.card.statusAtiva}
                      </span>
                    </div>

                    <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs text-on-military-muted">{t.card.metaMinima}</dt>
                        <dd className="mt-0.5 text-sm text-on-military">{formatBRL(oferta.targetMinCents / 100)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-on-military-muted">{t.card.teto}</dt>
                        <dd className="mt-0.5 text-sm text-on-military">{formatBRL(oferta.hardCapCents / 100)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-on-military-muted">{t.card.jaReservado}</dt>
                        <dd className="mt-0.5 text-sm text-on-military">
                          {formatBRL(oferta.arrecadadoCents / 100)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-on-military-muted">{t.card.janela}</dt>
                        <dd className="mt-0.5 text-sm text-on-military">
                          {formatDate(oferta.opensAt)} – {formatDate(oferta.closesAt)}
                        </dd>
                      </div>
                    </dl>

                    <span className="mt-4 inline-block text-sm font-semibold text-salmon">{t.card.verOferta}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-on-military">{t.minhasReservas.titulo}</h2>
          <p className="mt-1 text-xs text-on-military-muted">{t.minhasReservas.avisoSimulado}</p>

          {minhasReservas.length === 0 ? (
            <p className="mt-4 rounded-lg border border-panel-border bg-panel p-5 text-sm text-on-military-muted">
              {t.minhasReservas.vazio}
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {minhasReservas.map((reserva) => {
                const resultado = reservaResultados[reserva.id];
                const isThisPending =
                  confirmandoId === reserva.id && (isConfirmPending || isKycPending);
                return (
                  <li
                    key={reserva.id}
                    className="rounded-lg border border-panel-border bg-panel p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-on-military">{reserva.issuerLegalName}</p>
                        <p className="text-xs text-on-military-muted">
                          {t.minhasReservas.reservadoEm} {formatDate(reserva.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-on-military">
                          {formatBRL(reserva.amountCents / 100)}
                        </p>
                        <p className="text-xs text-on-military-muted">
                          {reserva.status === "paid" ? t.minhasReservas.pagoStatus : t.minhasReservas.status}
                        </p>
                      </div>
                    </div>

                    {reserva.status === "paid" ? (
                      <p className="mt-3 text-xs text-on-military-muted">
                        {t.minhasReservas.refLabel}: {reserva.paymentRef ?? "—"}
                      </p>
                    ) : (
                      <div className="mt-4 flex flex-col gap-3 border-t border-panel-border pt-4">
                        {resultado?.status === "error" && (
                          <p role="alert" className="text-sm text-value-negative">
                            {resultado.message}
                          </p>
                        )}
                        {resultado?.status === "success" && (
                          <p role="status" className="text-sm text-value-positive">
                            {resultado.message}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            disabled={isThisPending}
                            onClick={() => handleConfirmarPagamento(reserva.id)}
                            className="rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {confirmandoId === reserva.id && isConfirmPending
                              ? t.minhasReservas.confirmandoBotao
                              : t.minhasReservas.confirmarBotao}
                          </button>

                          {resultado?.status === "error" && resultado.kycRequired && kycStatus !== "approved" && (
                            <button
                              type="button"
                              disabled={isThisPending}
                              onClick={() => handleFazerKyc(reserva.id)}
                              className="rounded-md border border-panel-border px-4 py-2 text-sm font-medium text-on-military hover:border-salmon disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {confirmandoId === reserva.id && isKycPending
                                ? t.minhasReservas.kycEnviando
                                : t.minhasReservas.kycBotao}
                            </button>
                          )}
                        </div>

                        {resultado?.status === "error" && resultado.kycRequired && kycStatus !== "approved" && (
                          <p className="text-xs text-on-military-muted">{t.minhasReservas.kycAviso}</p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

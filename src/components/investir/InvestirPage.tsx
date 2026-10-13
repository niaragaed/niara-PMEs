"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { confirmInvestment, type ConfirmInvestmentState } from "@/app/investir/actions";
import { submitKyc } from "@/app/investir/kyc-actions";
import { SectionGlow } from "@/components/ui/SectionGlow";
import { formatBRL } from "@/lib/format";
import { ptBr } from "@/lib/i18n/pt-br";

export type ActiveOfferingRow = {
  id: string;
  issuerLegalName: string;
  targetMinCents: number;
  hardCapCents: number;
  raisedCents: number;
  opensAt: string;
  closesAt: string;
};

export type MyReservationRow = {
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

export function InvestPage({
  offerings: ofertas,
  myReservations: minhasReservas,
  kycStatus: initialKycStatus,
}: {
  offerings: ActiveOfferingRow[];
  myReservations: MyReservationRow[];
  kycStatus: KycStatus;
}) {
  const t = ptBr.invest;

  const [kycStatus, setKycStatus] = useState<KycStatus>(initialKycStatus);
  const [reservationResults, setReservationResults] = useState<Record<string, ConfirmInvestmentState>>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [isConfirmPending, startConfirmTransition] = useTransition();
  const [isKycPending, startKycTransition] = useTransition();

  function handleConfirmPayment(reservationId: string) {
    setConfirmingId(reservationId);
    startConfirmTransition(async () => {
      const result = await confirmInvestment(reservationId);
      setReservationResults((prev) => ({ ...prev, [reservationId]: result }));
    });
  }

  function handleDoKyc(reservationId: string) {
    setConfirmingId(reservationId);
    startKycTransition(async () => {
      const result = await submitKyc();
      if (result.status === "success") {
        setKycStatus(result.kycStatus);
        setReservationResults((prev) => {
          const next = { ...prev };
          delete next[reservationId];
          return next;
        });
      } else {
        setReservationResults((prev) => ({ ...prev, [reservationId]: { status: "error", message: result.message } }));
      }
    });
  }

  return (
    <main className="isolate flex flex-1 flex-col bg-military">
      <SectionGlow />
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-on-military">{t.title}</h1>
        <p className="mt-2 text-sm text-on-military-muted">{t.subtitle}</p>

        <p className="mt-4 rounded-md border border-salmon/40 bg-salmon/10 px-4 py-3 text-sm text-on-military">
          {t.realNotice}
        </p>

        <p className="mt-3 rounded-md border border-panel-border bg-panel px-4 py-3 text-sm text-on-military-muted">
          {t.linkOnChain.text}{" "}
          <Link
            href="/investir/onchain"
            className="font-semibold text-salmon underline underline-offset-2 hover:text-salmon-600"
          >
            {t.linkOnChain.link}
          </Link>
          .
        </p>

        <section className="mt-8">
          {ofertas.length === 0 ? (
            <p className="rounded-lg border border-panel-border bg-panel p-5 text-sm text-on-military-muted">
              {t.empty}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {ofertas.map((offering) => (
                <li key={offering.id}>
                  <Link
                    href={`/investir/${offering.id}`}
                    className="block rounded-lg border border-panel-border bg-panel p-5 transition-colors hover:border-salmon"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-on-military">{offering.issuerLegalName}</p>
                      <span className="rounded-full border border-panel-border bg-military-600/40 px-3 py-1 text-xs font-medium text-on-military">
                        {t.card.statusActive}
                      </span>
                    </div>

                    <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs text-on-military-muted">{t.card.minTarget}</dt>
                        <dd className="mt-0.5 text-sm text-on-military">{formatBRL(offering.targetMinCents / 100)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-on-military-muted">{t.card.cap}</dt>
                        <dd className="mt-0.5 text-sm text-on-military">{formatBRL(offering.hardCapCents / 100)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-on-military-muted">{t.card.alreadyReserved}</dt>
                        <dd className="mt-0.5 text-sm text-on-military">
                          {formatBRL(offering.raisedCents / 100)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-on-military-muted">{t.card.window}</dt>
                        <dd className="mt-0.5 text-sm text-on-military">
                          {formatDate(offering.opensAt)} – {formatDate(offering.closesAt)}
                        </dd>
                      </div>
                    </dl>

                    <span className="mt-4 inline-block text-sm font-semibold text-salmon">{t.card.viewOffering}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-on-military">{t.myReservations.title}</h2>
          <p className="mt-1 text-xs text-on-military-muted">{t.myReservations.simulatedNotice}</p>

          {minhasReservas.length === 0 ? (
            <p className="mt-4 rounded-lg border border-panel-border bg-panel p-5 text-sm text-on-military-muted">
              {t.myReservations.empty}
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {minhasReservas.map((reservation) => {
                const result = reservationResults[reservation.id];
                const isThisPending =
                  confirmingId === reservation.id && (isConfirmPending || isKycPending);
                return (
                  <li
                    key={reservation.id}
                    className="rounded-lg border border-panel-border bg-panel p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-on-military">{reservation.issuerLegalName}</p>
                        <p className="text-xs text-on-military-muted">
                          {t.myReservations.reservedOn} {formatDate(reservation.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-on-military">
                          {formatBRL(reservation.amountCents / 100)}
                        </p>
                        <p className="text-xs text-on-military-muted">
                          {reservation.status === "paid" ? t.myReservations.paidStatus : t.myReservations.status}
                        </p>
                      </div>
                    </div>

                    {reservation.status === "paid" ? (
                      <p className="mt-3 text-xs text-on-military-muted">
                        {t.myReservations.refLabel}: {reservation.paymentRef ?? "—"}
                      </p>
                    ) : (
                      <div className="mt-4 flex flex-col gap-3 border-t border-panel-border pt-4">
                        {result?.status === "error" && (
                          <p role="alert" className="text-sm text-value-negative">
                            {result.message}
                          </p>
                        )}
                        {result?.status === "success" && (
                          <p role="status" className="text-sm text-value-positive">
                            {result.message}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            disabled={isThisPending}
                            onClick={() => handleConfirmPayment(reservation.id)}
                            className="rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {confirmingId === reservation.id && isConfirmPending
                              ? t.myReservations.confirmingButton
                              : t.myReservations.confirmButton}
                          </button>

                          {result?.status === "error" && result.kycRequired && kycStatus !== "approved" && (
                            <button
                              type="button"
                              disabled={isThisPending}
                              onClick={() => handleDoKyc(reservation.id)}
                              className="rounded-md border border-panel-border px-4 py-2 text-sm font-medium text-on-military hover:border-salmon disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {confirmingId === reservation.id && isKycPending
                                ? t.myReservations.kycSending
                                : t.myReservations.kycButton}
                            </button>
                          )}
                        </div>

                        {result?.status === "error" && result.kycRequired && kycStatus !== "approved" && (
                          <p className="text-xs text-on-military-muted">{t.myReservations.kycNotice}</p>
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

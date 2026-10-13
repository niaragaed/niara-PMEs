"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { formatBRL } from "@/lib/format";
import type { Offering } from "@/lib/mock/ofertas";
import { useDictionary } from "@/lib/i18n/client";

type OrderSide = "buy" | "sell";
type Step = "form" | "resumo" | "confirmado";

// Taxa estimada só para exibição na simulação — nunca cobrada de verdade,
// rotulada "a definir" (ver ptBr.negociar.boleta.taxa).
const ESTIMATED_FEE = 0.005;

// Saldo simulado inicial da sessão — só em memória (useState), nunca
// persistido em localStorage/sessionStorage, mesma regra de LGPD das
// demais simulações do projeto (carteira em /perfil, dados de /ativos).
const INITIAL_SIMULATED_BALANCE = 50_000;

export function OrderTicket({ offering: oferta, onClose }: { offering: Offering; onClose: () => void }) {
  const dict = useDictionary();
  const t = dict.trade.orderTicket;
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [side, setSide] = useState<OrderSide>("buy");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState(String(oferta.simulatedPrice));
  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState(INITIAL_SIMULATED_BALANCE);

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

  const qtyNum = Number(quantity);
  const priceNumber = Number(price);
  const total = Math.round(qtyNum * priceNumber * 100) / 100;
  const fee = Math.round(total * ESTIMATED_FEE * 100) / 100;

  function handleSideChange(next: OrderSide) {
    setSide(next);
    setError(null);
  }

  function handleReview(event: FormEvent) {
    event.preventDefault();
    if (!quantity.trim() || !Number.isFinite(qtyNum) || qtyNum <= 0) {
      setError(t.errors.invalidQuantity);
      return;
    }
    if (!price.trim() || !Number.isFinite(priceNumber) || priceNumber <= 0) {
      setError(t.errors.invalidPrice);
      return;
    }
    setError(null);
    setStep("resumo");
  }

  function handleConfirm() {
    setBalance((current) => (side === "buy" ? current - (total + fee) : current + (total - fee)));
    setStep("confirmado");
  }

  function handleNewOrder() {
    setQuantity("");
    setPrice(String(oferta.simulatedPrice));
    setError(null);
    setStep("form");
  }

  return (
    <div
      role="region"
      aria-label={t.title}
      className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-5 shadow-soft-lg lg:static lg:z-auto lg:max-h-none lg:overflow-visible lg:rounded-2xl lg:border"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">{t.title}</h2>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label={t.closeAria}
          className="rounded-full p-1 text-ink-muted transition-colors hover:bg-surface-alt hover:text-ink"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <p className="mt-3 rounded-md bg-salmon-100 px-3 py-2 text-xs text-on-salmon-muted">{t.demoBanner}</p>

      {step === "form" && (
        <form onSubmit={handleReview} className="mt-4 flex flex-col gap-4">
          <div role="group" aria-label={t.sideGroupLabel} className="grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={side === "buy"}
              onClick={() => handleSideChange("buy")}
              className={`rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
                side === "buy"
                  ? "border-military/40 bg-military-100 text-military"
                  : "border-border text-ink-muted hover:text-ink"
              }`}
            >
              {t.buy}
            </button>
            <button
              type="button"
              aria-pressed={side === "sell"}
              onClick={() => handleSideChange("sell")}
              className={`rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
                side === "sell"
                  ? "border-salmon bg-salmon-100 text-ink-peach"
                  : "border-border text-ink-muted hover:text-ink"
              }`}
            >
              {t.sell}
            </button>
          </div>

          <div>
            <label htmlFor="boleta-quantidade" className="mb-1 block text-xs text-ink-muted">
              {t.quantity}
            </label>
            <input
              id="boleta-quantidade"
              type="number"
              min="0"
              step="1"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="0"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm tabular-nums text-ink focus:outline-none focus:ring-2 focus:ring-salmon"
            />
          </div>

          <div>
            <label htmlFor="boleta-preco" className="mb-1 block text-xs text-ink-muted">
              {t.price}
            </label>
            <input
              id="boleta-preco"
              type="number"
              min="0"
              step="any"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm tabular-nums text-ink focus:outline-none focus:ring-2 focus:ring-salmon"
            />
          </div>

          <dl className="space-y-1.5 border-t border-border pt-3 text-xs">
            <div className="flex justify-between">
              <dt className="text-ink-muted">{t.totalEstimated}</dt>
              <dd className="font-medium text-ink">{formatBRL(Number.isFinite(total) ? total : 0)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">{t.fee}</dt>
              <dd className="text-ink-muted">{formatBRL(Number.isFinite(fee) ? fee : 0)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">{t.simulatedBalance}</dt>
              <dd className="text-ink-muted">{formatBRL(balance)}</dd>
            </div>
          </dl>

          {error && (
            <p role="alert" className="text-xs text-on-surface-negative">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="mt-1 inline-flex items-center justify-center rounded-full bg-salmon px-4 py-2.5 text-sm font-semibold text-on-salmon transition-colors hover:bg-salmon-600"
          >
            {t.reviewButton}
          </button>
        </form>
      )}

      {step === "resumo" && (
        <div className="mt-4 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-ink">{t.summaryTitle}</h3>
          <dl className="space-y-2 rounded-md border border-border p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted">{t.sideGroupLabel}</dt>
              <dd className="font-medium text-ink">{side === "buy" ? t.buy : t.sell}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">{t.quantity}</dt>
              <dd className="text-ink">{qtyNum}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">{t.price}</dt>
              <dd className="text-ink">{formatBRL(priceNumber)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">{t.totalEstimated}</dt>
              <dd className="font-semibold text-ink">{formatBRL(total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">{t.fee}</dt>
              <dd className="text-ink-muted">{formatBRL(fee)}</dd>
            </div>
          </dl>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setStep("form")}
              className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-salmon"
            >
              {t.backToEditButton}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 rounded-full bg-salmon px-4 py-2.5 text-sm font-semibold text-on-salmon transition-colors hover:bg-salmon-600"
            >
              {t.confirmButton}
            </button>
          </div>
        </div>
      )}

      {step === "confirmado" && (
        <div className="mt-4 flex flex-col gap-4">
          <p role="status" className="rounded-md border border-value-positive/40 bg-value-positive/10 px-4 py-3 text-sm text-military">
            {t.result(side, qtyNum, oferta.name)}
          </p>
          <button
            type="button"
            onClick={handleNewOrder}
            className="rounded-full border border-border px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-salmon"
          >
            {t.newOrderButton}
          </button>
        </div>
      )}
    </div>
  );
}

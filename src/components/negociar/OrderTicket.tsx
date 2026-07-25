"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { ptBr } from "@/lib/i18n/pt-br";
import type { Oferta } from "@/lib/mock/ofertas";

type OrderSide = "buy" | "sell";
type Step = "form" | "resumo" | "confirmado";

// Taxa estimada só para exibição na simulação — nunca cobrada de verdade,
// rotulada "a definir" (ver ptBr.negociar.boleta.taxa).
const TAXA_ESTIMADA = 0.005;

// Saldo simulado inicial da sessão — só em memória (useState), nunca
// persistido em localStorage/sessionStorage, mesma regra de LGPD das
// demais simulações do projeto (carteira em /perfil, dados de /ativos).
const SALDO_SIMULADO_INICIAL = 50_000;

export function OrderTicket({ oferta, onClose }: { oferta: Oferta; onClose: () => void }) {
  const t = ptBr.negociar.boleta;
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [side, setSide] = useState<OrderSide>("buy");
  const [quantidade, setQuantidade] = useState("");
  const [preco, setPreco] = useState(String(oferta.precoSimulado));
  const [step, setStep] = useState<Step>("form");
  const [erro, setErro] = useState<string | null>(null);
  const [saldo, setSaldo] = useState(SALDO_SIMULADO_INICIAL);

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

  const qtyNum = Number(quantidade);
  const precoNum = Number(preco);
  const total = Math.round(qtyNum * precoNum * 100) / 100;
  const taxa = Math.round(total * TAXA_ESTIMADA * 100) / 100;

  function handleSideChange(next: OrderSide) {
    setSide(next);
    setErro(null);
  }

  function handleRevisar(event: FormEvent) {
    event.preventDefault();
    if (!quantidade.trim() || !Number.isFinite(qtyNum) || qtyNum <= 0) {
      setErro(t.erros.quantidadeInvalida);
      return;
    }
    if (!preco.trim() || !Number.isFinite(precoNum) || precoNum <= 0) {
      setErro(t.erros.precoInvalido);
      return;
    }
    setErro(null);
    setStep("resumo");
  }

  function handleConfirmar() {
    setSaldo((atual) => (side === "buy" ? atual - (total + taxa) : atual + (total - taxa)));
    setStep("confirmado");
  }

  function handleNovaOrdem() {
    setQuantidade("");
    setPreco(String(oferta.precoSimulado));
    setErro(null);
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
          aria-label={t.fecharAria}
          className="rounded-full p-1 text-ink-muted transition-colors hover:bg-surface-alt hover:text-ink"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <p className="mt-3 rounded-md bg-salmon-100 px-3 py-2 text-xs text-on-salmon-muted">{t.demoBanner}</p>

      {step === "form" && (
        <form onSubmit={handleRevisar} className="mt-4 flex flex-col gap-4">
          <div role="group" aria-label={t.ladoGroupLabel} className="grid grid-cols-2 gap-2">
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
              {t.comprar}
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
              {t.vender}
            </button>
          </div>

          <div>
            <label htmlFor="boleta-quantidade" className="mb-1 block text-xs text-ink-muted">
              {t.quantidade}
            </label>
            <input
              id="boleta-quantidade"
              type="number"
              min="0"
              step="1"
              value={quantidade}
              onChange={(event) => setQuantidade(event.target.value)}
              placeholder="0"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm tabular-nums text-ink focus:outline-none focus:ring-2 focus:ring-salmon"
            />
          </div>

          <div>
            <label htmlFor="boleta-preco" className="mb-1 block text-xs text-ink-muted">
              {t.preco}
            </label>
            <input
              id="boleta-preco"
              type="number"
              min="0"
              step="any"
              value={preco}
              onChange={(event) => setPreco(event.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm tabular-nums text-ink focus:outline-none focus:ring-2 focus:ring-salmon"
            />
          </div>

          <dl className="space-y-1.5 border-t border-border pt-3 text-xs">
            <div className="flex justify-between">
              <dt className="text-ink-muted">{t.totalEstimado}</dt>
              <dd className="font-medium text-ink">{formatBRL(Number.isFinite(total) ? total : 0)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">{t.taxa}</dt>
              <dd className="text-ink-muted">{formatBRL(Number.isFinite(taxa) ? taxa : 0)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">{t.saldoSimulado}</dt>
              <dd className="text-ink-muted">{formatBRL(saldo)}</dd>
            </div>
          </dl>

          {erro && (
            <p role="alert" className="text-xs text-on-surface-negative">
              {erro}
            </p>
          )}

          <button
            type="submit"
            className="mt-1 inline-flex items-center justify-center rounded-full bg-salmon px-4 py-2.5 text-sm font-semibold text-on-salmon transition-colors hover:bg-salmon-600"
          >
            {t.revisarBotao}
          </button>
        </form>
      )}

      {step === "resumo" && (
        <div className="mt-4 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-ink">{t.resumoTitle}</h3>
          <dl className="space-y-2 rounded-md border border-border p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted">{t.ladoGroupLabel}</dt>
              <dd className="font-medium text-ink">{side === "buy" ? t.comprar : t.vender}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">{t.quantidade}</dt>
              <dd className="text-ink">{qtyNum}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">{t.preco}</dt>
              <dd className="text-ink">{formatBRL(precoNum)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">{t.totalEstimado}</dt>
              <dd className="font-semibold text-ink">{formatBRL(total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">{t.taxa}</dt>
              <dd className="text-ink-muted">{formatBRL(taxa)}</dd>
            </div>
          </dl>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setStep("form")}
              className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-salmon"
            >
              {t.voltarEditarBotao}
            </button>
            <button
              type="button"
              onClick={handleConfirmar}
              className="flex-1 rounded-full bg-salmon px-4 py-2.5 text-sm font-semibold text-on-salmon transition-colors hover:bg-salmon-600"
            >
              {t.confirmarBotao}
            </button>
          </div>
        </div>
      )}

      {step === "confirmado" && (
        <div className="mt-4 flex flex-col gap-4">
          <p role="status" className="rounded-md border border-value-positive/40 bg-value-positive/10 px-4 py-3 text-sm text-military">
            {t.resultado(side, qtyNum, oferta.nome)}
          </p>
          <button
            type="button"
            onClick={handleNovaOrdem}
            className="rounded-full border border-border px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-salmon"
          >
            {t.novaOrdemBotao}
          </button>
        </div>
      )}
    </div>
  );
}

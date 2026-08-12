"use client";

import { useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import {
  activateOffering,
  closeOffering,
  createOffering,
  type OfferingActionState,
} from "@/app/empresa/ofertas/actions";
import { SelectField, TextField } from "@/components/perfil/FormField";
import { formatBRL } from "@/lib/format";
import { ptBr } from "@/lib/i18n/pt-br";
import type { TokenCategory } from "@/lib/mock/ativos";
import { MONEY_FORMAT, reaisToCents } from "@/lib/money";

export type OfferingRow = {
  id: string;
  status: "draft" | "active" | "funded" | "failed" | "settled" | "cancelled";
  target_min_cents: number;
  base_cap_cents: number;
  hard_cap_cents: number;
  share_price_cents: number | null;
  category: TokenCategory | null;
  opens_at: string;
  closes_at: string;
  created_at: string;
  /** Soma de investments pagos/liquidados desta oferta — derivado, não vem da tabela offerings. */
  paidCents: number;
  /** Refs (MOCK-TX-...) dos eventos tokens_issued já gravados para esta oferta. */
  tokenRefs: string[];
};

const OFFERING_CATEGORIES: TokenCategory[] = ["pmes", "agro", "imobiliario", "auto", "divida"];

type FormState = {
  baseCapReais: string;
  targetMinReais: string;
  additionalLotPct: string;
  windowDays: string;
  sharePriceReais: string;
  categoria: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  baseCapReais: "",
  targetMinReais: "",
  additionalLotPct: "0",
  windowDays: "",
  sharePriceReais: "",
  categoria: "",
};

const quotasFormatter = new Intl.NumberFormat("pt-BR");

// Preview ao vivo do número de cotas — null enquanto qualquer um dos dois
// valores estiver vazio/inválido/zero (nunca divide por zero). O aviso de
// não-divisibilidade só aparece quando os dois valores estiverem preenchidos
// e válidos; o CHECK do banco (offerings_share_price_cents_check) continua
// sendo o backstop real, isto aqui é só UX.
function computeQuotasPreview(
  baseCapReais: string,
  sharePriceReais: string,
): { quotas: bigint; exact: boolean } | null {
  if (!baseCapReais.trim() || !sharePriceReais.trim()) return null;
  const baseCapCents = reaisToCents(baseCapReais);
  const sharePriceCents = reaisToCents(sharePriceReais);
  if (baseCapCents === null || sharePriceCents === null || sharePriceCents <= BigInt(0)) return null;
  return { quotas: baseCapCents / sharePriceCents, exact: baseCapCents % sharePriceCents === BigInt(0) };
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

function validate(data: FormState): FormErrors {
  const errors: FormErrors = {};
  const t = ptBr.empresaOfertas.erros;

  if (!MONEY_FORMAT.test(data.baseCapReais.trim())) errors.baseCapReais = t.valorInvalido;
  if (!MONEY_FORMAT.test(data.targetMinReais.trim())) errors.targetMinReais = t.valorInvalido;

  const pct = Number(data.additionalLotPct);
  if (!Number.isInteger(pct) || pct < 0 || pct > 25) errors.additionalLotPct = t.loteInvalido;

  const dias = Number(data.windowDays);
  if (!Number.isInteger(dias) || dias < 1 || dias > 180) errors.windowDays = t.prazoInvalido;

  if (!MONEY_FORMAT.test(data.sharePriceReais.trim())) {
    errors.sharePriceReais = t.valorPorCotaInvalido;
  } else {
    const preview = computeQuotasPreview(data.baseCapReais, data.sharePriceReais);
    if (preview && !preview.exact) errors.sharePriceReais = t.valorPorCotaNaoDivide;
  }

  if (!OFFERING_CATEGORIES.includes(data.categoria as TokenCategory)) errors.categoria = t.categoriaInvalida;

  return errors;
}

export function OfertasPage({ offerings }: { offerings: OfferingRow[] }) {
  const t = ptBr.empresaOfertas;
  const [draft, setDraft] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [createState, setCreateState] = useState<OfferingActionState | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [activateError, setActivateError] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const quotasPreview = computeQuotasPreview(draft.baseCapReais, draft.sharePriceReais);

  function handleFieldChange(field: keyof FormState) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const raw = event.target.value;
      setDraft((current) => ({ ...current, [field]: raw }));
    };
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validate(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setCreateState(null);
    startTransition(async () => {
      const result = await createOffering({
        baseCapReais: draft.baseCapReais,
        targetMinReais: draft.targetMinReais,
        additionalLotPct: draft.additionalLotPct,
        windowDays: draft.windowDays,
        sharePriceReais: draft.sharePriceReais,
        categoria: draft.categoria,
      });
      if (result.status === "error") {
        setCreateState(result);
        if (result.fieldErrors) {
          setErrors((current) => ({ ...current, ...result.fieldErrors }));
        }
      } else {
        setDraft(EMPTY_FORM);
      }
    });
  }

  function handleActivate(offeringId: string) {
    setActivateError(null);
    setActivatingId(offeringId);
    startTransition(async () => {
      const result = await activateOffering(offeringId);
      if (result.status === "error") {
        setActivateError(result.message);
      }
      setActivatingId(null);
    });
  }

  function handleClose(offeringId: string) {
    setCloseError(null);
    setClosingId(offeringId);
    startTransition(async () => {
      const result = await closeOffering(offeringId);
      if (result.status === "error") {
        setCloseError(result.message);
      }
      setClosingId(null);
    });
  }

  return (
    <main className="flex flex-1 flex-col bg-military">
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-on-military">{t.titulo}</h1>
        <p className="mt-2 text-sm text-on-military-muted">{t.subtitulo}</p>

        <section className="mt-8">
          {offerings.length === 0 ? (
            <p className="rounded-lg border border-panel-border bg-panel p-5 text-sm text-on-military-muted">
              {t.vazio}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {offerings.map((offering) => (
                <li key={offering.id} className="rounded-lg border border-panel-border bg-panel p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-on-military">
                        {formatBRL(offering.base_cap_cents / 100)}
                      </p>
                      <p className="text-xs text-on-military-muted">
                        {t.card.criadaEm} {formatDate(offering.created_at)}
                      </p>
                    </div>
                    <span className="rounded-full border border-panel-border bg-military-600/40 px-3 py-1 text-xs font-medium text-on-military">
                      {t.status[offering.status]}
                    </span>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                    <div>
                      <dt className="text-xs text-on-military-muted">{t.card.metaMinima}</dt>
                      <dd className="mt-0.5 text-sm text-on-military">
                        {formatBRL(offering.target_min_cents / 100)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-on-military-muted">{t.card.teto}</dt>
                      <dd className="mt-0.5 text-sm text-on-military">
                        {formatBRL(offering.hard_cap_cents / 100)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-on-military-muted">{t.card.pago}</dt>
                      <dd className="mt-0.5 text-sm text-on-military">{formatBRL(offering.paidCents / 100)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-on-military-muted">{t.card.janela}</dt>
                      <dd className="mt-0.5 text-sm text-on-military">
                        {formatDate(offering.opens_at)} – {formatDate(offering.closes_at)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-on-military-muted">{t.card.valorPorCota}</dt>
                      <dd className="mt-0.5 text-sm text-on-military">
                        {offering.share_price_cents === null
                          ? t.card.naoInformado
                          : formatBRL(offering.share_price_cents / 100)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-on-military-muted">{t.card.numeroCotas}</dt>
                      <dd className="mt-0.5 text-sm text-on-military">
                        {offering.share_price_cents === null
                          ? t.card.naoInformado
                          : quotasFormatter.format(offering.base_cap_cents / offering.share_price_cents)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-on-military-muted">{t.card.categoria}</dt>
                      <dd className="mt-0.5 text-sm text-on-military">
                        {offering.category === null ? t.card.naoInformado : ptBr.ativos.categorias[offering.category]}
                      </dd>
                    </div>
                  </dl>

                  {offering.status === "draft" && (
                    <button
                      type="button"
                      onClick={() => handleActivate(offering.id)}
                      disabled={isPending && activatingId === offering.id}
                      className="mt-4 rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPending && activatingId === offering.id ? t.ativandoBotao : t.ativarBotao}
                    </button>
                  )}

                  {offering.status === "active" && (
                    <div className="mt-4 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => handleClose(offering.id)}
                        disabled={isPending && closingId === offering.id}
                        className="self-start rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isPending && closingId === offering.id ? t.fechandoBotao : t.fecharBotao}
                      </button>
                      <p className="text-xs text-on-military-muted">{t.fecharAviso}</p>
                    </div>
                  )}

                  {offering.status === "failed" && (
                    <p className="mt-4 text-sm text-on-military-muted">{t.resultado.failed}</p>
                  )}

                  {offering.status === "settled" && (
                    <div className="mt-4">
                      <p className="text-sm text-on-military-muted">{t.resultado.funded}</p>
                      {offering.tokenRefs.length > 0 && (
                        <div className="mt-2 rounded-md border border-panel-border bg-military/40 p-3">
                          <p className="text-xs text-on-military-muted">
                            {t.resultado.tokensEmitidos}: {offering.tokenRefs.length}
                          </p>
                          <ul className="mt-1 flex flex-col gap-1">
                            {offering.tokenRefs.map((ref) => (
                              <li key={ref} className="text-xs text-on-military-muted">
                                {t.resultado.ref}: <code className="text-on-military">{ref}</code>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          {activateError && (
            <p role="alert" className="mt-3 text-sm text-value-negative">
              {activateError}
            </p>
          )}
          {closeError && (
            <p role="alert" className="mt-3 text-sm text-value-negative">
              {closeError}
            </p>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-on-military">{t.criarTitulo}</h2>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="mt-4 flex flex-col gap-6 rounded-lg border border-panel-border bg-panel p-6"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                id="oferta-valor"
                label={t.campos.valorOferta}
                value={draft.baseCapReais}
                onChange={handleFieldChange("baseCapReais")}
                error={errors.baseCapReais}
                inputMode="decimal"
                placeholder="5.000.000,00"
              />
              <TextField
                id="oferta-meta-minima"
                label={t.campos.metaMinima}
                value={draft.targetMinReais}
                onChange={handleFieldChange("targetMinReais")}
                error={errors.targetMinReais}
                inputMode="decimal"
                placeholder="1.000.000,00"
              />
              <TextField
                id="oferta-lote"
                label={t.campos.loteAdicional}
                value={draft.additionalLotPct}
                onChange={handleFieldChange("additionalLotPct")}
                error={errors.additionalLotPct}
                inputMode="numeric"
                placeholder="0"
              />
              <TextField
                id="oferta-prazo"
                label={t.campos.prazoDias}
                value={draft.windowDays}
                onChange={handleFieldChange("windowDays")}
                error={errors.windowDays}
                inputMode="numeric"
                placeholder="180"
              />
              <TextField
                id="oferta-valor-cota"
                label={t.campos.valorPorCota}
                value={draft.sharePriceReais}
                onChange={handleFieldChange("sharePriceReais")}
                error={errors.sharePriceReais}
                inputMode="decimal"
                placeholder="100,00"
              />
              <SelectField
                id="oferta-categoria"
                label={t.campos.categoria}
                value={draft.categoria}
                onChange={handleFieldChange("categoria")}
                error={errors.categoria}
                placeholder={t.campos.categoriaPlaceholder}
              >
                {OFFERING_CATEGORIES.map((categoria) => (
                  <option key={categoria} value={categoria}>
                    {ptBr.ativos.categorias[categoria]}
                  </option>
                ))}
              </SelectField>
            </div>

            <p className="text-xs text-on-military-muted">{t.categoriaAviso}</p>

            {quotasPreview && (
              <p className="text-xs text-on-military-muted">
                {quotasPreview.exact
                  ? t.cotasPreview(quotasFormatter.format(quotasPreview.quotas))
                  : t.erros.valorPorCotaNaoDivide}
              </p>
            )}

            {createState?.status === "error" && (
              <p role="alert" className="text-sm text-value-negative">
                {createState.message}
              </p>
            )}

            <div>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? t.criandoBotao : t.criarBotao}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

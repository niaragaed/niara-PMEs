"use client";

import { useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { closeOffering, createOffering, type OfferingActionState } from "@/app/empresa/ofertas/actions";
import { SelectField, TextField } from "@/components/perfil/FormField";
import { SyncStatusBadge } from "@/components/empresa/publicar/SyncStatusBadge";
import { NetworkBadge } from "@/components/solana/NetworkBadge";
import { solanaExplorerAccountLink } from "@/lib/solana/config";
import { formatBRL } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { TokenCategory } from "@/lib/mock/assets";
import { MONEY_FORMAT, reaisToCents } from "@/lib/money";
import { useDictionary } from "@/lib/i18n/client";

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
  /** On-chain publication (Phase 3) — orthogonal to `status` (see CLAUDE.md, "/empresa/ofertas screen"):
   * an offering published on Sepolia stays status='draft' from Supabase's point of view. */
  sync_status: "nao_onchain" | "pendente" | "confirmada" | "divergente";
  contract_address: string | null;
  token_address: string | null;
  /** Network of the on-chain publication (migration 0017). */
  rede: "sepolia" | "solana-devnet";
  /** Sum of this offering's paid/settled investments — derived, it doesn't come from the offerings table. */
  paidCents: number;
  /** Refs (MOCK-TX-...) of the tokens_issued events already recorded for this offering. */
  tokenRefs: string[];
};

const OFFERING_CATEGORIES: TokenCategory[] = ["pmes", "agro", "imobiliario", "auto", "divida"];

type FormState = {
  baseCapReais: string;
  targetMinReais: string;
  additionalLotPct: string;
  windowDays: string;
  sharePriceReais: string;
  category: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  baseCapReais: "",
  targetMinReais: "",
  additionalLotPct: "0",
  windowDays: "",
  sharePriceReais: "",
  category: "",
};

const quotasFormatter = new Intl.NumberFormat("pt-BR");

// Live preview of the number of shares — null while either of the two
// values is empty/invalid/zero (never divides by zero). The
// non-divisibility notice only shows up when both values are filled in
// and valid; the database CHECK (offerings_share_price_cents_check) remains
// the real backstop, this is just UX.
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

// Same pattern as PublishOnChainPage.tsx — a small helper, duplicated instead of extracted
// into a shared module (only 2 uses, see the convention of not abstracting without need).
function explorerAddress(network: OfferingRow["rede"], address: string) {
  if (network === "solana-devnet") return solanaExplorerAccountLink(address);
  return `https://sepolia.etherscan.io/address/${address}`;
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

function validate(data: FormState, dict: Dictionary): FormErrors {
  const errors: FormErrors = {};
  const t = dict.companyOfferings.errors;

  if (!MONEY_FORMAT.test(data.baseCapReais.trim())) errors.baseCapReais = t.invalidValue;
  if (!MONEY_FORMAT.test(data.targetMinReais.trim())) errors.targetMinReais = t.invalidValue;

  const pct = Number(data.additionalLotPct);
  if (!Number.isInteger(pct) || pct < 0 || pct > 25) errors.additionalLotPct = t.invalidLot;

  const days = Number(data.windowDays);
  if (!Number.isInteger(days) || days < 1 || days > 180) errors.windowDays = t.invalidDeadline;

  if (!MONEY_FORMAT.test(data.sharePriceReais.trim())) {
    errors.sharePriceReais = t.invalidValuePerShare;
  } else {
    const preview = computeQuotasPreview(data.baseCapReais, data.sharePriceReais);
    if (preview && !preview.exact) errors.sharePriceReais = t.valuePerShareDoesNotDivide;
  }

  if (!OFFERING_CATEGORIES.includes(data.category as TokenCategory)) errors.category = t.invalidCategory;

  return errors;
}

export function OfferingsPage({ offerings }: { offerings: OfferingRow[] }) {
  const dict = useDictionary();
  const t = dict.companyOfferings;
  const [draft, setDraft] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [createState, setCreateState] = useState<OfferingActionState | null>(null);
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
    const nextErrors = validate(draft, dict);
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
        category: draft.category,
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
        <h1 className="text-3xl font-semibold tracking-tight text-on-military">{t.title}</h1>
        <p className="mt-2 text-sm text-on-military-muted">{t.subtitle}</p>

        <section className="mt-8">
          {offerings.length === 0 ? (
            <p className="rounded-lg border border-panel-border bg-panel p-5 text-sm text-on-military-muted">
              {t.empty}
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
                        {t.card.createdOn} {formatDate(offering.created_at)}
                      </p>
                    </div>
                    <span className="rounded-full border border-panel-border bg-military-600/40 px-3 py-1 text-xs font-medium text-on-military">
                      {t.status[offering.status]}
                    </span>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                    <div>
                      <dt className="text-xs text-on-military-muted">{t.card.minTarget}</dt>
                      <dd className="mt-0.5 text-sm text-on-military">
                        {formatBRL(offering.target_min_cents / 100)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-on-military-muted">{t.card.cap}</dt>
                      <dd className="mt-0.5 text-sm text-on-military">
                        {formatBRL(offering.hard_cap_cents / 100)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-on-military-muted">{t.card.paid}</dt>
                      <dd className="mt-0.5 text-sm text-on-military">{formatBRL(offering.paidCents / 100)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-on-military-muted">{t.card.window}</dt>
                      <dd className="mt-0.5 text-sm text-on-military">
                        {formatDate(offering.opens_at)} – {formatDate(offering.closes_at)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-on-military-muted">{t.card.valuePerShare}</dt>
                      <dd className="mt-0.5 text-sm text-on-military">
                        {offering.share_price_cents === null
                          ? t.card.notProvided
                          : formatBRL(offering.share_price_cents / 100)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-on-military-muted">{t.card.shareCount}</dt>
                      <dd className="mt-0.5 text-sm text-on-military">
                        {offering.share_price_cents === null
                          ? t.card.notProvided
                          : quotasFormatter.format(offering.base_cap_cents / offering.share_price_cents)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-on-military-muted">{t.card.category}</dt>
                      <dd className="mt-0.5 text-sm text-on-military">
                        {offering.category === null ? t.card.notProvided : dict.assets.categories[offering.category]}
                      </dd>
                    </div>
                  </dl>

                  {offering.status === "draft" && offering.sync_status === "nao_onchain" && (
                    <div className="mt-4 flex flex-col gap-2">
                      <p className="text-xs text-on-military-muted">{t.activateNotice}</p>
                      <a
                        href={`/empresa/ofertas/${offering.id}/publicar`}
                        className="self-start rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600"
                      >
                        {t.publishLink}
                      </a>
                    </div>
                  )}

                  {offering.status === "draft" && offering.sync_status === "pendente" && (
                    <div className="mt-4 rounded-md border border-panel-border bg-military/40 p-3">
                      <SyncStatusBadge status={offering.sync_status} />
                      <p className="mt-1 text-xs text-on-military-muted">{t.onchainStatus.pendente.text}</p>
                      <a
                        href={`/empresa/ofertas/${offering.id}/publicar`}
                        className="mt-2 inline-block text-xs font-medium text-salmon hover:text-salmon-600"
                      >
                        {t.onchainStatus.pendente.link}
                      </a>
                    </div>
                  )}

                  {offering.status === "draft" && offering.sync_status === "confirmada" && (
                    <div className="mt-4 rounded-md border border-panel-border bg-military/40 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <SyncStatusBadge status={offering.sync_status} />
                        <NetworkBadge rede={offering.rede} />
                      </div>
                      {offering.contract_address && (
                        <p className="mt-1 text-xs text-on-military-muted">
                          {t.onchainStatus.confirmada.contract}:{" "}
                          <a
                            href={explorerAddress(offering.rede, offering.contract_address)}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-salmon hover:text-salmon-600"
                          >
                            {offering.contract_address}
                          </a>
                        </p>
                      )}
                      {offering.token_address && (
                        <p className="mt-1 text-xs text-on-military-muted">
                          {t.onchainStatus.confirmada.token}:{" "}
                          <a
                            href={explorerAddress(offering.rede, offering.token_address)}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-salmon hover:text-salmon-600"
                          >
                            {offering.token_address}
                          </a>
                        </p>
                      )}
                      <a
                        href={`/negociar/oferta/${offering.id}`}
                        className="mt-2 inline-block text-xs font-medium text-salmon hover:text-salmon-600"
                      >
                        {t.onchainStatus.confirmada.viewOffering}
                      </a>
                    </div>
                  )}

                  {offering.status === "draft" && offering.sync_status === "divergente" && (
                    <div role="alert" className="mt-4 rounded-md border border-value-negative/30 bg-value-negative/10 p-3">
                      <SyncStatusBadge status={offering.sync_status} />
                      <p className="mt-1 text-xs text-value-negative">{t.onchainStatus.divergente.text}</p>
                      <a
                        href={`/empresa/ofertas/${offering.id}/publicar`}
                        className="mt-2 inline-block text-xs font-medium text-value-negative underline"
                      >
                        {t.onchainStatus.divergente.link}
                      </a>
                    </div>
                  )}

                  {offering.status === "active" && (
                    <div className="mt-4 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => handleClose(offering.id)}
                        disabled={isPending && closingId === offering.id}
                        className="self-start rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isPending && closingId === offering.id ? t.closingButton : t.closeButton}
                      </button>
                      <p className="text-xs text-on-military-muted">{t.closeNotice}</p>
                    </div>
                  )}

                  {offering.status === "failed" && (
                    <p className="mt-4 text-sm text-on-military-muted">{t.result.failed}</p>
                  )}

                  {offering.status === "settled" && (
                    <div className="mt-4">
                      <p className="text-sm text-on-military-muted">{t.result.funded}</p>
                      {offering.tokenRefs.length > 0 && (
                        <div className="mt-2 rounded-md border border-panel-border bg-military/40 p-3">
                          <p className="text-xs text-on-military-muted">
                            {t.result.issuedTokens}: {offering.tokenRefs.length}
                          </p>
                          <ul className="mt-1 flex flex-col gap-1">
                            {offering.tokenRefs.map((ref) => (
                              <li key={ref} className="text-xs text-on-military-muted">
                                {t.result.ref}: <code className="text-on-military">{ref}</code>
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
          {closeError && (
            <p role="alert" className="mt-3 text-sm text-value-negative">
              {closeError}
            </p>
          )}
        </section>

        <section id="create-offering" className="mt-10 scroll-mt-24">
          <h2 className="text-xl font-semibold text-on-military">{t.createTitle}</h2>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="mt-4 flex flex-col gap-6 rounded-lg border border-panel-border bg-panel p-6"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                id="offering-value"
                label={t.fields.offeringValue}
                value={draft.baseCapReais}
                onChange={handleFieldChange("baseCapReais")}
                error={errors.baseCapReais}
                inputMode="decimal"
                placeholder="5.000.000,00"
              />
              <TextField
                id="offering-min-target"
                label={t.fields.minTarget}
                value={draft.targetMinReais}
                onChange={handleFieldChange("targetMinReais")}
                error={errors.targetMinReais}
                inputMode="decimal"
                placeholder="1.000.000,00"
              />
              <TextField
                id="offering-lot"
                label={t.fields.additionalLot}
                value={draft.additionalLotPct}
                onChange={handleFieldChange("additionalLotPct")}
                error={errors.additionalLotPct}
                inputMode="numeric"
                placeholder="0"
              />
              <TextField
                id="offering-deadline"
                label={t.fields.deadlineDays}
                value={draft.windowDays}
                onChange={handleFieldChange("windowDays")}
                error={errors.windowDays}
                inputMode="numeric"
                placeholder="180"
              />
              <TextField
                id="offering-share-value"
                label={t.fields.valuePerShare}
                value={draft.sharePriceReais}
                onChange={handleFieldChange("sharePriceReais")}
                error={errors.sharePriceReais}
                inputMode="decimal"
                placeholder="100,00"
              />
              <SelectField
                id="offering-category"
                label={t.fields.category}
                value={draft.category}
                onChange={handleFieldChange("category")}
                error={errors.category}
                placeholder={t.fields.categoryPlaceholder}
              >
                {OFFERING_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {dict.assets.categories[category]}
                  </option>
                ))}
              </SelectField>
            </div>

            <p className="text-xs text-on-military-muted">{t.categoryNotice}</p>

            {quotasPreview && (
              <p className="text-xs text-on-military-muted">
                {quotasPreview.exact
                  ? t.sharesPreview(quotasFormatter.format(quotasPreview.quotas))
                  : t.errors.valuePerShareDoesNotDivide}
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
                {isPending ? t.creatingButton : t.createButton}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

"use client";

import { useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { createAccount, type CreateAccountState } from "@/app/cadastro/actions";
import { ReadField, TextField } from "@/components/perfil/FormField";
import { ptBr } from "@/lib/i18n/pt-br";
import { isValidDocumento, maskDocumento, type TipoPessoa } from "@/lib/masks";

type FormData = {
  fullName: string;
  legalName: string;
  taxId: string;
  annualRevenueReais: string;
};

type FormErrors = Partial<Record<keyof FormData, string>>;

const EMPTY_FORM: FormData = {
  fullName: "",
  legalName: "",
  taxId: "",
  annualRevenueReais: "",
};

function validate(data: FormData, tipoPessoa: TipoPessoa): FormErrors {
  const errors: FormErrors = {};
  const t = ptBr.cadastro.erros;

  if (tipoPessoa === "pf") {
    if (!data.fullName.trim()) errors.fullName = t.obrigatorio;
  } else {
    if (!data.legalName.trim()) errors.legalName = t.obrigatorio;
    if (!data.annualRevenueReais.trim()) errors.annualRevenueReais = t.obrigatorio;
  }
  if (!isValidDocumento(data.taxId, tipoPessoa)) errors.taxId = t.documentoInvalido;
  return errors;
}

export function CadastroPage({ email }: { email: string }) {
  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa>("pf");
  const [draft, setDraft] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverState, setServerState] = useState<CreateAccountState | null>(null);
  const [isPending, startTransition] = useTransition();

  const t = ptBr.cadastro;
  const documentoLabel = tipoPessoa === "pf" ? t.campos.documentoCpf : t.campos.documentoCnpj;

  function handleTipoPessoaChange(next: TipoPessoa) {
    setTipoPessoa(next);
    setDraft((current) => ({ ...current, taxId: "" }));
    setErrors((current) => ({ ...current, taxId: undefined }));
    setServerState(null);
  }

  function handleFieldChange(field: keyof FormData) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      const masked = field === "taxId" ? maskDocumento(raw, tipoPessoa) : raw;
      setDraft((current) => ({ ...current, [field]: masked }));
    };
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validate(draft, tipoPessoa);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setServerState(null);
    startTransition(async () => {
      const result =
        tipoPessoa === "pf"
          ? await createAccount("investor", { fullName: draft.fullName, taxId: draft.taxId })
          : await createAccount("issuer", {
              legalName: draft.legalName,
              taxId: draft.taxId,
              annualRevenueReais: draft.annualRevenueReais,
            });
      // Sucesso redireciona dentro da própria action (redirect() lança e
      // interrompe a execução) — só chega aqui em caso de erro.
      setServerState(result);
      if (result.fieldErrors) {
        setErrors((current) => ({ ...current, ...result.fieldErrors }));
      }
    });
  }

  return (
    <main className="flex flex-1 flex-col bg-military">
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-on-military">{t.titulo}</h1>
        <p className="mt-2 text-sm text-on-military-muted">{t.subtitulo}</p>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-8 flex flex-col gap-6 rounded-lg border border-panel-border bg-panel p-6"
        >
          <fieldset>
            <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-on-military-muted">
              {t.tipoPessoa.legend}
            </legend>
            <div className="inline-flex flex-wrap gap-1 rounded-full bg-military-600/40 p-1">
              <button
                type="button"
                onClick={() => handleTipoPessoaChange("pf")}
                aria-pressed={tipoPessoa === "pf"}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  tipoPessoa === "pf" ? "bg-salmon text-on-salmon" : "text-on-military-muted hover:text-on-military"
                }`}
              >
                {t.tipoPessoa.pessoaFisica}
              </button>
              <button
                type="button"
                onClick={() => handleTipoPessoaChange("pj")}
                aria-pressed={tipoPessoa === "pj"}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  tipoPessoa === "pj" ? "bg-salmon text-on-salmon" : "text-on-military-muted hover:text-on-military"
                }`}
              >
                {t.tipoPessoa.pessoaJuridica}
              </button>
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ReadField label={t.campos.email} value={email} />
            {tipoPessoa === "pf" ? (
              <TextField
                id="cadastro-nome"
                label={t.campos.nomeCompleto}
                value={draft.fullName}
                onChange={handleFieldChange("fullName")}
                error={errors.fullName}
                autoComplete="name"
              />
            ) : (
              <TextField
                id="cadastro-razao-social"
                label={t.campos.razaoSocial}
                value={draft.legalName}
                onChange={handleFieldChange("legalName")}
                error={errors.legalName}
              />
            )}
            <TextField
              id="cadastro-documento"
              label={documentoLabel}
              value={draft.taxId}
              onChange={handleFieldChange("taxId")}
              error={errors.taxId}
              inputMode="numeric"
              placeholder={tipoPessoa === "pf" ? "000.000.000-00" : "00.000.000/0000-00"}
            />
            {tipoPessoa === "pj" && (
              <TextField
                id="cadastro-receita"
                label={t.campos.receitaBrutaAnual}
                value={draft.annualRevenueReais}
                onChange={handleFieldChange("annualRevenueReais")}
                error={errors.annualRevenueReais}
                inputMode="decimal"
                placeholder="5.000.000,00"
              />
            )}
          </div>

          {serverState && (
            <p role="alert" className="text-sm text-value-negative">
              {serverState.message}
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? t.cadastrandoBotao : t.cadastrarBotao}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

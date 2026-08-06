"use client";

import { useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { Pencil } from "lucide-react";
import { updateProfile, type LoadedProfile } from "@/app/perfil/actions";
import { AvatarUpload } from "./AvatarUpload";
import { ReadField, SelectField, TextField } from "./FormField";
import { ptBr } from "@/lib/i18n/pt-br";
import {
  isValidCEP,
  isValidDataNascimento,
  isValidDocumento,
  isValidTelefone,
  maskCEP,
  maskDataNascimento,
  maskDocumento,
  maskTelefone,
  type TipoPessoa,
} from "@/lib/masks";

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

type FormData = {
  nomeCompleto: string;
  razaoSocial: string;
  nomeFantasia: string;
  documento: string;
  dataNascimento: string;
  annualRevenueReais: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
};

type FormErrors = Partial<Record<keyof FormData, string>>;

function display(value: string): string {
  return value.trim() || ptBr.perfil.dadosCadastro.naoInformado;
}

// Telefone é salvo/validado só como DDD + número (sem código de país, ver
// masks.ts); o "+55" é acrescentado aqui só para exibição, mesmo prefixo
// fixo mostrado no campo em modo de edição (TextField prefix="+55").
function displayTelefone(value: string): string {
  return value.trim() ? `+55 ${value.trim()}` : ptBr.perfil.dadosCadastro.naoInformado;
}

function tipoPessoaOf(role: LoadedProfile["role"]): TipoPessoa {
  return role === "investor" ? "pf" : "pj";
}

function toFormData(profile: LoadedProfile, tipoPessoa: TipoPessoa): FormData {
  const shared = {
    documento: maskDocumento(profile.taxId, tipoPessoa),
    telefone: maskTelefone(profile.phone),
    cep: maskCEP(profile.cep),
    logradouro: profile.logradouro,
    numero: profile.numero,
    complemento: profile.complemento,
    bairro: profile.bairro,
    cidade: profile.cidade,
    estado: profile.estado,
  };

  if (profile.role === "investor") {
    return {
      ...shared,
      nomeCompleto: profile.fullName,
      razaoSocial: "",
      nomeFantasia: "",
      dataNascimento: profile.birthDate,
      annualRevenueReais: "",
    };
  }

  return {
    ...shared,
    nomeCompleto: "",
    razaoSocial: profile.legalName,
    nomeFantasia: profile.tradeName,
    dataNascimento: "",
    annualRevenueReais: profile.annualRevenueReais,
  };
}

function validate(data: FormData, tipoPessoa: TipoPessoa): FormErrors {
  const errors: FormErrors = {};
  const t = ptBr.perfil.dadosCadastro.erros;

  if (tipoPessoa === "pf") {
    if (!data.nomeCompleto.trim()) errors.nomeCompleto = t.obrigatorio;
    if (!isValidDataNascimento(data.dataNascimento)) errors.dataNascimento = t.dataInvalida;
  } else {
    if (!data.razaoSocial.trim()) errors.razaoSocial = t.obrigatorio;
    if (!data.annualRevenueReais.trim()) errors.annualRevenueReais = t.obrigatorio;
  }
  if (!isValidDocumento(data.documento, tipoPessoa)) errors.documento = t.documentoInvalido;
  if (!isValidTelefone(data.telefone)) errors.telefone = t.telefoneInvalido;
  if (!isValidCEP(data.cep)) errors.cep = t.cepInvalido;
  if (!data.logradouro.trim()) errors.logradouro = t.obrigatorio;
  if (!data.numero.trim()) errors.numero = t.obrigatorio;
  if (!data.bairro.trim()) errors.bairro = t.obrigatorio;
  if (!data.cidade.trim()) errors.cidade = t.obrigatorio;
  if (!data.estado.trim()) errors.estado = t.obrigatorio;
  return errors;
}

export function PersonalDataSection({ profile }: { profile: LoadedProfile }) {
  const tipoPessoa = tipoPessoaOf(profile.role);

  // CPF/CNPJ, data de nascimento e endereço são dados sensíveis (LGPD) —
  // vivem em estado local só enquanto a seção está em edição; o valor de
  // referência é sempre o que veio do banco via `profile` (prop), nunca
  // localStorage/cookies.
  const [draft, setDraft] = useState<FormData>(() => toFormData(profile, tipoPessoa));
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const t = ptBr.perfil.dadosCadastro;
  const documentoLabel = tipoPessoa === "pf" ? t.campos.documentoCpf : t.campos.documentoCnpj;

  function startEdit() {
    setDraft(toFormData(profile, tipoPessoa));
    setErrors({});
    setServerError(null);
    setJustSaved(false);
    setMode("edit");
  }

  function cancelEdit() {
    setDraft(toFormData(profile, tipoPessoa));
    setErrors({});
    setServerError(null);
    setMode("view");
  }

  function handleFieldChange(field: keyof FormData) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const raw = event.target.value;
      let masked = raw;
      if (field === "documento") masked = maskDocumento(raw, tipoPessoa);
      else if (field === "dataNascimento") masked = maskDataNascimento(raw);
      else if (field === "telefone") masked = maskTelefone(raw);
      else if (field === "cep") masked = maskCEP(raw);
      setDraft((current) => ({ ...current, [field]: masked }));
    };
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validate(draft, tipoPessoa);
    setErrors(nextErrors);
    setServerError(null);
    if (Object.keys(nextErrors).length > 0) return;

    startTransition(async () => {
      const payload =
        tipoPessoa === "pf"
          ? {
              fullName: draft.nomeCompleto,
              taxId: draft.documento,
              birthDate: draft.dataNascimento,
              phone: draft.telefone,
              cep: draft.cep,
              logradouro: draft.logradouro,
              numero: draft.numero,
              complemento: draft.complemento,
              bairro: draft.bairro,
              cidade: draft.cidade,
              estado: draft.estado,
            }
          : {
              legalName: draft.razaoSocial,
              tradeName: draft.nomeFantasia,
              taxId: draft.documento,
              annualRevenueReais: draft.annualRevenueReais,
              phone: draft.telefone,
              cep: draft.cep,
              logradouro: draft.logradouro,
              numero: draft.numero,
              complemento: draft.complemento,
              bairro: draft.bairro,
              cidade: draft.cidade,
              estado: draft.estado,
            };

      const result = await updateProfile(payload);
      if (result.status === "error") {
        setServerError(result.message);
        if (result.fieldErrors) {
          setErrors((current) => ({ ...current, ...result.fieldErrors }));
        }
        return;
      }

      setJustSaved(true);
      setMode("view");
    });
  }

  return (
    <section id="dados-cadastro" aria-labelledby="dados-cadastro-heading" className="scroll-mt-24">
      <h2 id="dados-cadastro-heading" className="text-xl font-semibold text-on-military">
        {t.title}
      </h2>

      <div className="mt-6 rounded-lg border border-panel-border bg-panel p-6">
        <AvatarUpload />
      </div>

      {mode === "view" ? (
        <div className="mt-6 rounded-lg border border-panel-border bg-panel p-6">
          {justSaved && (
            <p className="mb-5 rounded-md border border-value-positive/30 bg-value-positive/10 px-3 py-2 text-xs text-value-positive">
              {t.salvoConfirmacao}
            </p>
          )}

          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <ReadField label={t.campos.pais} value={t.campos.brasil} />
            {tipoPessoa === "pf" ? (
              <ReadField label={t.campos.nomeCompleto} value={display(draft.nomeCompleto)} />
            ) : (
              <>
                <ReadField label={t.campos.razaoSocial} value={display(draft.razaoSocial)} />
                <ReadField label={t.campos.nomeFantasia} value={display(draft.nomeFantasia)} />
              </>
            )}
            <ReadField label={documentoLabel} value={display(draft.documento)} mono />
            {tipoPessoa === "pf" && (
              <ReadField label={t.campos.dataNascimento} value={display(draft.dataNascimento)} mono />
            )}
            {tipoPessoa === "pj" && (
              <ReadField
                label={t.campos.receitaBrutaAnual}
                value={draft.annualRevenueReais ? `R$ ${draft.annualRevenueReais}` : t.naoInformado}
                mono
              />
            )}
            <ReadField label={t.campos.email} value={profile.email} />
            <ReadField label={t.campos.telefone} value={displayTelefone(draft.telefone)} mono />
          </div>

          <div className="mt-6 border-t border-panel-border pt-5">
            <h3 className="text-xs font-medium uppercase tracking-wide text-on-military-muted">
              {t.secaoEndereco}
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <ReadField label={t.campos.cep} value={display(draft.cep)} mono />
              <ReadField label={t.campos.logradouro} value={display(draft.logradouro)} />
              <ReadField label={t.campos.numero} value={display(draft.numero)} />
              <ReadField label={t.campos.complemento} value={display(draft.complemento)} />
              <ReadField label={t.campos.bairro} value={display(draft.bairro)} />
              <ReadField
                label={`${t.campos.cidade} / ${t.campos.estado}`}
                value={
                  draft.cidade.trim() || draft.estado.trim()
                    ? `${display(draft.cidade)} / ${draft.estado || "—"}`
                    : t.naoInformado
                }
              />
            </div>
          </div>

          <button
            type="button"
            onClick={startEdit}
            className="mt-6 inline-flex items-center gap-1.5 rounded-md border border-panel-border px-4 py-2 text-sm font-medium text-on-military hover:border-salmon"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            {t.editar}
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-6 flex flex-col gap-6 rounded-lg border border-panel-border bg-panel p-6"
        >
          <fieldset className="flex flex-col gap-4">
            <legend className="text-xs font-medium uppercase tracking-wide text-on-military-muted">
              {t.secaoPessoal}
            </legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ReadField label={t.campos.pais} value={t.campos.brasil} />
              {tipoPessoa === "pf" ? (
                <TextField
                  id="pd-nome"
                  label={t.campos.nomeCompleto}
                  value={draft.nomeCompleto}
                  onChange={handleFieldChange("nomeCompleto")}
                  error={errors.nomeCompleto}
                  autoComplete="name"
                />
              ) : (
                <>
                  <TextField
                    id="pd-razao-social"
                    label={t.campos.razaoSocial}
                    value={draft.razaoSocial}
                    onChange={handleFieldChange("razaoSocial")}
                    error={errors.razaoSocial}
                  />
                  <TextField
                    id="pd-nome-fantasia"
                    label={t.campos.nomeFantasia}
                    value={draft.nomeFantasia}
                    onChange={handleFieldChange("nomeFantasia")}
                  />
                </>
              )}
              <TextField
                id="pd-documento"
                label={documentoLabel}
                value={draft.documento}
                onChange={handleFieldChange("documento")}
                error={errors.documento}
                inputMode="numeric"
                placeholder={tipoPessoa === "pf" ? "000.000.000-00" : "00.000.000/0000-00"}
              />
              {tipoPessoa === "pf" && (
                <TextField
                  id="pd-nascimento"
                  label={t.campos.dataNascimento}
                  value={draft.dataNascimento}
                  onChange={handleFieldChange("dataNascimento")}
                  error={errors.dataNascimento}
                  inputMode="numeric"
                  placeholder="DD/MM/AAAA"
                />
              )}
              {tipoPessoa === "pj" && (
                <TextField
                  id="pd-receita"
                  label={t.campos.receitaBrutaAnual}
                  value={draft.annualRevenueReais}
                  onChange={handleFieldChange("annualRevenueReais")}
                  error={errors.annualRevenueReais}
                  inputMode="decimal"
                  placeholder="5.000.000,00"
                />
              )}
              <ReadField label={t.campos.email} value={profile.email} />
              <TextField
                id="pd-telefone"
                label={t.campos.telefone}
                value={draft.telefone}
                onChange={handleFieldChange("telefone")}
                error={errors.telefone}
                inputMode="tel"
                placeholder="(00) 00000-0000"
                autoComplete="tel"
                prefix="+55"
              />
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-4">
            <legend className="text-xs font-medium uppercase tracking-wide text-on-military-muted">
              {t.secaoEndereco}
            </legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                id="pd-cep"
                label={t.campos.cep}
                value={draft.cep}
                onChange={handleFieldChange("cep")}
                error={errors.cep}
                inputMode="numeric"
                placeholder="00000-000"
              />
              <TextField
                id="pd-logradouro"
                label={t.campos.logradouro}
                value={draft.logradouro}
                onChange={handleFieldChange("logradouro")}
                error={errors.logradouro}
                autoComplete="address-line1"
              />
              <TextField
                id="pd-numero"
                label={t.campos.numero}
                value={draft.numero}
                onChange={handleFieldChange("numero")}
                error={errors.numero}
              />
              <TextField
                id="pd-complemento"
                label={t.campos.complemento}
                value={draft.complemento}
                onChange={handleFieldChange("complemento")}
              />
              <TextField
                id="pd-bairro"
                label={t.campos.bairro}
                value={draft.bairro}
                onChange={handleFieldChange("bairro")}
                error={errors.bairro}
              />
              <TextField
                id="pd-cidade"
                label={t.campos.cidade}
                value={draft.cidade}
                onChange={handleFieldChange("cidade")}
                error={errors.cidade}
                autoComplete="address-level2"
              />
              <SelectField
                id="pd-estado"
                label={t.campos.estado}
                value={draft.estado}
                onChange={handleFieldChange("estado")}
                error={errors.estado}
                placeholder={t.campos.selecionarEstado}
              >
                {UFS.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </SelectField>
            </div>
          </fieldset>

          {serverError && (
            <p role="alert" className="text-sm text-value-negative">
              {serverError}
            </p>
          )}

          <p className="text-[11px] text-on-military-muted">{t.salvarNota}</p>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? t.salvando : t.salvar}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={isPending}
              className="rounded-md border border-panel-border px-4 py-2 text-sm font-medium text-on-military-muted hover:text-on-military disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t.cancelar}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Pencil } from "lucide-react";
import { AvatarUpload } from "./AvatarUpload";
import { ReadField, SelectField, TextField } from "./FormField";
import { ptBr } from "@/lib/i18n/pt-br";
import {
  isValidCEP,
  isValidDataNascimento,
  isValidDocumento,
  isValidEmail,
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
  email: string;
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

const EMPTY_FORM: FormData = {
  nomeCompleto: "",
  razaoSocial: "",
  nomeFantasia: "",
  documento: "",
  dataNascimento: "",
  email: "",
  telefone: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
};

function display(value: string): string {
  return value.trim() || ptBr.perfil.dadosCadastro.naoInformado;
}

function validate(data: FormData, tipoPessoa: TipoPessoa): FormErrors {
  const errors: FormErrors = {};
  const t = ptBr.perfil.dadosCadastro.erros;

  if (tipoPessoa === "pf") {
    if (!data.nomeCompleto.trim()) errors.nomeCompleto = t.obrigatorio;
    if (!isValidDataNascimento(data.dataNascimento)) errors.dataNascimento = t.dataInvalida;
  } else {
    if (!data.razaoSocial.trim()) errors.razaoSocial = t.obrigatorio;
  }
  if (!isValidDocumento(data.documento, tipoPessoa)) errors.documento = t.documentoInvalido;
  if (!isValidEmail(data.email)) errors.email = t.emailInvalido;
  if (!isValidTelefone(data.telefone)) errors.telefone = t.telefoneInvalido;
  if (!isValidCEP(data.cep)) errors.cep = t.cepInvalido;
  if (!data.logradouro.trim()) errors.logradouro = t.obrigatorio;
  if (!data.numero.trim()) errors.numero = t.obrigatorio;
  if (!data.bairro.trim()) errors.bairro = t.obrigatorio;
  if (!data.cidade.trim()) errors.cidade = t.obrigatorio;
  if (!data.estado.trim()) errors.estado = t.obrigatorio;
  return errors;
}

export function PersonalDataSection() {
  // CPF/CNPJ, data de nascimento e endereço são dados sensíveis (LGPD) e,
  // como o site ainda não tem backend, vivem só neste estado de componente —
  // nunca em localStorage, cookies ou qualquer outro storage persistente.
  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa>("pf");
  const [saved, setSaved] = useState<FormData | null>(null);
  const [savedTipo, setSavedTipo] = useState<TipoPessoa>("pf");
  const [draft, setDraft] = useState<FormData>(EMPTY_FORM);
  const [mode, setMode] = useState<"view" | "edit">("edit");
  const [errors, setErrors] = useState<FormErrors>({});
  const [justSaved, setJustSaved] = useState(false);

  const t = ptBr.perfil.dadosCadastro;
  const documentoLabel = tipoPessoa === "pf" ? t.campos.documentoCpf : t.campos.documentoCnpj;
  const savedDocumentoLabel = savedTipo === "pf" ? t.campos.documentoCpf : t.campos.documentoCnpj;

  function handleTipoPessoaChange(next: TipoPessoa) {
    // trocar o tipo de pessoa limpa o documento — um CPF válido não pode
    // ficar preenchido num campo que virou CNPJ
    setTipoPessoa(next);
    setDraft((current) => ({ ...current, documento: "" }));
    setErrors((current) => ({ ...current, documento: undefined }));
  }

  function startEdit() {
    if (saved) setDraft(saved);
    setTipoPessoa(savedTipo);
    setErrors({});
    setJustSaved(false);
    setMode("edit");
  }

  function cancelEdit() {
    setErrors({});
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
    if (Object.keys(nextErrors).length > 0) return;

    setSaved(draft);
    setSavedTipo(tipoPessoa);
    setJustSaved(true);
    setMode("view");
  }

  return (
    <section id="dados-cadastro" aria-labelledby="dados-cadastro-heading" className="scroll-mt-24">
      <h2 id="dados-cadastro-heading" className="text-xl font-semibold text-on-military">
        {t.title}
      </h2>

      <div className="mt-6 rounded-lg border border-panel-border bg-panel p-6">
        <AvatarUpload />
      </div>

      {mode === "view" && saved ? (
        <div className="mt-6 rounded-lg border border-panel-border bg-panel p-6">
          {justSaved && (
            <p className="mb-5 rounded-md border border-value-positive/30 bg-value-positive/10 px-3 py-2 text-xs text-value-positive">
              {t.salvoConfirmacao}
            </p>
          )}

          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <ReadField label={t.campos.pais} value={t.campos.brasil} />
            {savedTipo === "pf" ? (
              <ReadField label={t.campos.nomeCompleto} value={display(saved.nomeCompleto)} />
            ) : (
              <>
                <ReadField label={t.campos.razaoSocial} value={display(saved.razaoSocial)} />
                <ReadField label={t.campos.nomeFantasia} value={display(saved.nomeFantasia)} />
              </>
            )}
            <ReadField label={savedDocumentoLabel} value={display(saved.documento)} mono />
            {savedTipo === "pf" && (
              <ReadField label={t.campos.dataNascimento} value={display(saved.dataNascimento)} mono />
            )}
            <ReadField label={t.campos.email} value={display(saved.email)} />
            <ReadField label={t.campos.telefone} value={display(saved.telefone)} mono />
          </div>

          <div className="mt-6 border-t border-panel-border pt-5">
            <h3 className="text-xs font-medium uppercase tracking-wide text-on-military-muted">
              {t.secaoEndereco}
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <ReadField label={t.campos.cep} value={display(saved.cep)} mono />
              <ReadField label={t.campos.logradouro} value={display(saved.logradouro)} />
              <ReadField label={t.campos.numero} value={display(saved.numero)} />
              <ReadField label={t.campos.complemento} value={display(saved.complemento)} />
              <ReadField label={t.campos.bairro} value={display(saved.bairro)} />
              <ReadField
                label={`${t.campos.cidade} / ${t.campos.estado}`}
                value={
                  saved.cidade.trim() || saved.estado.trim()
                    ? `${display(saved.cidade)} / ${saved.estado || "—"}`
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
              <TextField
                id="pd-email"
                label={t.campos.email}
                type="email"
                value={draft.email}
                onChange={handleFieldChange("email")}
                error={errors.email}
                autoComplete="email"
              />
              <TextField
                id="pd-telefone"
                label={t.campos.telefone}
                value={draft.telefone}
                onChange={handleFieldChange("telefone")}
                error={errors.telefone}
                inputMode="tel"
                placeholder="+55 (00) 00000-0000"
                autoComplete="tel"
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

          <p className="text-[11px] text-on-military-muted">{t.salvarNota}</p>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600"
            >
              {t.salvar}
            </button>
            {saved && (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-md border border-panel-border px-4 py-2 text-sm font-medium text-on-military-muted hover:text-on-military"
              >
                {t.cancelar}
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}

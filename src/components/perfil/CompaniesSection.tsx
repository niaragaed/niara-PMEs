"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { SelectField, TextField } from "./FormField";
import { ptBr } from "@/lib/i18n/pt-br";
import { isValidCNPJ, isValidEmail, isValidTelefone, maskCNPJ, maskTelefone } from "@/lib/masks";
import type { TokenCategory } from "@/lib/mock/ativos";

type Finalidade = "investidora" | "tokenizada";

type Company = {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  setor: TokenCategory | "";
  email: string;
  telefone: string;
  finalidade: Finalidade;
};

type FormData = Omit<Company, "id">;

type FormErrors = Partial<Record<keyof FormData, string>>;

const EMPTY_FORM: FormData = {
  razaoSocial: "",
  nomeFantasia: "",
  cnpj: "",
  setor: "",
  email: "",
  telefone: "",
  finalidade: "investidora",
};

const SETORES: TokenCategory[] = ["pmes", "agro", "imobiliario", "auto", "divida"];

function validate(data: FormData): FormErrors {
  const errors: FormErrors = {};
  const t = ptBr.perfil.empresas.erros;
  if (!data.razaoSocial.trim()) errors.razaoSocial = t.obrigatorio;
  if (!isValidCNPJ(data.cnpj)) errors.cnpj = t.cnpjInvalido;
  if (!data.setor) errors.setor = t.obrigatorio;
  if (!isValidEmail(data.email)) errors.email = t.emailInvalido;
  if (!isValidTelefone(data.telefone)) errors.telefone = t.telefoneInvalido;
  return errors;
}

export function CompaniesSection() {
  // CNPJ e demais dados da empresa vivem só neste estado de componente,
  // nunca em localStorage — mesma regra de dados de cadastro.
  const [companies, setCompanies] = useState<Company[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});

  const t = ptBr.perfil.empresas;

  function openNewForm() {
    setEditingId(null);
    setDraft(EMPTY_FORM);
    setErrors({});
    setFormOpen(true);
  }

  function openEditForm(company: Company) {
    setEditingId(company.id);
    setDraft({
      razaoSocial: company.razaoSocial,
      nomeFantasia: company.nomeFantasia,
      cnpj: company.cnpj,
      setor: company.setor,
      email: company.email,
      telefone: company.telefone,
      finalidade: company.finalidade,
    });
    setErrors({});
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setErrors({});
  }

  function handleFieldChange(field: keyof FormData) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const raw = event.target.value;
      let masked = raw;
      if (field === "cnpj") masked = maskCNPJ(raw);
      else if (field === "telefone") masked = maskTelefone(raw);
      setDraft((current) => ({ ...current, [field]: masked }));
    };
  }

  function handleRemove(id: string) {
    setCompanies((current) => current.filter((company) => company.id !== id));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validate(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (editingId) {
      setCompanies((current) =>
        current.map((company) => (company.id === editingId ? { ...draft, id: editingId } : company)),
      );
    } else {
      setCompanies((current) => [...current, { ...draft, id: crypto.randomUUID() }]);
    }
    setFormOpen(false);
    setEditingId(null);
  }

  return (
    <section id="empresas" aria-labelledby="empresas-heading" className="scroll-mt-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="empresas-heading" className="text-xl font-semibold text-on-military">
            {t.title}
          </h2>
          <p className="mt-1 text-sm text-on-military-muted">{t.subtitle}</p>
        </div>
        {!formOpen && (
          <button
            type="button"
            onClick={openNewForm}
            className="inline-flex items-center gap-1.5 rounded-full bg-salmon px-4 py-2 text-sm font-medium text-on-salmon hover:bg-salmon-600"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t.cadastrarBotao}
          </button>
        )}
      </div>

      {formOpen && (
        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-6 flex flex-col gap-6 rounded-lg border border-panel-border bg-panel p-6"
        >
          <fieldset>
            <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-on-military-muted">
              {t.finalidade.legend}
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(["investidora", "tokenizada"] as const).map((finalidade) => (
                <label
                  key={finalidade}
                  className={`flex cursor-pointer flex-col gap-1 rounded-md border px-4 py-3 text-sm transition-colors ${
                    draft.finalidade === finalidade
                      ? "border-salmon bg-salmon/10 text-on-military"
                      : "border-panel-border text-on-military-muted hover:border-salmon/50"
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium text-on-military">
                    <input
                      type="radio"
                      name="finalidade"
                      checked={draft.finalidade === finalidade}
                      onChange={() => setDraft((current) => ({ ...current, finalidade }))}
                      className="h-4 w-4 accent-salmon"
                    />
                    {t.finalidade[finalidade].label}
                  </span>
                  <span className="text-xs text-on-military-muted">{t.finalidade[finalidade].descricao}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              id="empresa-razao-social"
              label={t.campos.razaoSocial}
              value={draft.razaoSocial}
              onChange={handleFieldChange("razaoSocial")}
              error={errors.razaoSocial}
            />
            <TextField
              id="empresa-nome-fantasia"
              label={t.campos.nomeFantasia}
              value={draft.nomeFantasia}
              onChange={handleFieldChange("nomeFantasia")}
            />
            <TextField
              id="empresa-cnpj"
              label={t.campos.cnpj}
              value={draft.cnpj}
              onChange={handleFieldChange("cnpj")}
              error={errors.cnpj}
              inputMode="numeric"
              placeholder="00.000.000/0000-00"
            />
            <SelectField
              id="empresa-setor"
              label={t.campos.setor}
              value={draft.setor}
              onChange={handleFieldChange("setor")}
              error={errors.setor}
              placeholder={t.campos.selecionarSetor}
            >
              {SETORES.map((setor) => (
                <option key={setor} value={setor}>
                  {ptBr.ativos.categorias[setor]}
                </option>
              ))}
            </SelectField>
            <TextField
              id="empresa-email"
              label={t.campos.email}
              type="email"
              value={draft.email}
              onChange={handleFieldChange("email")}
              error={errors.email}
              autoComplete="email"
            />
            <TextField
              id="empresa-telefone"
              label={t.campos.telefone}
              value={draft.telefone}
              onChange={handleFieldChange("telefone")}
              error={errors.telefone}
              inputMode="tel"
              autoComplete="tel"
            />
          </div>

          {draft.finalidade === "tokenizada" && (
            <div className="rounded-md border border-panel-border bg-military-600/30 p-4">
              <p className="text-xs text-on-military-muted">{t.notaTokenizada}</p>
              <button
                type="button"
                disabled
                aria-disabled="true"
                title={ptBr.common.emBreve}
                className="mt-3 inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-salmon/50 px-4 py-2 text-xs font-medium text-on-salmon/80"
              >
                {t.estruturarOfertaBotao}
                <span className="font-normal">({ptBr.common.emBreve})</span>
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600"
            >
              {t.cadastrarSimulacao}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-md border border-panel-border px-4 py-2 text-sm font-medium text-on-military-muted hover:text-on-military"
            >
              {t.cancelar}
            </button>
          </div>
        </form>
      )}

      <div className="mt-6">
        <h3 className="text-xs font-medium uppercase tracking-wide text-on-military-muted">
          {t.lista.title}
        </h3>
        {companies.length === 0 ? (
          <p className="mt-3 rounded-lg border border-panel-border bg-panel p-5 text-sm text-on-military-muted">
            {t.lista.vazio}
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {companies.map((company) => (
              <li
                key={company.id}
                className="flex flex-col gap-3 rounded-lg border border-panel-border bg-panel p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-on-military">
                    {company.nomeFantasia || company.razaoSocial}
                  </p>
                  <p className="font-mono text-xs tabular-nums text-on-military-muted">{company.cnpj}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                      company.finalidade === "investidora"
                        ? "border-panel-border bg-military-600/40 text-on-military"
                        : "border-salmon/40 bg-salmon/10 text-on-military"
                    }`}
                  >
                    {t.finalidade[company.finalidade].label}
                  </span>
                  <button
                    type="button"
                    onClick={() => openEditForm(company)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-panel-border px-3 py-1.5 text-xs font-medium text-on-military hover:border-salmon"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    {t.lista.editar}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(company.id)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-panel-border px-3 py-1.5 text-xs font-medium text-on-military-muted hover:border-value-negative hover:text-value-negative"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {t.lista.remover}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

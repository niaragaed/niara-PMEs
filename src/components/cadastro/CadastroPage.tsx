"use client";

import { useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createAccount, type CreateAccountState } from "@/app/cadastro/actions";
import { VideoCover } from "@/components/entrar/VideoCover";
import { ReadField, SelectField, TextField } from "@/components/perfil/FormField";
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
import { createClient } from "@/lib/supabase/client";
import type { AuthError } from "@supabase/supabase-js";

// Mesma lista de UFS de PersonalDataSection.tsx (/perfil) — duplicada aqui
// deliberadamente por ora, sem extrair um módulo compartilhado, para não
// mexer no arquivo de /perfil (ver discussão de escopo desta parte).
const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

type Step = "conta" | "tipo" | "dados";

type ContaErrors = { email?: string; senha?: string };

// Só cobre os erros que signUp pode retornar — mesmo léxico de erros de
// EntrarPage.tsx (ptBr.entrar.erros), reaproveitado aqui em vez de duplicar
// as strings (o signUp em si só existe nesta tela agora, ver EntrarPage.tsx).
function mapSignUpError(error: AuthError): string {
  const t = ptBr.entrar.erros;
  switch (error.code) {
    case "user_already_exists":
      return t.emailJaCadastrado;
    case "weak_password":
      return t.senhaFraca;
    default:
      return t.generico;
  }
}

type FormData = {
  fullName: string;
  legalName: string;
  tradeName: string;
  taxId: string;
  birthDate: string;
  annualRevenueReais: string;
  phone: string;
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
  fullName: "",
  legalName: "",
  tradeName: "",
  taxId: "",
  birthDate: "",
  annualRevenueReais: "",
  phone: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
};

function validate(data: FormData, tipoPessoa: TipoPessoa): FormErrors {
  const errors: FormErrors = {};
  const t = ptBr.cadastro.erros;

  if (tipoPessoa === "pf") {
    if (!data.fullName.trim()) errors.fullName = t.obrigatorio;
    if (!isValidDataNascimento(data.birthDate)) errors.birthDate = t.dataInvalida;
  } else {
    if (!data.legalName.trim()) errors.legalName = t.obrigatorio;
    if (!data.annualRevenueReais.trim()) errors.annualRevenueReais = t.obrigatorio;
  }
  if (!isValidDocumento(data.taxId, tipoPessoa)) errors.taxId = t.documentoInvalido;
  if (!isValidTelefone(data.phone)) errors.phone = t.telefoneInvalido;
  if (!isValidCEP(data.cep)) errors.cep = t.cepInvalido;
  if (!data.logradouro.trim()) errors.logradouro = t.obrigatorio;
  if (!data.numero.trim()) errors.numero = t.obrigatorio;
  if (!data.bairro.trim()) errors.bairro = t.obrigatorio;
  if (!data.cidade.trim()) errors.cidade = t.obrigatorio;
  if (!data.estado.trim()) errors.estado = t.obrigatorio;
  return errors;
}

// Tela dedicada de criação de conta + cadastro completo — três passos:
// (1) email/senha novos (signUp, só aqui — EntrarPage.tsx virou só login);
// (2) tipo de cadastro; (3) dados completos -> /perfil. Página normal (sem
// X/Esc de fechar): não pode dar pra sair no meio e cair logado sem
// cadastro. `initialStep`/`email` vêm do server component (page.tsx): quem
// já tem sessão (voltou pra completar um cadastro pela metade, ou entrou
// via /entrar) pula direto pro passo "tipo", sem repetir o passo "conta".
// O vídeo à esquerda é o mesmo componente/conteúdo de /entrar (VideoCover),
// persistente entre os três passos.
export function CadastroPage({ initialStep, email }: { initialStep: Step; email: string }) {
  const t = ptBr.cadastro;
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [step, setStep] = useState<Step>(initialStep);
  const [resolvedEmail, setResolvedEmail] = useState(email);
  const [contaEmail, setContaEmail] = useState("");
  const [contaSenha, setContaSenha] = useState("");
  const [contaErrors, setContaErrors] = useState<ContaErrors>({});
  const [contaFormError, setContaFormError] = useState<string | null>(null);
  const [creatingAccount, setCreatingAccount] = useState(false);

  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa>("pf");
  const [draft, setDraft] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverState, setServerState] = useState<CreateAccountState | null>(null);
  const [isPending, startTransition] = useTransition();

  const documentoLabel = tipoPessoa === "pf" ? t.campos.documentoCpf : t.campos.documentoCnpj;

  function validateConta(): boolean {
    const nextErrors: ContaErrors = {};
    if (!isValidEmail(contaEmail)) nextErrors.email = ptBr.entrar.erros.emailInvalido;
    if (contaSenha.length < 6) nextErrors.senha = ptBr.entrar.erros.senhaCurta;
    setContaErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleCreateAccount(event: FormEvent) {
    event.preventDefault();
    setContaFormError(null);
    if (!validateConta()) return;

    setCreatingAccount(true);
    const { error } = await supabase.auth.signUp({ email: contaEmail, password: contaSenha });
    if (error) {
      setContaFormError(mapSignUpError(error));
      setCreatingAccount(false);
      return;
    }
    router.refresh();
    setResolvedEmail(contaEmail);
    setCreatingAccount(false);
    setStep("tipo");
  }

  function handleTipoPessoaChange(next: TipoPessoa) {
    setTipoPessoa(next);
    setDraft((current) => ({ ...current, taxId: "" }));
    setErrors({});
    setServerState(null);
  }

  function goToDados() {
    setStep("dados");
  }

  function goToTipo() {
    setErrors({});
    setServerState(null);
    setStep("tipo");
  }

  function handleFieldChange(field: keyof FormData) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const raw = event.target.value;
      let masked = raw;
      if (field === "taxId") masked = maskDocumento(raw, tipoPessoa);
      else if (field === "birthDate") masked = maskDataNascimento(raw);
      else if (field === "phone") masked = maskTelefone(raw);
      else if (field === "cep") masked = maskCEP(raw);
      setDraft((current) => ({ ...current, [field]: masked }));
    };
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validate(draft, tipoPessoa);
    setErrors(nextErrors);
    setServerState(null);
    if (Object.keys(nextErrors).length > 0) return;

    startTransition(async () => {
      const payload =
        tipoPessoa === "pf"
          ? {
              fullName: draft.fullName,
              taxId: draft.taxId,
              birthDate: draft.birthDate,
              phone: draft.phone,
              cep: draft.cep,
              logradouro: draft.logradouro,
              numero: draft.numero,
              complemento: draft.complemento,
              bairro: draft.bairro,
              cidade: draft.cidade,
              estado: draft.estado,
            }
          : {
              legalName: draft.legalName,
              tradeName: draft.tradeName,
              taxId: draft.taxId,
              annualRevenueReais: draft.annualRevenueReais,
              phone: draft.phone,
              cep: draft.cep,
              logradouro: draft.logradouro,
              numero: draft.numero,
              complemento: draft.complemento,
              bairro: draft.bairro,
              cidade: draft.cidade,
              estado: draft.estado,
            };

      const result = await createAccount(tipoPessoa === "pf" ? "investor" : "issuer", payload);
      // Sucesso redireciona dentro da própria action (redirect() lança e
      // interrompe a execução) — só chega aqui em caso de erro.
      setServerState(result);
      if (result.fieldErrors) {
        setErrors((current) => ({ ...current, ...result.fieldErrors }));
      }
    });
  }

  return (
    <main className="flex flex-1 flex-col bg-military lg:min-h-[640px] lg:flex-row">
      <VideoCover />

      <div className="flex w-full flex-1 items-center justify-center overflow-y-auto p-6 sm:p-10 lg:w-1/2 lg:p-16">
        <div className="w-full max-w-xl py-10">
          {step === "conta" ? (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-on-military-muted">
                {t.passoContaContador}
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-on-military sm:text-3xl">{t.conta.titulo}</h1>
              <p className="mt-2 text-sm text-on-military-muted">{t.conta.subtitulo}</p>

              <form onSubmit={handleCreateAccount} noValidate className="mt-8 flex flex-col gap-3">
                <TextField
                  id="cadastro-conta-email"
                  label={t.conta.email.label}
                  type="email"
                  value={contaEmail}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setContaEmail(event.target.value)}
                  error={contaErrors.email}
                  placeholder={t.conta.email.placeholder}
                  autoComplete="email"
                />
                <TextField
                  id="cadastro-conta-senha"
                  label={t.conta.senha.label}
                  type="password"
                  value={contaSenha}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setContaSenha(event.target.value)}
                  error={contaErrors.senha}
                  placeholder={t.conta.senha.placeholder}
                  autoComplete="new-password"
                />

                {contaFormError && (
                  <p role="alert" className="text-xs text-value-negative">
                    {contaFormError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={creatingAccount}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-salmon px-4 py-2.5 text-sm font-medium text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creatingAccount ? t.conta.criandoContaBotao : t.conta.criarContaBotao}
                </button>

                <Link
                  href="/entrar"
                  className="text-center text-xs text-on-military-muted underline-offset-2 hover:text-on-military hover:underline"
                >
                  {t.conta.jaTemContaLink}
                </Link>
              </form>
            </>
          ) : step === "tipo" ? (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-on-military-muted">
                {t.passoTipoContador}
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-on-military sm:text-3xl">{t.titulo}</h1>
              <p className="mt-2 text-sm text-on-military-muted">{t.subtitulo}</p>

              <fieldset className="mt-8">
                <legend className="mb-3 text-xs font-medium uppercase tracking-wide text-on-military-muted">
                  {t.tipoPessoa.legend}
                </legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label
                    className={`cursor-pointer rounded-lg border p-4 transition-colors focus-within:ring-2 focus-within:ring-salmon ${
                      tipoPessoa === "pf" ? "border-salmon bg-military-600/40" : "border-panel-border hover:border-salmon/60"
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipoPessoa"
                      value="pf"
                      checked={tipoPessoa === "pf"}
                      onChange={() => handleTipoPessoaChange("pf")}
                      className="sr-only"
                    />
                    <span className="block text-sm font-semibold text-on-military">{t.tipoPessoa.pessoaFisica}</span>
                    <span className="mt-1 block text-xs text-on-military-muted">
                      {t.tipoPessoa.pessoaFisicaDescricao}
                    </span>
                  </label>
                  <label
                    className={`cursor-pointer rounded-lg border p-4 transition-colors focus-within:ring-2 focus-within:ring-salmon ${
                      tipoPessoa === "pj" ? "border-salmon bg-military-600/40" : "border-panel-border hover:border-salmon/60"
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipoPessoa"
                      value="pj"
                      checked={tipoPessoa === "pj"}
                      onChange={() => handleTipoPessoaChange("pj")}
                      className="sr-only"
                    />
                    <span className="block text-sm font-semibold text-on-military">{t.tipoPessoa.pessoaJuridica}</span>
                    <span className="mt-1 block text-xs text-on-military-muted">
                      {t.tipoPessoa.pessoaJuridicaDescricao}
                    </span>
                  </label>
                </div>
              </fieldset>

              <button
                type="button"
                onClick={goToDados}
                className="mt-8 rounded-md bg-salmon px-4 py-2.5 text-sm font-semibold text-on-salmon hover:bg-salmon-600"
              >
                {t.continuarBotao}
              </button>
            </>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-on-military-muted">
                  {t.passoDadosContador}
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-on-military sm:text-3xl">{t.dadosTitulo}</h1>
                <p className="mt-2 text-sm text-on-military-muted">
                  {tipoPessoa === "pf" ? t.dadosSubtituloPf : t.dadosSubtituloPj}
                </p>
              </div>

              <fieldset className="flex flex-col gap-4">
                <legend className="text-xs font-medium uppercase tracking-wide text-on-military-muted">
                  {t.secaoPessoal}
                </legend>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <ReadField label={t.campos.pais} value={t.campos.brasil} />
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
                    <>
                      <TextField
                        id="cadastro-razao-social"
                        label={t.campos.razaoSocial}
                        value={draft.legalName}
                        onChange={handleFieldChange("legalName")}
                        error={errors.legalName}
                      />
                      <TextField
                        id="cadastro-nome-fantasia"
                        label={t.campos.nomeFantasia}
                        value={draft.tradeName}
                        onChange={handleFieldChange("tradeName")}
                      />
                    </>
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
                  {tipoPessoa === "pf" && (
                    <TextField
                      id="cadastro-nascimento"
                      label={t.campos.dataNascimento}
                      value={draft.birthDate}
                      onChange={handleFieldChange("birthDate")}
                      error={errors.birthDate}
                      inputMode="numeric"
                      placeholder="DD/MM/AAAA"
                    />
                  )}
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
                  <ReadField label={t.campos.email} value={resolvedEmail} />
                  <TextField
                    id="cadastro-telefone"
                    label={t.campos.telefone}
                    value={draft.phone}
                    onChange={handleFieldChange("phone")}
                    error={errors.phone}
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
                    id="cadastro-cep"
                    label={t.campos.cep}
                    value={draft.cep}
                    onChange={handleFieldChange("cep")}
                    error={errors.cep}
                    inputMode="numeric"
                    placeholder="00000-000"
                  />
                  <TextField
                    id="cadastro-logradouro"
                    label={t.campos.logradouro}
                    value={draft.logradouro}
                    onChange={handleFieldChange("logradouro")}
                    error={errors.logradouro}
                    autoComplete="address-line1"
                  />
                  <TextField
                    id="cadastro-numero"
                    label={t.campos.numero}
                    value={draft.numero}
                    onChange={handleFieldChange("numero")}
                    error={errors.numero}
                  />
                  <TextField
                    id="cadastro-complemento"
                    label={t.campos.complemento}
                    value={draft.complemento}
                    onChange={handleFieldChange("complemento")}
                  />
                  <TextField
                    id="cadastro-bairro"
                    label={t.campos.bairro}
                    value={draft.bairro}
                    onChange={handleFieldChange("bairro")}
                    error={errors.bairro}
                  />
                  <TextField
                    id="cadastro-cidade"
                    label={t.campos.cidade}
                    value={draft.cidade}
                    onChange={handleFieldChange("cidade")}
                    error={errors.cidade}
                    autoComplete="address-level2"
                  />
                  <SelectField
                    id="cadastro-estado"
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

              {serverState && (
                <p role="alert" className="text-sm text-value-negative">
                  {serverState.message}
                </p>
              )}

              <p className="text-[11px] text-on-military-muted">{t.demoNota}</p>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? t.cadastrandoBotao : t.cadastrarBotao}
                </button>
                <button
                  type="button"
                  onClick={goToTipo}
                  disabled={isPending}
                  className="rounded-md border border-panel-border px-4 py-2 text-sm font-medium text-on-military-muted hover:text-on-military disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t.voltarBotao}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

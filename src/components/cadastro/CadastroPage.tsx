"use client";

import { useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createAccount, type CreateAccountState } from "@/app/cadastro/actions";
import { VideoCover } from "@/components/entrar/VideoCover";
import { ReadField, SelectField, TextField } from "@/components/perfil/FormField";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import {
  isValidCEP,
  isValidBirthDate,
  isValidDocument,
  isValidEmail,
  isValidPhone,
  maskCEP,
  maskBirthDate,
  maskDocument,
  maskPhone,
  type PersonType,
} from "@/lib/masks";
import { createClient } from "@/lib/supabase/client";
import type { AuthError } from "@supabase/supabase-js";
import { useDictionary } from "@/lib/i18n/client";

// The same list of states (UFs) as PersonalDataSection.tsx (/perfil) — duplicated here
// deliberately for now, without extracting a shared module, so as not to
// touch the /perfil file (see this part's scope discussion).
const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

type Step = "account" | "type" | "data";

type AccountErrors = { email?: string; password?: string };

// Only covers the errors signUp can return — the same error vocabulary as
// EntrarPage.tsx (dict.signIn.errors), reused here instead of duplicating
// the strings (signUp itself only exists on this screen now, see EntrarPage.tsx).
function mapSignUpError(error: AuthError, dict: Dictionary): string {
  const t = dict.signIn.errors;
  switch (error.code) {
    case "user_already_exists":
      return t.emailAlreadyRegistered;
    case "weak_password":
      return t.weakPassword;
    default:
      return t.generic;
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
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
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
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
};

function validate(data: FormData, personType: PersonType, dict: Dictionary): FormErrors {
  const errors: FormErrors = {};
  const t = dict.signUp.errors;

  if (personType === "pf") {
    if (!data.fullName.trim()) errors.fullName = t.required;
    if (!isValidBirthDate(data.birthDate)) errors.birthDate = t.invalidDate;
  } else {
    if (!data.legalName.trim()) errors.legalName = t.required;
    if (!data.annualRevenueReais.trim()) errors.annualRevenueReais = t.required;
  }
  if (!isValidDocument(data.taxId, personType)) errors.taxId = t.invalidDocument;
  if (!isValidPhone(data.phone)) errors.phone = t.phoneInvalid;
  if (!isValidCEP(data.cep)) errors.cep = t.invalidCep;
  if (!data.street.trim()) errors.street = t.required;
  if (!data.number.trim()) errors.number = t.required;
  if (!data.district.trim()) errors.district = t.required;
  if (!data.city.trim()) errors.city = t.required;
  if (!data.state.trim()) errors.state = t.required;
  return errors;
}

// Dedicated account creation + full registration screen — three steps:
// (1) new email/password (signUp, only here — EntrarPage.tsx became sign-in only);
// (2) registration type; (3) full data -> /perfil. A normal page (no
// X/Esc to close): it must not be possible to leave midway and end up signed in
// without a registration. `initialStep`/`email` come from the server component (page.tsx):
// whoever already has a session (came back to finish a half-done registration, or signed in
// via /entrar) jumps straight to the "type" step, without repeating the "account" step.
// The video on the left is the same component/content as /entrar (VideoCover),
// persistent across the three steps.
export function SignUpPage({ initialStep, email }: { initialStep: Step; email: string }) {
  const dict = useDictionary();
  const t = dict.signUp;
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [step, setStep] = useState<Step>(initialStep);
  const [resolvedEmail, setResolvedEmail] = useState(email);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountErrors, setAccountErrors] = useState<AccountErrors>({});
  const [accountFormError, setAccountFormError] = useState<string | null>(null);
  const [creatingAccount, setCreatingAccount] = useState(false);

  const [personType, setPersonType] = useState<PersonType>("pf");
  const [draft, setDraft] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverState, setServerState] = useState<CreateAccountState | null>(null);
  const [isPending, startTransition] = useTransition();

  const documentLabel = personType === "pf" ? t.fields.documentCpf : t.fields.documentCnpj;

  function validateAccount(): boolean {
    const nextErrors: AccountErrors = {};
    if (!isValidEmail(accountEmail)) nextErrors.email = dict.signIn.errors.invalidEmail;
    if (accountPassword.length < 6) nextErrors.password = dict.signIn.errors.shortPassword;
    setAccountErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleCreateAccount(event: FormEvent) {
    event.preventDefault();
    setAccountFormError(null);
    if (!validateAccount()) return;

    setCreatingAccount(true);
    const { error } = await supabase.auth.signUp({ email: accountEmail, password: accountPassword });
    if (error) {
      setAccountFormError(mapSignUpError(error, dict));
      setCreatingAccount(false);
      return;
    }
    router.refresh();
    setResolvedEmail(accountEmail);
    setCreatingAccount(false);
    setStep("type");
  }

  function handlePersonTypeChange(next: PersonType) {
    setPersonType(next);
    setDraft((current) => ({ ...current, taxId: "" }));
    setErrors({});
    setServerState(null);
  }

  function goToData() {
    setStep("data");
  }

  function goToType() {
    setErrors({});
    setServerState(null);
    setStep("type");
  }

  function handleFieldChange(field: keyof FormData) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const raw = event.target.value;
      let masked = raw;
      if (field === "taxId") masked = maskDocument(raw, personType);
      else if (field === "birthDate") masked = maskBirthDate(raw);
      else if (field === "phone") masked = maskPhone(raw);
      else if (field === "cep") masked = maskCEP(raw);
      setDraft((current) => ({ ...current, [field]: masked }));
    };
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validate(draft, personType, dict);
    setErrors(nextErrors);
    setServerState(null);
    if (Object.keys(nextErrors).length > 0) return;

    startTransition(async () => {
      const payload =
        personType === "pf"
          ? {
              fullName: draft.fullName,
              taxId: draft.taxId,
              birthDate: draft.birthDate,
              phone: draft.phone,
              cep: draft.cep,
              street: draft.street,
              number: draft.number,
              complement: draft.complement,
              district: draft.district,
              city: draft.city,
              state: draft.state,
            }
          : {
              legalName: draft.legalName,
              tradeName: draft.tradeName,
              taxId: draft.taxId,
              annualRevenueReais: draft.annualRevenueReais,
              phone: draft.phone,
              cep: draft.cep,
              street: draft.street,
              number: draft.number,
              complement: draft.complement,
              district: draft.district,
              city: draft.city,
              state: draft.state,
            };

      const result = await createAccount(personType === "pf" ? "investor" : "issuer", payload);
      // Success redirects inside the action itself (redirect() throws and
      // stops execution) — it only gets here on an error.
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
          {step === "account" ? (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-on-military-muted">
                {t.accountStepCounter}
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-on-military sm:text-3xl">{t.account.title}</h1>
              <p className="mt-2 text-sm text-on-military-muted">{t.account.subtitle}</p>

              <form onSubmit={handleCreateAccount} noValidate className="mt-8 flex flex-col gap-3">
                <TextField
                  id="signup-account-email"
                  label={t.account.email.label}
                  type="email"
                  value={accountEmail}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setAccountEmail(event.target.value)}
                  error={accountErrors.email}
                  placeholder={t.account.email.placeholder}
                  autoComplete="email"
                />
                <TextField
                  id="signup-account-password"
                  label={t.account.password.label}
                  type="password"
                  value={accountPassword}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setAccountPassword(event.target.value)}
                  error={accountErrors.password}
                  placeholder={t.account.password.placeholder}
                  autoComplete="new-password"
                />

                {accountFormError && (
                  <p role="alert" className="text-xs text-value-negative">
                    {accountFormError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={creatingAccount}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-salmon px-4 py-2.5 text-sm font-medium text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creatingAccount ? t.account.creatingAccountButton : t.account.createAccountButton}
                </button>

                <Link
                  href="/entrar"
                  className="text-center text-xs text-on-military-muted underline-offset-2 hover:text-on-military hover:underline"
                >
                  {t.account.hasAccountLink}
                </Link>
              </form>
            </>
          ) : step === "type" ? (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-on-military-muted">
                {t.typeStepCounter}
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-on-military sm:text-3xl">{t.title}</h1>
              <p className="mt-2 text-sm text-on-military-muted">{t.subtitle}</p>

              <fieldset className="mt-8">
                <legend className="mb-3 text-xs font-medium uppercase tracking-wide text-on-military-muted">
                  {t.personType.legend}
                </legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label
                    className={`cursor-pointer rounded-lg border p-4 transition-colors focus-within:ring-2 focus-within:ring-salmon ${
                      personType === "pf" ? "border-salmon bg-military-600/40" : "border-panel-border hover:border-salmon/60"
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipoPessoa"
                      value="pf"
                      checked={personType === "pf"}
                      onChange={() => handlePersonTypeChange("pf")}
                      className="sr-only"
                    />
                    <span className="block text-sm font-semibold text-on-military">{t.personType.individual}</span>
                    <span className="mt-1 block text-xs text-on-military-muted">
                      {t.personType.individualDescription}
                    </span>
                  </label>
                  <label
                    className={`cursor-pointer rounded-lg border p-4 transition-colors focus-within:ring-2 focus-within:ring-salmon ${
                      personType === "pj" ? "border-salmon bg-military-600/40" : "border-panel-border hover:border-salmon/60"
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipoPessoa"
                      value="pj"
                      checked={personType === "pj"}
                      onChange={() => handlePersonTypeChange("pj")}
                      className="sr-only"
                    />
                    <span className="block text-sm font-semibold text-on-military">{t.personType.company}</span>
                    <span className="mt-1 block text-xs text-on-military-muted">
                      {t.personType.companyDescription}
                    </span>
                  </label>
                </div>
              </fieldset>

              <button
                type="button"
                onClick={goToData}
                className="mt-8 rounded-md bg-salmon px-4 py-2.5 text-sm font-semibold text-on-salmon hover:bg-salmon-600"
              >
                {t.continueButton}
              </button>
            </>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-on-military-muted">
                  {t.dataStepCounter}
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-on-military sm:text-3xl">{t.dataTitle}</h1>
                <p className="mt-2 text-sm text-on-military-muted">
                  {personType === "pf" ? t.dataSubtitlePf : t.dataSubtitlePj}
                </p>
              </div>

              <fieldset className="flex flex-col gap-4">
                <legend className="text-xs font-medium uppercase tracking-wide text-on-military-muted">
                  {t.personalSection}
                </legend>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <ReadField label={t.fields.country} value={t.fields.brazil} />
                  {personType === "pf" ? (
                    <TextField
                      id="signup-name"
                      label={t.fields.fullName}
                      value={draft.fullName}
                      onChange={handleFieldChange("fullName")}
                      error={errors.fullName}
                      autoComplete="name"
                    />
                  ) : (
                    <>
                      <TextField
                        id="signup-legal-name"
                        label={t.fields.legalName}
                        value={draft.legalName}
                        onChange={handleFieldChange("legalName")}
                        error={errors.legalName}
                      />
                      <TextField
                        id="signup-trade-name"
                        label={t.fields.tradeName}
                        value={draft.tradeName}
                        onChange={handleFieldChange("tradeName")}
                      />
                    </>
                  )}
                  <TextField
                    id="signup-document"
                    label={documentLabel}
                    value={draft.taxId}
                    onChange={handleFieldChange("taxId")}
                    error={errors.taxId}
                    inputMode="numeric"
                    placeholder={personType === "pf" ? "000.000.000-00" : "00.000.000/0000-00"}
                  />
                  {personType === "pf" && (
                    <TextField
                      id="signup-birth-date"
                      label={t.fields.birthDate}
                      value={draft.birthDate}
                      onChange={handleFieldChange("birthDate")}
                      error={errors.birthDate}
                      inputMode="numeric"
                      placeholder={dict.common.datePlaceholder}
                    />
                  )}
                  {personType === "pj" && (
                    <TextField
                      id="signup-revenue"
                      label={t.fields.grossAnnualRevenue}
                      value={draft.annualRevenueReais}
                      onChange={handleFieldChange("annualRevenueReais")}
                      error={errors.annualRevenueReais}
                      inputMode="decimal"
                      placeholder="5.000.000,00"
                    />
                  )}
                  <ReadField label={t.fields.email} value={resolvedEmail} />
                  <TextField
                    id="signup-phone"
                    label={t.fields.phone}
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
                  {t.addressSection}
                </legend>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField
                    id="signup-cep"
                    label={t.fields.cep}
                    value={draft.cep}
                    onChange={handleFieldChange("cep")}
                    error={errors.cep}
                    inputMode="numeric"
                    placeholder="00000-000"
                  />
                  <TextField
                    id="signup-street"
                    label={t.fields.street}
                    value={draft.street}
                    onChange={handleFieldChange("street")}
                    error={errors.street}
                    autoComplete="address-line1"
                  />
                  <TextField
                    id="signup-number"
                    label={t.fields.number}
                    value={draft.number}
                    onChange={handleFieldChange("number")}
                    error={errors.number}
                  />
                  <TextField
                    id="signup-complement"
                    label={t.fields.complement}
                    value={draft.complement}
                    onChange={handleFieldChange("complement")}
                  />
                  <TextField
                    id="signup-district"
                    label={t.fields.district}
                    value={draft.district}
                    onChange={handleFieldChange("district")}
                    error={errors.district}
                  />
                  <TextField
                    id="signup-city"
                    label={t.fields.city}
                    value={draft.city}
                    onChange={handleFieldChange("city")}
                    error={errors.city}
                    autoComplete="address-level2"
                  />
                  <SelectField
                    id="signup-state"
                    label={t.fields.state}
                    value={draft.state}
                    onChange={handleFieldChange("state")}
                    error={errors.state}
                    placeholder={t.fields.selectState}
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

              <p className="text-[11px] text-on-military-muted">{t.demoNote}</p>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? t.registeringButton : t.registerButton}
                </button>
                <button
                  type="button"
                  onClick={goToType}
                  disabled={isPending}
                  className="rounded-md border border-panel-border px-4 py-2 text-sm font-medium text-on-military-muted hover:text-on-military disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t.backButton}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

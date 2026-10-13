"use client";

import { useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { Pencil } from "lucide-react";
import { updateProfile, type LoadedProfile } from "@/app/perfil/actions";
import { AvatarUpload } from "./AvatarUpload";
import { LogoUpload } from "./LogoUpload";
import { BannerUpload } from "./BannerUpload";
import { CardPreview } from "./CardPreview";
import { ReadField, SelectField, TextareaField, TextField } from "./FormField";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import {
  isValidCEP,
  isValidBirthDate,
  isValidDocument,
  isValidPhone,
  maskCEP,
  maskBirthDate,
  maskDocument,
  maskPhone,
  type PersonType,
} from "@/lib/masks";
import { useDictionary } from "@/lib/i18n/client";

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

type FormData = {
  fullName: string;
  legalName: string;
  tradeName: string;
  document: string;
  birthDate: string;
  annualRevenueReais: string;
  sector: string;
  businessSummary: string;
  publishCnpj: boolean;
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

function display(value: string, notProvided: string): string {
  return value.trim() || notProvided;
}

// Telefone é salvo/validado só como DDD + número (sem código de país, ver
// masks.ts); o "+55" é acrescentado aqui só para exibição, mesmo prefixo
// fixo mostrado no campo em modo de edição (TextField prefix="+55").
function displayPhone(value: string, notProvided: string): string {
  return value.trim() ? `+55 ${value.trim()}` : notProvided;
}

function personTypeOf(role: LoadedProfile["role"]): PersonType {
  return role === "investor" ? "pf" : "pj";
}

function toFormData(profile: LoadedProfile, personType: PersonType): FormData {
  const shared = {
    document: maskDocument(profile.taxId, personType),
    phone: maskPhone(profile.phone),
    cep: maskCEP(profile.cep),
    street: profile.street,
    number: profile.number,
    complement: profile.complement,
    district: profile.district,
    city: profile.city,
    state: profile.state,
  };

  if (profile.role === "investor") {
    return {
      ...shared,
      fullName: profile.fullName,
      legalName: "",
      tradeName: "",
      birthDate: profile.birthDate,
      annualRevenueReais: "",
      sector: "",
      businessSummary: "",
      publishCnpj: false,
    };
  }

  return {
    ...shared,
    fullName: "",
    legalName: profile.legalName,
    tradeName: profile.tradeName,
    birthDate: "",
    annualRevenueReais: profile.annualRevenueReais,
    sector: profile.sector,
    businessSummary: profile.businessSummary,
    publishCnpj: profile.publishCnpj,
  };
}

function validate(data: FormData, personType: PersonType, dict: Dictionary): FormErrors {
  const errors: FormErrors = {};
  const t = dict.profile.registrationData.errors;

  if (personType === "pf") {
    if (!data.fullName.trim()) errors.fullName = t.required;
    if (!isValidBirthDate(data.birthDate)) errors.birthDate = t.invalidDate;
  } else {
    if (!data.legalName.trim()) errors.legalName = t.required;
    if (!data.annualRevenueReais.trim()) errors.annualRevenueReais = t.required;
  }
  if (!isValidDocument(data.document, personType)) errors.document = t.invalidDocument;
  if (!isValidPhone(data.phone)) errors.phone = t.phoneInvalid;
  if (!isValidCEP(data.cep)) errors.cep = t.invalidCep;
  if (!data.street.trim()) errors.street = t.required;
  if (!data.number.trim()) errors.number = t.required;
  if (!data.district.trim()) errors.district = t.required;
  if (!data.city.trim()) errors.city = t.required;
  if (!data.state.trim()) errors.state = t.required;
  return errors;
}

export function PersonalDataSection({ profile }: { profile: LoadedProfile }) {
  const dict = useDictionary();
  const personType = personTypeOf(profile.role);

  // CPF/CNPJ, data de nascimento e endereço são dados sensíveis (LGPD) —
  // vivem em estado local só enquanto a seção está em edição; o valor de
  // referência é sempre o que veio do banco via `profile` (prop), nunca
  // localStorage/cookies.
  const [draft, setDraft] = useState<FormData>(() => toFormData(profile, personType));
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Espelha o estado de LogoUpload/BannerUpload (via onUrlChange) só para
  // alimentar a "Prévia do card" (CardPreview) em tempo real — nenhuma
  // fonte de verdade nova, os dois uploads continuam donos do próprio estado.
  const [previewLogoUrl, setPreviewLogoUrl] = useState<string | null>(
    profile.role === "issuer" ? profile.logoUrl : null,
  );
  const [previewBannerUrl, setPreviewBannerUrl] = useState<string | null>(
    profile.role === "issuer" ? profile.bannerUrl : null,
  );

  const t = dict.profile.registrationData;
  const notProvided = t.notProvided;
  const documentLabel = personType === "pf" ? t.fields.documentCpf : t.fields.documentCnpj;

  function startEdit() {
    setDraft(toFormData(profile, personType));
    setErrors({});
    setServerError(null);
    setJustSaved(false);
    setMode("edit");
  }

  function cancelEdit() {
    setDraft(toFormData(profile, personType));
    setErrors({});
    setServerError(null);
    setMode("view");
  }

  function handleFieldChange(field: keyof FormData) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const raw = event.target.value;
      let masked = raw;
      if (field === "document") masked = maskDocument(raw, personType);
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
    setServerError(null);
    if (Object.keys(nextErrors).length > 0) return;

    startTransition(async () => {
      const payload =
        personType === "pf"
          ? {
              fullName: draft.fullName,
              taxId: draft.document,
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
              taxId: draft.document,
              annualRevenueReais: draft.annualRevenueReais,
              sector: draft.sector,
              businessSummary: draft.businessSummary,
              publishCnpj: draft.publishCnpj,
              phone: draft.phone,
              cep: draft.cep,
              street: draft.street,
              number: draft.number,
              complement: draft.complement,
              district: draft.district,
              city: draft.city,
              state: draft.state,
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
    <section id="registration-data" aria-labelledby="registration-data-heading" className="scroll-mt-24">
      <h2 id="registration-data-heading" className="text-xl font-semibold text-on-military">
        {t.title}
      </h2>

      {profile.role === "investor" && (
        <div className="mt-6 rounded-lg border border-panel-border bg-panel p-6">
          <AvatarUpload />
        </div>
      )}

      {profile.role === "issuer" && (
        <div className="mt-6 rounded-lg border border-panel-border bg-panel p-6">
          <LogoUpload initialLogoUrl={profile.logoUrl} onUrlChange={setPreviewLogoUrl} />
        </div>
      )}

      {profile.role === "issuer" && (
        <div className="mt-6 rounded-lg border border-panel-border bg-panel p-6">
          <BannerUpload initialBannerUrl={profile.bannerUrl} onUrlChange={setPreviewBannerUrl} />
        </div>
      )}

      {profile.role === "issuer" && (
        <div className="mt-6 rounded-lg border border-panel-border bg-panel p-6">
          <h3 className="text-sm font-semibold text-on-military">{t.cardPreview.title}</h3>
          <p className="mt-1 text-xs text-on-military-muted">{t.cardPreview.subtitle}</p>
          <div className="mt-3">
            <CardPreview bannerUrl={previewBannerUrl} logoUrl={previewLogoUrl} />
          </div>
        </div>
      )}

      {mode === "view" ? (
        <div className="mt-6 rounded-lg border border-panel-border bg-panel p-6">
          {justSaved && (
            <p className="mb-5 rounded-md border border-value-positive/30 bg-value-positive/10 px-3 py-2 text-xs text-value-positive">
              {t.savedConfirmation}
            </p>
          )}

          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <ReadField label={t.fields.country} value={t.fields.brazil} />
            {personType === "pf" ? (
              <ReadField label={t.fields.fullName} value={display(draft.fullName, notProvided)} />
            ) : (
              <>
                <ReadField label={t.fields.legalName} value={display(draft.legalName, notProvided)} />
                <ReadField label={t.fields.tradeName} value={display(draft.tradeName, notProvided)} />
              </>
            )}
            <ReadField label={documentLabel} value={display(draft.document, notProvided)} mono />
            {personType === "pf" && (
              <ReadField label={t.fields.birthDate} value={display(draft.birthDate, notProvided)} mono />
            )}
            {personType === "pj" && (
              <ReadField
                label={t.fields.grossAnnualRevenue}
                value={draft.annualRevenueReais ? `R$ ${draft.annualRevenueReais}` : t.notProvided}
                mono
              />
            )}
            <ReadField label={t.fields.email} value={profile.email} />
            <ReadField label={t.fields.phone} value={displayPhone(draft.phone, notProvided)} mono />
          </div>

          {personType === "pj" && (
            <div className="mt-6 border-t border-panel-border pt-5">
              <h3 className="text-xs font-medium uppercase tracking-wide text-on-military-muted">
                {t.publicSection}
              </h3>
              <p className="mt-1 text-[11px] text-on-military-muted">{t.publicSectionNote}</p>
              <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <ReadField label={t.fields.sector} value={display(draft.sector, notProvided)} />
                <ReadField label={t.fields.businessSummary} value={display(draft.businessSummary, notProvided)} />
                <ReadField
                  label={t.publishCnpj.statusLabel}
                  value={draft.publishCnpj ? t.publishCnpj.showing : t.publishCnpj.notShowing}
                />
              </div>
            </div>
          )}

          <div className="mt-6 border-t border-panel-border pt-5">
            <h3 className="text-xs font-medium uppercase tracking-wide text-on-military-muted">
              {t.addressSection}
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <ReadField label={t.fields.cep} value={display(draft.cep, notProvided)} mono />
              <ReadField label={t.fields.street} value={display(draft.street, notProvided)} />
              <ReadField label={t.fields.number} value={display(draft.number, notProvided)} />
              <ReadField label={t.fields.complement} value={display(draft.complement, notProvided)} />
              <ReadField label={t.fields.district} value={display(draft.district, notProvided)} />
              <ReadField
                label={`${t.fields.city} / ${t.fields.state}`}
                value={
                  draft.city.trim() || draft.state.trim()
                    ? `${display(draft.city, notProvided)} / ${draft.state || "—"}`
                    : t.notProvided
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
            {t.edit}
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
              {t.personalSection}
            </legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ReadField label={t.fields.country} value={t.fields.brazil} />
              {personType === "pf" ? (
                <TextField
                  id="pd-name"
                  label={t.fields.fullName}
                  value={draft.fullName}
                  onChange={handleFieldChange("fullName")}
                  error={errors.fullName}
                  autoComplete="name"
                />
              ) : (
                <>
                  <TextField
                    id="pd-legal-name"
                    label={t.fields.legalName}
                    value={draft.legalName}
                    onChange={handleFieldChange("legalName")}
                    error={errors.legalName}
                  />
                  <TextField
                    id="pd-trade-name"
                    label={t.fields.tradeName}
                    value={draft.tradeName}
                    onChange={handleFieldChange("tradeName")}
                  />
                </>
              )}
              <TextField
                id="pd-document"
                label={documentLabel}
                value={draft.document}
                onChange={handleFieldChange("document")}
                error={errors.document}
                inputMode="numeric"
                placeholder={personType === "pf" ? "000.000.000-00" : "00.000.000/0000-00"}
              />
              {personType === "pf" && (
                <TextField
                  id="pd-birth-date"
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
                  id="pd-revenue"
                  label={t.fields.grossAnnualRevenue}
                  value={draft.annualRevenueReais}
                  onChange={handleFieldChange("annualRevenueReais")}
                  error={errors.annualRevenueReais}
                  inputMode="decimal"
                  placeholder="5.000.000,00"
                />
              )}
              <ReadField label={t.fields.email} value={profile.email} />
              <TextField
                id="pd-phone"
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

          {personType === "pj" && (
            <fieldset className="flex flex-col gap-4">
              <legend className="text-xs font-medium uppercase tracking-wide text-on-military-muted">
                {t.publicSection}
              </legend>
              <p className="-mt-2 text-[11px] text-on-military-muted">{t.publicSectionNote}</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  id="pd-sector"
                  label={t.fields.sector}
                  value={draft.sector}
                  onChange={handleFieldChange("sector")}
                />
              </div>
              <TextareaField
                id="pd-business-summary"
                label={t.fields.businessSummary}
                value={draft.businessSummary}
                onChange={(event) => setDraft((current) => ({ ...current, businessSummary: event.target.value }))}
                rows={4}
              />
              <label htmlFor="pd-publish-cnpj" className="flex items-start gap-2.5 text-sm text-on-military">
                <input
                  id="pd-publish-cnpj"
                  type="checkbox"
                  checked={draft.publishCnpj}
                  onChange={(event) => setDraft((current) => ({ ...current, publishCnpj: event.target.checked }))}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-panel-border accent-salmon"
                />
                <span>
                  {t.publishCnpj.label}
                  <span className="mt-1 block text-xs text-on-military-muted">{t.publishCnpj.hint}</span>
                </span>
              </label>
            </fieldset>
          )}

          <fieldset className="flex flex-col gap-4">
            <legend className="text-xs font-medium uppercase tracking-wide text-on-military-muted">
              {t.addressSection}
            </legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                id="pd-cep"
                label={t.fields.cep}
                value={draft.cep}
                onChange={handleFieldChange("cep")}
                error={errors.cep}
                inputMode="numeric"
                placeholder="00000-000"
              />
              <TextField
                id="pd-street"
                label={t.fields.street}
                value={draft.street}
                onChange={handleFieldChange("street")}
                error={errors.street}
                autoComplete="address-line1"
              />
              <TextField
                id="pd-number"
                label={t.fields.number}
                value={draft.number}
                onChange={handleFieldChange("number")}
                error={errors.number}
              />
              <TextField
                id="pd-complement"
                label={t.fields.complement}
                value={draft.complement}
                onChange={handleFieldChange("complement")}
              />
              <TextField
                id="pd-district"
                label={t.fields.district}
                value={draft.district}
                onChange={handleFieldChange("district")}
                error={errors.district}
              />
              <TextField
                id="pd-city"
                label={t.fields.city}
                value={draft.city}
                onChange={handleFieldChange("city")}
                error={errors.city}
                autoComplete="address-level2"
              />
              <SelectField
                id="pd-state"
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

          {serverError && (
            <p role="alert" className="text-sm text-value-negative">
              {serverError}
            </p>
          )}

          <p className="text-[11px] text-on-military-muted">{t.saveNote}</p>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? t.saving : t.save}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={isPending}
              className="rounded-md border border-panel-border px-4 py-2 text-sm font-medium text-on-military-muted hover:text-on-military disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t.cancel}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

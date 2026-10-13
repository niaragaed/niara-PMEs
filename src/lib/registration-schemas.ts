// Format validation (zod) shared by the account Server Actions — sign-up (src/app/cadastro/actions.ts)
// and the profile edit (src/app/perfil/actions.ts). Only FORMAT is checked here; business rules
// (the R$40M SEP cap, duplicate user_id) are enforced by the database, and each action translates
// the Postgres error. The schemas are built per request from the visitor's dictionary, so the
// field errors come back in the interface language.
import { z } from "zod";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { isValidCEP, isValidCNPJ, isValidCPF, isValidBirthDate, isValidPhone, onlyDigits } from "@/lib/masks";
import { MONEY_FORMAT } from "@/lib/money";

type ServerErrors = Dictionary["serverErrors"];

// DD/MM/YYYY (form format) -> YYYY-MM-DD (Postgres date column format).
export function brDateToIso(value: string): string {
  const [day, month, year] = value.split("/");
  return `${year}-${month}-${day}`;
}

export function addressFields(e: ServerErrors) {
  return {
    phone: z.string().refine((value) => isValidPhone(value), e.address.phone).transform(onlyDigits),
    cep: z.string().refine((value) => isValidCEP(value), e.address.cep).transform(onlyDigits),
    street: z.string().trim().min(1, e.address.street),
    number: z.string().trim().min(1, e.address.number),
    complement: z.string().trim(),
    district: z.string().trim().min(1, e.address.district),
    city: z.string().trim().min(1, e.address.city),
    state: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2}$/, e.address.state)
      .transform((value) => value.toUpperCase()),
  };
}

export function investorFields(e: ServerErrors) {
  return {
    fullName: z.string().trim().min(1, e.person.fullName),
    taxId: z
      .string()
      .refine((value) => isValidCPF(value), e.person.cpf)
      .transform(onlyDigits),
    birthDate: z
      .string()
      .refine((value) => isValidBirthDate(value), e.person.birthDate)
      .transform(brDateToIso),
    ...addressFields(e),
  };
}

export function issuerFields(e: ServerErrors) {
  return {
    legalName: z.string().trim().min(1, e.company.legalName),
    tradeName: z.string().trim(),
    taxId: z
      .string()
      .refine((value) => isValidCNPJ(value), e.company.cnpj)
      .transform(onlyDigits),
    annualRevenueReais: z.string().trim().min(1, e.company.revenueRequired).regex(MONEY_FORMAT, e.moneyFormatLong),
    ...addressFields(e),
  };
}

/** The first message per field, keyed by field name (what the forms highlight). */
export function firstFieldErrors(error: z.ZodError): Partial<Record<string, string>> {
  const result: Partial<Record<string, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in result)) {
      result[field] = issue.message;
    }
  }
  return result;
}

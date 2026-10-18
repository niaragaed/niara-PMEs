"use server";

// Account onboarding Server Action. HONESTY RULE: this actually WRITES to the database
// (investors/issuers) — no "simulation" wording here.
//
// user_id never comes from the client: it's always read from the session on the server via
// getUser() (it revalidates against the Supabase server, unlike getSession()). zod only checks
// FORMAT; business rules (the R$40M SEP cap, duplicate user_id) are checked by the database — the
// action attempts the operation and translates the Postgres error, it never replicates the CHECKs
// in JS.
import { redirect } from "next/navigation";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";
import { resolveAccount, type AccountRole } from "@/lib/auth/resolveInvestor";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { reaisToCents } from "@/lib/money";
import { getDictionary } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { firstFieldErrors, investorFields, issuerFields } from "@/lib/registration-schemas";

export type CreateAccountState = {
  status: "error";
  message: string;
  fieldErrors?: Partial<Record<string, string>>;
};

const roleSchema = z.enum(["investor", "issuer"]);

function translateDbError(error: PostgrestError, e: Dictionary["serverErrors"]): CreateAccountState {
  if (error.code === "23514" && error.message.includes("issuer_is_sep")) {
    return {
      status: "error",
      message: e.company.sepCap,
      fieldErrors: { annualRevenueReais: e.company.sepCapField },
    };
  }
  console.error("createAccount: unexpected database error", error);
  return { status: "error", message: e.signUpFailed };
}

export async function createAccount(roleInput: unknown, dataInput: unknown): Promise<CreateAccountState> {
  const e = (await getDictionary()).serverErrors;

  const roleResult = roleSchema.safeParse(roleInput);
  if (!roleResult.success) {
    return { status: "error", message: e.invalidRole };
  }
  const role: AccountRole = roleResult.data;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/entrar");
  }

  // Defense in depth: the /cadastro screen already redirects to /conta if the user is already
  // registered, but this checks again against a race (e.g. two almost simultaneous submits from
  // the same session).
  const existing = await resolveAccount();
  if (existing.role) {
    redirect("/conta");
  }

  const admin = createAdminClient();

  if (role === "investor") {
    const parsed = z.object(investorFields(e)).safeParse(dataInput);
    if (!parsed.success) {
      return { status: "error", message: e.fixFields, fieldErrors: firstFieldErrors(parsed.error) };
    }

    const { error } = await admin.from("investors").insert({
      user_id: user.id,
      full_name: parsed.data.fullName,
      tax_id: parsed.data.taxId,
      birth_date: parsed.data.birthDate,
      phone: parsed.data.phone,
      addr_cep: parsed.data.cep,
      addr_street: parsed.data.street,
      addr_number: parsed.data.number,
      addr_complement: parsed.data.complement || null,
      addr_neighborhood: parsed.data.district,
      addr_city: parsed.data.city,
      addr_state: parsed.data.state,
    });

    if (error) {
      if (error.code === "23505") {
        // unique_violation on investors.user_id — the database is the final authority; treated
        // as "already registered", not as a server error.
        redirect("/conta");
      }
      return translateDbError(error, e);
    }
  } else {
    const parsed = z.object(issuerFields(e)).safeParse(dataInput);
    if (!parsed.success) {
      return { status: "error", message: e.fixFields, fieldErrors: firstFieldErrors(parsed.error) };
    }

    const annualRevenueCents = reaisToCents(parsed.data.annualRevenueReais);
    if (annualRevenueCents === null) {
      return { status: "error", message: e.fixFields, fieldErrors: { annualRevenueReais: e.moneyFormat } };
    }

    const { error } = await admin.from("issuers").insert({
      user_id: user.id,
      legal_name: parsed.data.legalName,
      trade_name: parsed.data.tradeName || null,
      tax_id: parsed.data.taxId,
      annual_revenue_cents: annualRevenueCents.toString(),
      phone: parsed.data.phone,
      addr_cep: parsed.data.cep,
      addr_street: parsed.data.street,
      addr_number: parsed.data.number,
      addr_complement: parsed.data.complement || null,
      addr_neighborhood: parsed.data.district,
      addr_city: parsed.data.city,
      addr_state: parsed.data.state,
    });

    if (error) {
      if (error.code === "23505") {
        redirect("/conta");
      }
      return translateDbError(error, e);
    }
  }

  // ?onboarding=1 tells /perfil to open the investor profile quiz automatically — only on this
  // success path (the other redirect("/conta") calls above are a race/duplicate of an existing
  // registration, not a new account).
  redirect("/conta?onboarding=1");
}

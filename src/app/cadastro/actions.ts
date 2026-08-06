"use server";

// Server Action de onboarding de conta. REGRA DE HONESTIDADE: isto GRAVA no
// banco de verdade (investors/issuers) — nada de texto de "simulação" aqui.
//
// user_id nunca vem do cliente: sempre lido da sessão no servidor via
// getUser() (revalida no servidor do Supabase, diferente de getSession()).
// zod só valida FORMATO; quem valida regra de negócio (teto SEP de R$40M,
// duplicidade de user_id) é o banco — a action tenta a operação e traduz o
// erro do Postgres, nunca replica os CHECKs em JS.
import { redirect } from "next/navigation";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";
import { resolveAccount, type AccountRole } from "@/lib/auth/resolveInvestor";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { isValidCNPJ, isValidCPF, onlyDigits } from "@/lib/masks";
import { MONEY_FORMAT, reaisToCents } from "@/lib/money";

export type CreateAccountState = {
  status: "error";
  message: string;
  fieldErrors?: Partial<Record<string, string>>;
};

const roleSchema = z.enum(["investor", "issuer"]);

const investorDataSchema = z.object({
  fullName: z.string().trim().min(1, "Informe o nome completo."),
  taxId: z
    .string()
    .refine((value) => isValidCPF(value), "CPF inválido — informe os 11 dígitos.")
    .transform(onlyDigits),
});

const issuerDataSchema = z.object({
  legalName: z.string().trim().min(1, "Informe a razão social."),
  taxId: z
    .string()
    .refine((value) => isValidCNPJ(value), "CNPJ inválido — informe os 14 dígitos.")
    .transform(onlyDigits),
  annualRevenueReais: z
    .string()
    .trim()
    .min(1, "Informe a receita bruta anual.")
    .regex(MONEY_FORMAT, "Use o formato 5.000.000,00 (só números, ponto de milhar e vírgula decimal)."),
});

function firstFieldErrors(error: z.ZodError): Partial<Record<string, string>> {
  const result: Partial<Record<string, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in result)) {
      result[field] = issue.message;
    }
  }
  return result;
}

function translateDbError(error: PostgrestError): CreateAccountState {
  if (error.code === "23514" && error.message.includes("issuer_is_sep")) {
    return {
      status: "error",
      message: "Receita bruta acima do limite de R$40 milhões da SEP (Resolução CVM 88).",
      fieldErrors: { annualRevenueReais: "Acima do limite de R$40 milhões." },
    };
  }
  console.error("createAccount: erro inesperado do banco", error);
  return {
    status: "error",
    message: "Não foi possível concluir o cadastro. Tente novamente em instantes.",
  };
}

export async function createAccount(roleInput: unknown, dataInput: unknown): Promise<CreateAccountState> {
  const roleResult = roleSchema.safeParse(roleInput);
  if (!roleResult.success) {
    return { status: "error", message: "Papel inválido." };
  }
  const role: AccountRole = roleResult.data;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/entrar");
  }

  // Defesa em profundidade: a tela de /cadastro já redireciona pra /conta
  // se o usuário já tem cadastro, mas revalida aqui contra corrida (ex.:
  // dois submits quase simultâneos da mesma sessão).
  const existing = await resolveAccount();
  if (existing.role) {
    redirect("/conta");
  }

  const admin = createAdminClient();

  if (role === "investor") {
    const parsed = investorDataSchema.safeParse(dataInput);
    if (!parsed.success) {
      return {
        status: "error",
        message: "Corrija os campos destacados.",
        fieldErrors: firstFieldErrors(parsed.error),
      };
    }

    const { error } = await admin.from("investors").insert({
      user_id: user.id,
      full_name: parsed.data.fullName,
      tax_id: parsed.data.taxId,
    });

    if (error) {
      if (error.code === "23505") {
        // unique_violation em investors.user_id — o banco é a autoridade
        // final; trata como "já tem cadastro", não como erro de servidor.
        redirect("/conta");
      }
      return translateDbError(error);
    }
  } else {
    const parsed = issuerDataSchema.safeParse(dataInput);
    if (!parsed.success) {
      return {
        status: "error",
        message: "Corrija os campos destacados.",
        fieldErrors: firstFieldErrors(parsed.error),
      };
    }

    const annualRevenueCents = reaisToCents(parsed.data.annualRevenueReais);
    if (annualRevenueCents === null) {
      return {
        status: "error",
        message: "Corrija os campos destacados.",
        fieldErrors: { annualRevenueReais: "Use o formato 5.000.000,00." },
      };
    }

    const { error } = await admin.from("issuers").insert({
      user_id: user.id,
      legal_name: parsed.data.legalName,
      tax_id: parsed.data.taxId,
      annual_revenue_cents: annualRevenueCents.toString(),
    });

    if (error) {
      if (error.code === "23505") {
        redirect("/conta");
      }
      return translateDbError(error);
    }
  }

  redirect("/conta");
}

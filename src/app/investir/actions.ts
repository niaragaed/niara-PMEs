"use server";

// Server Action de reserva de aporte — só INVESTIDOR reserva (status
// 'reserved'). REGRA DE HONESTIDADE: isto GRAVA no banco de verdade,
// investor_id nunca vem do cliente, sempre de resolveAccount() (sessão no
// servidor). zod só valida formato/faixa básica de UX; quem barra os limites
// da Res.88 (teto anual do investidor, hard_cap da oferta, janela/status da
// oferta) é o BANCO via trigger (ver supabase/migrations/0001_core.sql) — a
// action tenta o insert e traduz o erro que o trigger levantou. Nenhum desses
// limites é replicado aqui. Escopo 3b-2: só reserva — sem confirmação de
// pagamento, sem KYC, sem fechamento (passos seguintes).
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";
import { resolveAccount } from "@/lib/auth/resolveInvestor";
import { payments } from "@/lib/adapters";
import { createAdminClient } from "@/lib/supabase/admin";
import { MONEY_FORMAT, reaisToCents } from "@/lib/money";

export type ReserveInvestmentState =
  | { status: "success" }
  | { status: "error"; message: string; fieldErrors?: Partial<Record<string, string>> };

const reserveInvestmentSchema = z.object({
  offeringId: z.string().uuid("Oferta inválida."),
  valorReais: z
    .string()
    .trim()
    .min(1, "Informe o valor do aporte.")
    .regex(MONEY_FORMAT, "Use o formato 1.000,00."),
});

function translateInvestmentDbError(error: PostgrestError): ReserveInvestmentState {
  if (error.code === "23514") {
    if (error.message.includes("teto anual do investidor")) {
      return {
        status: "error",
        message: "Este aporte passa do seu limite anual de investimento.",
      };
    }
    if (error.message.includes("estoura o hard_cap")) {
      return {
        status: "error",
        message: "A oferta não tem espaço para esse valor (teto atingido).",
      };
    }
    if (error.message.includes("nao esta ativa") || error.message.includes("fora da janela")) {
      return { status: "error", message: "Esta oferta não está aberta para reserva." };
    }
  }
  console.error("investir: erro inesperado do banco", error);
  return { status: "error", message: "Não foi possível concluir a reserva. Tente novamente em instantes." };
}

export async function reserveInvestment(dataInput: unknown): Promise<ReserveInvestmentState> {
  const { role, accountId } = await resolveAccount();
  if (role !== "investor" || !accountId) {
    return { status: "error", message: "Apenas investidores cadastrados podem reservar aportes." };
  }

  const parsed = reserveInvestmentSchema.safeParse(dataInput);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<string, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !(field in fieldErrors)) {
        fieldErrors[field] = issue.message;
      }
    }
    return { status: "error", message: "Corrija os campos destacados.", fieldErrors };
  }

  const amountCents = reaisToCents(parsed.data.valorReais);
  if (amountCents === null) {
    return {
      status: "error",
      message: "Corrija os campos destacados.",
      fieldErrors: { valorReais: "Use o formato 1.000,00." },
    };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("investments").insert({
    offering_id: parsed.data.offeringId,
    investor_id: accountId,
    amount_cents: amountCents.toString(),
    is_demo: process.env.NIARA_ENV === "demo",
  });

  if (error) {
    return translateInvestmentDbError(error);
  }

  revalidatePath("/investir");
  return { status: "success" };
}

// Confirmação de pagamento (reserved -> paid) — 3b-3. REGRA DE HONESTIDADE: o
// escrow é MOCK (src/lib/mocks.ts, ver src/lib/adapters.ts) — o ref gravado
// como payment_ref começa sempre com "MOCK-". A função confirm_investment
// (supabase/migrations/0005_confirm_investment.sql) é quem decide de forma
// atômica se a transição pode acontecer (idempotência + gate de KYC via
// trigger); esta action não revalida nada disso em JS, só chama a RPC e
// traduz o resultado/erro.
export type ConfirmInvestmentState =
  | { status: "success"; message: string }
  | { status: "error"; message: string; kycRequired?: boolean };

function translateConfirmInvestmentDbError(error: PostgrestError): ConfirmInvestmentState {
  if (error.code === "23514" && error.message.includes("KYC nao aprovado")) {
    return {
      status: "error",
      message: "Aprove seu KYC (demonstração) para confirmar o pagamento.",
      kycRequired: true,
    };
  }
  console.error("investir: erro inesperado ao confirmar pagamento", error);
  return { status: "error", message: "Não foi possível confirmar o pagamento. Tente novamente em instantes." };
}

export async function confirmInvestment(investmentIdInput: unknown): Promise<ConfirmInvestmentState> {
  const { role, accountId } = await resolveAccount();
  if (role !== "investor" || !accountId) {
    return { status: "error", message: "Apenas investidores cadastrados podem confirmar pagamento." };
  }

  const parsedId = z.string().uuid("Aporte inválido.").safeParse(investmentIdInput);
  if (!parsedId.success) {
    return { status: "error", message: "Aporte inválido." };
  }
  const investmentId = parsedId.data;

  const admin = createAdminClient();

  // Confere que o aporte é do investidor logado antes de agir — investor_id
  // nunca vem do cliente, o id do aporte por si só não autoriza nada.
  const { data: investment, error: fetchError } = await admin
    .from("investments")
    .select("id, investor_id, offering_id, amount_cents, status")
    .eq("id", investmentId)
    .maybeSingle();

  if (fetchError) {
    console.error("investir: erro ao buscar aporte para confirmação", fetchError);
    return { status: "error", message: "Não foi possível confirmar o pagamento. Tente novamente em instantes." };
  }
  if (!investment || investment.investor_id !== accountId) {
    return { status: "error", message: "Aporte não encontrado." };
  }
  if (investment.status === "paid") {
    return { status: "success", message: "Pagamento (simulado) já confirmado." };
  }

  const escrow = await payments.createEscrowIntent({
    ofertaId: investment.offering_id as string,
    investidorId: accountId,
    valorCentavos: Number(investment.amount_cents),
  });
  const confirmedEscrow = await payments.confirmPayment(escrow.ref);

  const { data: rpcResult, error: rpcError } = await admin.rpc("confirm_investment", {
    p_investment_id: investmentId,
    p_external_ref: confirmedEscrow.ref,
    p_idempotency_key: `confirm-${investmentId}`,
  });

  if (rpcError) {
    return translateConfirmInvestmentDbError(rpcError);
  }

  revalidatePath("/investir");

  if (rpcResult === "already_paid" || rpcResult === "already_processed") {
    return { status: "success", message: "Pagamento (simulado) já confirmado." };
  }
  return { status: "success", message: "Pagamento (simulado) confirmado." };
}

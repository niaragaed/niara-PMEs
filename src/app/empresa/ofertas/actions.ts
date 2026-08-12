"use server";

// Server Actions de ofertas de captação — só EMPRESA (issuer) cria/ativa.
// REGRA DE HONESTIDADE: isto GRAVA no banco de verdade. issuer_id nunca vem
// do cliente, sempre de resolveAccount() (sessão no servidor). zod só valida
// FORMATO/faixas básicas de UX; quem valida as regras da Res.88 (teto de
// R$15M, lote adicional <=25%, prazo <=180d, meta<=teto) é o banco — a
// action tenta a operação e traduz o CHECK que estourou. Nenhuma dessas
// regras é replicada aqui além do necessário pra não mandar lixo óbvio pro
// banco (ex.: percentual fora de 0-25, prazo fora de 1-180).
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";
import { chain } from "@/lib/adapters";
import { resolveAccount } from "@/lib/auth/resolveInvestor";
import { createAdminClient } from "@/lib/supabase/admin";
import { MONEY_FORMAT, reaisToCents } from "@/lib/money";

export type OfferingActionState =
  | { status: "success" }
  | { status: "error"; message: string; fieldErrors?: Partial<Record<string, string>> };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Mesmo conjunto de categorias do CHECK de offerings.category (0009) e do
// tipo TokenCategory (src/lib/mock/ativos.ts) — todas selecionáveis nesta
// demonstração; o CHECK do banco continua sendo o backstop real.
const OFFERING_CATEGORIES = ["pmes", "agro", "imobiliario", "auto", "divida"] as const;

const createOfferingSchema = z.object({
  baseCapReais: z
    .string()
    .trim()
    .min(1, "Informe o valor da oferta.")
    .regex(MONEY_FORMAT, "Use o formato 5.000.000,00."),
  targetMinReais: z
    .string()
    .trim()
    .min(1, "Informe a meta mínima.")
    .regex(MONEY_FORMAT, "Use o formato 5.000.000,00."),
  additionalLotPct: z.coerce.number().int().min(0).max(25),
  windowDays: z.coerce.number().int().min(1).max(180),
  sharePriceReais: z
    .string()
    .trim()
    .min(1, "Informe o valor por cota.")
    .regex(MONEY_FORMAT, "Use o formato 5.000.000,00."),
  categoria: z.enum(OFFERING_CATEGORIES, { message: "Selecione uma categoria." }),
});

// hard_cap = base + floor(base * pct / 100), tudo em BigInt/centavos
// inteiros — nunca float. Com pct=0 o resultado é EXATAMENTE base (a soma
// de zero não altera o valor). A divisão de BigInt trunca em direção a
// zero, que para valores não-negativos é floor — mesma semântica da
// divisão inteira que o CHECK "additional_lot" do banco usa
// (base_cap_cents / 4). Matematicamente, floor(base*25/100) == floor(base/4)
// para todo base inteiro (25/100 e 1/4 são a mesma fração exata), então com
// pct no intervalo validado [0,25] o resultado nunca ultrapassa o teto do
// CHECK — só reforça, não substitui, a validação do banco.
function computeHardCapCents(baseCapCents: bigint, additionalLotPct: number): bigint {
  return baseCapCents + (baseCapCents * BigInt(additionalLotPct)) / BigInt(100);
}

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

function translateOfferingDbError(error: PostgrestError): OfferingActionState {
  if (error.code === "23514") {
    if (error.message.includes("cap_le_15m")) {
      return {
        status: "error",
        message: "O valor da oferta (com o lote adicional) está acima do teto de R$15 milhões por oferta.",
      };
    }
    if (error.message.includes("additional_lot")) {
      return { status: "error", message: "O lote adicional está acima de 25% da oferta original." };
    }
    if (error.message.includes("window_le_180d")) {
      return { status: "error", message: "O prazo da oferta está acima de 180 dias." };
    }
    if (error.message.includes("min_le_hardcap")) {
      return { status: "error", message: "A meta mínima não pode passar do teto da oferta." };
    }
    if (error.message.includes("offerings_share_price_cents_check")) {
      return {
        status: "error",
        message: "O valor da oferta precisa ser múltiplo do valor por cota.",
        fieldErrors: { sharePriceReais: "O valor da oferta precisa ser múltiplo deste valor." },
      };
    }
  }
  console.error("ofertas: erro inesperado do banco", error);
  return { status: "error", message: "Não foi possível concluir a operação. Tente novamente em instantes." };
}

export async function createOffering(dataInput: unknown): Promise<OfferingActionState> {
  const { role, accountId } = await resolveAccount();
  if (role !== "issuer" || !accountId) {
    return { status: "error", message: "Apenas empresas cadastradas podem criar ofertas." };
  }

  const parsed = createOfferingSchema.safeParse(dataInput);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Corrija os campos destacados.",
      fieldErrors: firstFieldErrors(parsed.error),
    };
  }

  const baseCapCents = reaisToCents(parsed.data.baseCapReais);
  const targetMinCents = reaisToCents(parsed.data.targetMinReais);
  const sharePriceCents = reaisToCents(parsed.data.sharePriceReais);
  if (baseCapCents === null || targetMinCents === null || sharePriceCents === null) {
    return {
      status: "error",
      message: "Corrija os campos destacados.",
      fieldErrors: {
        ...(baseCapCents === null ? { baseCapReais: "Use o formato 5.000.000,00." } : {}),
        ...(targetMinCents === null ? { targetMinReais: "Use o formato 5.000.000,00." } : {}),
        ...(sharePriceCents === null ? { sharePriceReais: "Use o formato 5.000.000,00." } : {}),
      },
    };
  }

  const hardCapCents = computeHardCapCents(baseCapCents, parsed.data.additionalLotPct);

  const opensAt = new Date();
  const closesAt = new Date(opensAt.getTime() + parsed.data.windowDays * MS_PER_DAY);

  const admin = createAdminClient();
  const { error } = await admin.from("offerings").insert({
    issuer_id: accountId,
    status: "draft",
    target_min_cents: targetMinCents.toString(),
    base_cap_cents: baseCapCents.toString(),
    hard_cap_cents: hardCapCents.toString(),
    share_price_cents: sharePriceCents.toString(),
    category: parsed.data.categoria,
    opens_at: opensAt.toISOString(),
    closes_at: closesAt.toISOString(),
    is_demo: process.env.NIARA_ENV === "demo",
  });

  if (error) {
    return translateOfferingDbError(error);
  }

  revalidatePath("/empresa/ofertas");
  return { status: "success" };
}

export async function activateOffering(offeringId: string): Promise<OfferingActionState> {
  const { role, accountId } = await resolveAccount();
  if (role !== "issuer" || !accountId) {
    return { status: "error", message: "Apenas empresas cadastradas podem ativar ofertas." };
  }

  const admin = createAdminClient();

  const { data: offering, error: fetchError } = await admin
    .from("offerings")
    .select("opens_at, closes_at, status")
    .eq("id", offeringId)
    .eq("issuer_id", accountId)
    .maybeSingle();

  if (fetchError) {
    return translateOfferingDbError(fetchError);
  }
  if (!offering) {
    return { status: "error", message: "Oferta não encontrada." };
  }
  if (offering.status !== "draft") {
    return { status: "error", message: "Só é possível ativar ofertas em rascunho." };
  }

  // Recalcula a janela a partir do prazo ORIGINAL (em dias, derivado do
  // rascunho) — a oferta não pode nascer ativa já fora da janela só porque
  // ficou alguns dias em draft antes de ser ativada. opens_at também vira
  // o instante da ativação, não o da criação do rascunho.
  const originalOpensAt = new Date(offering.opens_at as string);
  const originalClosesAt = new Date(offering.closes_at as string);
  const windowDays = Math.round((originalClosesAt.getTime() - originalOpensAt.getTime()) / MS_PER_DAY);

  const newOpensAt = new Date();
  const newClosesAt = new Date(newOpensAt.getTime() + windowDays * MS_PER_DAY);

  // UPDATE atômico: reafirma id + issuer_id + status='draft' na própria
  // cláusula WHERE (não há trigger de transição de status em `offerings`,
  // diferente de `investments`) — protege contra corrida entre o SELECT
  // acima e este UPDATE (dois cliques quase simultâneos, por exemplo). Se
  // nenhuma linha voltar, a oferta deixou de ser do issuer/deixou de estar
  // em draft entre as duas chamadas.
  const { data: updated, error: updateError } = await admin
    .from("offerings")
    .update({
      status: "active",
      opens_at: newOpensAt.toISOString(),
      closes_at: newClosesAt.toISOString(),
    })
    .eq("id", offeringId)
    .eq("issuer_id", accountId)
    .eq("status", "draft")
    .select("id");

  if (updateError) {
    return translateOfferingDbError(updateError);
  }
  if (!updated || updated.length === 0) {
    return {
      status: "error",
      message: "Não foi possível ativar — verifique se a oferta ainda está em rascunho.",
    };
  }

  revalidatePath("/empresa/ofertas");
  return { status: "success" };
}

// Fechamento (3b-4) — settle_offering/mark_offering_settled (0002) são a
// AUTORIDADE que decide funded/failed e ajusta os aportes; esta action só
// chama as RPCs e, no caso funded, emite o token mock por aporte pago antes
// de liquidar. Nenhuma regra de meta mínima é replicada aqui.
export type CloseOfferingState =
  | { status: "success"; result: "funded" | "failed" }
  | { status: "error"; message: string };

function translateCloseOfferingDbError(error: PostgrestError): CloseOfferingState {
  if (error.code === "23514" && error.message.includes("nao esta ativa")) {
    return { status: "error", message: "Esta oferta já foi fechada." };
  }
  console.error("ofertas: erro inesperado ao fechar captação", error);
  return { status: "error", message: "Não foi possível fechar a captação. Tente novamente em instantes." };
}

const closeOfferingSchema = z.string().uuid("Oferta inválida.");

export async function closeOffering(offeringIdInput: unknown): Promise<CloseOfferingState> {
  const { role, accountId } = await resolveAccount();
  if (role !== "issuer" || !accountId) {
    return { status: "error", message: "Apenas empresas cadastradas podem fechar captações." };
  }

  const parsedId = closeOfferingSchema.safeParse(offeringIdInput);
  if (!parsedId.success) {
    return { status: "error", message: "Oferta inválida." };
  }
  const offeringId = parsedId.data;

  const admin = createAdminClient();

  // Confere que a oferta é do issuer logado antes de agir — offeringId
  // sozinho não autoriza nada. status vem junto para permitir retomar um
  // fechamento que já chegou a 'funded' numa tentativa anterior sem
  // re-chamar settle_offering (que só aceita oferta 'active').
  const { data: offering, error: fetchError } = await admin
    .from("offerings")
    .select("id, status")
    .eq("id", offeringId)
    .eq("issuer_id", accountId)
    .maybeSingle();

  if (fetchError) {
    console.error("ofertas: erro ao buscar oferta para fechamento", fetchError);
    return { status: "error", message: "Não foi possível fechar a captação. Tente novamente em instantes." };
  }
  if (!offering) {
    return { status: "error", message: "Oferta não encontrada." };
  }

  let settleResult: "funded" | "failed";

  if (offering.status === "funded") {
    // Retomada: uma tentativa anterior já resolveu a oferta como funded mas
    // não terminou a emissão de token / mark_offering_settled. Não chama
    // settle_offering de novo (só aceita status 'active').
    settleResult = "funded";
  } else {
    const { data: rpcResult, error: settleError } = await admin.rpc("settle_offering", {
      p_offering_id: offeringId,
    });
    if (settleError) {
      return translateCloseOfferingDbError(settleError);
    }
    settleResult = rpcResult as "funded" | "failed";
  }

  if (settleResult === "failed") {
    revalidatePath("/empresa/ofertas");
    return { status: "success", result: "failed" };
  }

  // funded: emite o token mock por aporte PAGO antes de liquidar. Idempotente
  // por aporte — idempotency_key = 'tokens-'||investment.id, mesma chave em
  // qualquer reexecução, então um retry (ou uma corrida de dois cliques) não
  // duplica emissão: a unique constraint de payment_events barra a segunda
  // gravação e o 23505 é tratado como "já emitido, seguir", não como erro.
  const { data: paidInvestments, error: paidError } = await admin
    .from("investments")
    .select("id, investor_id, amount_cents")
    .eq("offering_id", offeringId)
    .eq("status", "paid");

  if (paidError) {
    console.error("ofertas: erro ao buscar aportes pagos para emissão", paidError);
    return {
      status: "error",
      message: "Não foi possível concluir a emissão de tokens. Tente novamente em instantes.",
    };
  }

  for (const investment of paidInvestments ?? []) {
    const idempotencyKey = `tokens-${investment.id}`;

    const issuance = await chain.issueTokens({
      ofertaId: offeringId,
      investidorId: investment.investor_id as string,
      quantidade: Number(investment.amount_cents),
    });

    const { error: insertError } = await admin.from("payment_events").insert({
      investment_id: investment.id,
      event_type: "tokens_issued",
      external_ref: issuance.ref,
      idempotency_key: idempotencyKey,
    });

    if (insertError && insertError.code !== "23505") {
      console.error("ofertas: erro ao registrar emissão de token", insertError);
      return {
        status: "error",
        message: "Não foi possível concluir a emissão de tokens. Tente novamente em instantes.",
      };
    }
    // 23505 (idempotency_key já existe) = este aporte já teve token emitido
    // numa tentativa anterior — segue sem duplicar, não é erro.
  }

  const { error: settledError } = await admin.rpc("mark_offering_settled", {
    p_offering_id: offeringId,
  });

  if (settledError) {
    return translateCloseOfferingDbError(settledError);
  }

  revalidatePath("/empresa/ofertas");
  return { status: "success", result: "funded" };
}

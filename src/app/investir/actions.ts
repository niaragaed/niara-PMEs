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
import { CAP_OCCUPYING_STATUSES } from "@/lib/investments";
import { maskCnpjPublic } from "@/lib/masks";
import type { TokenCategory } from "@/lib/mock/ativos";
import { createAdminClient } from "@/lib/supabase/admin";
import { MONEY_FORMAT, reaisToCents } from "@/lib/money";
import { getIssuerLogoVersion, issuerLogoUrl } from "@/lib/storage/issuer-logo";

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

// Join usado só pela checagem de defesa em profundidade de reserveInvestment
// abaixo — resolve o user_id do issuer dono da oferta, para comparar contra
// o userId do investidor logado (accountId não serve aqui: com
// role==='investor', accountId é sempre investors.id, nunca igual a
// issuers.id, mesmo quando o mesmo user_id acabasse linkado às duas
// contas).
type OfferingIssuerLinkRow = {
  issuers: { user_id: string } | { user_id: string }[] | null;
};

function firstIssuerUserId(issuers: OfferingIssuerLinkRow["issuers"]): string | null {
  if (!issuers) return null;
  const issuerRow = Array.isArray(issuers) ? issuers[0] : issuers;
  return issuerRow?.user_id ?? null;
}

export async function reserveInvestment(dataInput: unknown): Promise<ReserveInvestmentState> {
  const { role, accountId, userId } = await resolveAccount();
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

  // Defesa em profundidade: o gate de role==='investor' acima já deveria
  // bastar (uma conta é investidor OU empresa, nunca as duas — ver
  // resolveInvestor.ts), mas aqui reforçamos de forma explícita, via
  // user_id, que o investidor logado não é o dono da empresa emissora desta
  // oferta. Nunca confia em accountId para essa comparação (tipos de conta
  // diferentes).
  const { data: offeringLink, error: offeringLinkError } = await admin
    .from("offerings")
    .select("issuers(user_id)")
    .eq("id", parsed.data.offeringId)
    .maybeSingle();

  if (offeringLinkError) {
    console.error("investir: erro ao verificar dono da oferta", offeringLinkError);
    return { status: "error", message: "Não foi possível concluir a reserva. Tente novamente em instantes." };
  }

  const issuerUserId = offeringLink ? firstIssuerUserId((offeringLink as OfferingIssuerLinkRow).issuers) : null;
  if (issuerUserId !== null && issuerUserId === userId) {
    return { status: "error", message: "Você não pode investir na sua própria oferta." };
  }

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

// Leitura pública da página de detalhe da oferta (3b-4c) — REGRA DE OURO:
// qualquer investidor logado pode ver a oferta de qualquer empresa, então o
// SELECT é uma LISTA BRANCA explícita, nunca select('*') do issuer. phone,
// endereço completo, wallet_address e receita bruta NUNCA são buscados aqui
// — não é só uma questão de não exibir no JSX, o campo nem sai do banco, o
// que também garante que nunca aparecem no HTML servido (view-source).
export type PublicOfferingIssuer = {
  legalName: string;
  tradeName: string | null;
  sector: string | null;
  businessSummary: string | null;
  city: string | null;
  state: string | null;
  /** null se a empresa não optou por publicar (issuers.publish_cnpj = false) — nesse caso tax_id nem chega a ser lido do banco. */
  cnpjMasked: string | null;
  logoUrl: string | null;
};

export type PublicOffering = {
  id: string;
  targetMinCents: number;
  baseCapCents: number;
  hardCapCents: number;
  sharePriceCents: number | null;
  category: TokenCategory | null;
  opensAt: string;
  closesAt: string;
  arrecadadoCents: number;
  issuer: PublicOfferingIssuer;
};

type PublicOfferingIssuerRow = {
  legal_name: string;
  trade_name: string | null;
  sector: string | null;
  business_summary: string | null;
  addr_city: string | null;
  addr_state: string | null;
  publish_cnpj: boolean;
  logo_path: string | null;
};

type PublicOfferingRow = {
  id: string;
  issuer_id: string;
  target_min_cents: number;
  base_cap_cents: number;
  hard_cap_cents: number;
  share_price_cents: number | null;
  category: string | null;
  opens_at: string;
  closes_at: string;
  issuers: PublicOfferingIssuerRow | PublicOfferingIssuerRow[] | null;
};

function firstIssuer(issuers: PublicOfferingRow["issuers"]): PublicOfferingIssuerRow | null {
  if (!issuers) return null;
  return Array.isArray(issuers) ? (issuers[0] ?? null) : issuers;
}

export async function loadPublicOffering(offeringIdInput: unknown): Promise<PublicOffering | null> {
  const parsedId = z.string().uuid().safeParse(offeringIdInput);
  if (!parsedId.success) return null;
  const offeringId = parsedId.data;

  const admin = createAdminClient();

  // Passo 1: lista branca, SEM tax_id — publish_cnpj vem junto só para
  // decidir se o passo 2 (que lê tax_id) roda ou não.
  const { data, error } = await admin
    .from("offerings")
    .select(
      "id, issuer_id, target_min_cents, base_cap_cents, hard_cap_cents, share_price_cents, category, opens_at, closes_at, issuers(legal_name, trade_name, sector, business_summary, addr_city, addr_state, publish_cnpj, logo_path)",
    )
    .eq("id", offeringId)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return null;

  const offering = data as unknown as PublicOfferingRow;
  const issuerRow = firstIssuer(offering.issuers);
  if (!issuerRow) return null;

  // Passo 2: só busca tax_id se a empresa optou por publicar — para quem
  // não optou, o CNPJ não é lido do banco, não só "não exibido" no JSX.
  let cnpjMasked: string | null = null;
  if (issuerRow.publish_cnpj) {
    const { data: taxIdRow } = await admin
      .from("issuers")
      .select("tax_id")
      .eq("id", offering.issuer_id)
      .maybeSingle();
    if (taxIdRow?.tax_id) {
      cnpjMasked = maskCnpjPublic(taxIdRow.tax_id);
    }
  }

  const { data: investmentsData } = await admin
    .from("investments")
    .select("amount_cents")
    .eq("offering_id", offeringId)
    .in("status", CAP_OCCUPYING_STATUSES);

  const arrecadadoCents = (investmentsData ?? []).reduce(
    (total, investment) => total + Number(investment.amount_cents),
    0,
  );

  const logoUrl = issuerRow.logo_path
    ? issuerLogoUrl(issuerRow.logo_path, await getIssuerLogoVersion(admin, issuerRow.logo_path))
    : null;

  return {
    id: offering.id,
    targetMinCents: Number(offering.target_min_cents),
    baseCapCents: Number(offering.base_cap_cents),
    hardCapCents: Number(offering.hard_cap_cents),
    sharePriceCents: offering.share_price_cents === null ? null : Number(offering.share_price_cents),
    category: offering.category as TokenCategory | null,
    opensAt: offering.opens_at,
    closesAt: offering.closes_at,
    arrecadadoCents,
    issuer: {
      legalName: issuerRow.legal_name,
      tradeName: issuerRow.trade_name,
      sector: issuerRow.sector,
      businessSummary: issuerRow.business_summary,
      city: issuerRow.addr_city,
      state: issuerRow.addr_state,
      cnpjMasked,
      logoUrl,
    },
  };
}

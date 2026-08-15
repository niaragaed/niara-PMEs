import "server-only";

// Leitura das transações "demo/mock" (fluxo Supabase de /investir) para o painel interno
// /socios — nunca misturado com os dados reais on-chain de src/lib/web3/events.ts. Mesma REGRA
// DE OURO já documentada em src/lib/investments.ts: lista branca explícita de colunas, nunca
// select('*') — este painel é interno, mas continua sem motivo pra puxar CPF/documento/endereço
// que não aparecem na tela.
import { createAdminClient } from "@/lib/supabase/admin";

export type TransacaoMock = {
  id: string;
  offeringId: string;
  investorId: string;
  issuerLegalName: string;
  investorFullName: string;
  amountCents: number;
  status: "reserved" | "paid" | "settled" | "refunded" | "cancelled";
  paymentRef: string | null;
  createdAt: string;
};

type QueryRow = {
  id: string;
  offering_id: string;
  investor_id: string;
  amount_cents: number;
  status: TransacaoMock["status"];
  payment_ref: string | null;
  created_at: string;
  investors: { full_name: string } | { full_name: string }[] | null;
  offerings: { issuers: { legal_name: string } | { legal_name: string }[] | null } | null;
};

function nomeInvestidor(investors: QueryRow["investors"]): string {
  if (!investors) return "—";
  return Array.isArray(investors) ? (investors[0]?.full_name ?? "—") : investors.full_name;
}

function nomeEmissor(offerings: QueryRow["offerings"]): string {
  const issuers = offerings?.issuers;
  if (!issuers) return "—";
  return Array.isArray(issuers) ? (issuers[0]?.legal_name ?? "—") : issuers.legal_name;
}

/**
 * Todas as transações (aportes) do fluxo Supabase mock, mais recentes primeiro — sem filtro
 * por investidor/emissor, porque quem acessa /socios já passou pela allowlist de sócio.
 */
export async function listarTransacoesMock(): Promise<TransacaoMock[]> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("investments")
    .select(
      "id, offering_id, investor_id, amount_cents, status, payment_ref, created_at, investors(full_name), offerings(issuers(legal_name))",
    )
    .order("created_at", { ascending: false })
    .returns<QueryRow[]>();

  return (data ?? []).map((row) => ({
    id: row.id,
    offeringId: row.offering_id,
    investorId: row.investor_id,
    issuerLegalName: nomeEmissor(row.offerings),
    investorFullName: nomeInvestidor(row.investors),
    amountCents: row.amount_cents,
    status: row.status,
    paymentRef: row.payment_ref,
    createdAt: row.created_at,
  }));
}

export type ResumoMock = {
  totalCents: number;
  investidoresUnicos: number;
};

export function computeResumoMock(transacoes: TransacaoMock[]): ResumoMock {
  const contabilizadas = transacoes.filter((t) => t.status === "paid" || t.status === "settled");
  return {
    totalCents: contabilizadas.reduce((total, t) => total + t.amountCents, 0),
    investidoresUnicos: new Set(contabilizadas.map((t) => t.investorId)).size,
  };
}

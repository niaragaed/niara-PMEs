import "server-only";

// Timeline única de "todas as movimentações do site" para o painel interno /socios — combina
// eventos reais on-chain (src/lib/web3/events.ts) com as movimentações off-chain do Supabase:
// cadastro de investidor, cadastro de emissor, oferta criada, aporte (investments, em qualquer
// status — reservado/pago/liquidado/reembolsado/cancelado) e cada evento da trilha de pagamento
// (payment_events: pagamento confirmado, tokens emitidos). Pedido explícito do usuário: uma
// tabela só, sem separar por seção — cada linha carrega sua própria origem (on-chain real /
// off-chain demo) pra quem quiser entender de onde veio, mas a lista é uma só, ordenada por
// data.
//
// Mesma REGRA DE OURO já usada em investments.ts/mockTransacoes.ts: lista branca explícita de
// colunas, nunca select('*') — mesmo sendo painel interno, sem motivo pra puxar CPF/documento
// que não aparecem na tela.
import { createAdminClient } from "@/lib/supabase/admin";
import { formatUnits } from "viem";
import { formatBRL } from "@/lib/format";
import { getEventsOnChain, getSummaryOnChain, type EventoOnChain, type OnChainSummary } from "@/lib/web3/events";
import { loadConfirmedOnChainOfferings } from "@/lib/web3/confirmedOfferings";
import { solanaExplorerAccountLink } from "@/lib/solana/config";
import { ptBr } from "@/lib/i18n/pt-br";

export type TransactionOrigin = "onchain" | "offchain";

export type Transaction = {
  id: string;
  timestamp: number; // epoch seconds, para ordenar e formatar igual nos dois lados
  origem: TransactionOrigin;
  tipo: string; // já traduzido, pronto pra exibir
  ator: string | null; // nome (off-chain) ou endereço truncado (on-chain)
  valor: string | null; // já formatado (BRL ou token), pronto pra exibir
  link: string | null; // link externo (Sepolia Etherscan), quando existir
};

export type TransactionsSummary = {
  onChain: OnChainSummary | null;
  totalAportesMockCents: number; // status paid/settled, mesma regra de computeResumoMock antigo
  investidoresUnicosMock: number;
};

function epoch(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000);
}

function centsToBRL(cents: number): string {
  return formatBRL(cents / 100);
}

function onChainEventToTransaction(evento: EventoOnChain, summary: OnChainSummary | null): Transaction {
  const t = ptBr.partners.realTable;
  const decimals = summary?.mockBrlDecimals ?? 18;
  const symbol = summary?.mockBrlSymbol ?? "mBRL";

  const value =
    evento.valorWei !== null
      ? `${Number(formatUnits(evento.valorWei, decimals)).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${symbol}`
      : evento.cotas !== null
        ? `${formatUnits(evento.cotas, 18)} cotas`
        : null;

  return {
    id: `onchain-${evento.txHash}-${evento.tipo}`,
    timestamp: evento.timestamp ?? 0,
    origem: "onchain",
    tipo: t.types[evento.tipo],
    ator: evento.investidor ? `${evento.investidor.slice(0, 6)}…${evento.investidor.slice(-4)}` : null,
    valor: value,
    link: `https://sepolia.etherscan.io/tx/${evento.txHash}`,
  };
}

type SingleNameOrList<T> = T | T[] | null;

function first<T>(value: SingleNameOrList<T>): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

type InvestorRow = { id: string; full_name: string; created_at: string };
type IssuerRow = { id: string; legal_name: string; created_at: string };
type OfferingRow = {
  id: string;
  created_at: string;
  issuers: SingleNameOrList<{ legal_name: string }>;
};
type InvestmentRow = {
  id: string;
  amount_cents: number;
  status: "reserved" | "paid" | "settled" | "refunded" | "cancelled";
  created_at: string;
  investors: SingleNameOrList<{ full_name: string }>;
  offerings: SingleNameOrList<{ issuers: SingleNameOrList<{ legal_name: string }> }>;
};
type PaymentEventRow = {
  id: string;
  event_type: string;
  created_at: string;
  investments: SingleNameOrList<{
    amount_cents: number;
    investors: SingleNameOrList<{ full_name: string }>;
    offerings: SingleNameOrList<{ issuers: SingleNameOrList<{ legal_name: string }> }>;
  }>;
};

const INVESTMENT_STATUS: Record<InvestmentRow["status"], string> = {
  reserved: "Reservado",
  paid: "Pago (simulado)",
  settled: "Liquidado",
  refunded: "Reembolsado",
  cancelled: "Cancelado",
};

const PAYMENT_EVENT_TYPE: Record<string, string> = {
  escrow_intent: "Escrow iniciado",
  payment_confirmed: "Pagamento confirmado (simulado)",
  release: "Recursos liberados ao emissor",
  refund: "Reembolso",
  tokens_issued: "Tokens emitidos (simulado)",
};

async function listInvestorRegistrations(): Promise<Transaction[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("investors")
    .select("id, full_name, created_at")
    .order("created_at", { ascending: false })
    .returns<InvestorRow[]>();

  return (data ?? []).map((row) => ({
    id: `investor-signup-${row.id}`,
    timestamp: epoch(row.created_at),
    origem: "offchain" as const,
    tipo: "Cadastro de investidor",
    ator: row.full_name,
    valor: null,
    link: null,
  }));
}

async function listIssuerRegistrations(): Promise<Transaction[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("issuers")
    .select("id, legal_name, created_at")
    .order("created_at", { ascending: false })
    .returns<IssuerRow[]>();

  return (data ?? []).map((row) => ({
    id: `issuer-signup-${row.id}`,
    timestamp: epoch(row.created_at),
    origem: "offchain" as const,
    tipo: "Cadastro de emissor",
    ator: row.legal_name,
    valor: null,
    link: null,
  }));
}

async function listCreatedOfferings(): Promise<Transaction[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("offerings")
    .select("id, created_at, issuers(legal_name)")
    .order("created_at", { ascending: false })
    .returns<OfferingRow[]>();

  return (data ?? []).map((row) => ({
    id: `offering-created-${row.id}`,
    timestamp: epoch(row.created_at),
    origem: "offchain" as const,
    tipo: "Oferta criada",
    ator: first(row.issuers)?.legal_name ?? "—",
    valor: null,
    link: null,
  }));
}

const deadlineFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

// cents -> mBRL (número, sem símbolo de moeda real) — mesma conversão de verificarConsistencia()
// (UNIDADE_ON_CHAIN, src/lib/web3/gates.ts: "1 unidade MockBRL = 1 real equivalente"), mas
// rotulada mBRL aqui, nunca R$: mesmo princípio já aplicado em SelfServicePmesCard.tsx — este é
// MockBRL sem lastro, e as outras linhas desta MESMA tabela (aportes/eventos on-chain reais, ver
// eventoOnChainParaMovimentacao acima) já usam mBRL pro "Valor" de eventos on-chain, então usar
// R$ aqui destoaria dentro da própria coluna.
function formatMbrl(cents: number): string {
  return `${(cents / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mBRL`;
}

/**
 * Ofertas self-service (publicadas pelo próprio emissor via OfertaOrquestrador, ver CLAUDE.md
 * "Tela /empresa/ofertas" → Fase 3) já confirmadas on-chain — aparecem na timeline no momento em
 * que `sync_status` chega a 'confirmada', reaproveitando loadConfirmedOnChainOfferings() (mesma
 * leitura já usada por /investir/onchain e pela vitrine de /negociar/token-pmes). Só exibição —
 * nenhuma ação aqui; `origem: "onchain"` porque o referente (a oferta/contrato) é real em Sepolia,
 * mesmo a leitura em si vindo do Supabase (espelho já confirmado contra a chain na hora da
 * publicação e a cada reconciliação, não um valor inventado).
 */
async function listConfirmedSelfServiceOfferings(): Promise<Transaction[]> {
  const offerings = await loadConfirmedOnChainOfferings();

  return offerings.map((offering) => ({
    id: `self-service-offering-${offering.id}`,
    timestamp: offering.onchainConfirmedAt ? epoch(offering.onchainConfirmedAt) : 0,
    origem: "onchain" as const,
    tipo: offering.rede === "sepolia" ? "Oferta self-service confirmada" : "Oferta self-service confirmada (Solana Devnet)",
    ator: offering.issuerTradeName ?? offering.issuerLegalName,
    valor: `Meta: ${formatMbrl(offering.targetMinCents)}–${formatMbrl(offering.hardCapCents)} · Preço/cota: ${
      offering.sharePriceCents === null ? "—" : formatMbrl(offering.sharePriceCents)
    } · Prazo: ${deadlineFormatter.format(new Date(offering.closesAt))}`,
    link:
      offering.rede === "sepolia"
        ? `https://sepolia.etherscan.io/address/${offering.contractAddress}`
        : solanaExplorerAccountLink(offering.contractAddress),
  }));
}

async function listInvestments(): Promise<InvestmentRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("investments")
    .select("id, amount_cents, status, created_at, investors(full_name), offerings(issuers(legal_name))")
    .order("created_at", { ascending: false })
    .returns<InvestmentRow[]>();
  return data ?? [];
}

function investmentToTransaction(row: InvestmentRow): Transaction {
  const investor = first(row.investors)?.full_name ?? "—";
  const issuer = first(first(row.offerings)?.issuers ?? null)?.legal_name ?? "—";

  return {
    id: `investment-${row.id}`,
    timestamp: epoch(row.created_at),
    origem: "offchain",
    tipo: `Aporte — ${INVESTMENT_STATUS[row.status]}`,
    ator: `${investor} — ${issuer}`,
    valor: centsToBRL(row.amount_cents),
    link: null,
  };
}

async function listPaymentEvents(): Promise<Transaction[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("payment_events")
    .select("id, event_type, created_at, investments(amount_cents, investors(full_name), offerings(issuers(legal_name)))")
    .order("created_at", { ascending: false })
    .returns<PaymentEventRow[]>();

  return (data ?? []).map((row) => {
    const investment = first(row.investments);
    const investor = investment ? first(investment.investors) : null;
    const offering = investment ? first(investment.offerings) : null;
    const issuer = offering ? first(offering.issuers) : null;
    const actor = [investor?.full_name, issuer?.legal_name].filter(Boolean).join(" — ") || null;

    return {
      id: `payment-event-${row.id}`,
      timestamp: epoch(row.created_at),
      origem: "offchain" as const,
      tipo: PAYMENT_EVENT_TYPE[row.event_type] ?? row.event_type,
      ator: actor,
      valor: investment ? centsToBRL(investment.amount_cents) : null,
      link: null,
    };
  });
}

function computeMockSummary(investments: InvestmentRow[]): { totalCents: number; investidoresUnicos: number } {
  const counted = investments.filter((a) => a.status === "paid" || a.status === "settled");
  return {
    totalCents: counted.reduce((total, a) => total + a.amount_cents, 0),
    investidoresUnicos: new Set(counted.map((a) => first(a.investors)?.full_name)).size,
  };
}

/**
 * Timeline única com TODAS as movimentações do site — on-chain (Sepolia real) e off-chain
 * (Supabase: cadastros, ofertas criadas, aportes em qualquer status, trilha de pagamento) —
 * mais recentes primeiro, mais um resumo agregado (mesmos números que os KPIs já mostravam
 * antes, agora computados junto pra não duplicar leitura). Cada fonte é buscada em paralelo; uma
 * falha isolada (ex.: RPC on-chain fora do ar) não derruba as outras — a função nunca lança, só
 * loga e segue sem aquela fonte.
 */
export async function getTransactionsAndSummary(): Promise<{ movimentacoes: Transaction[]; resumo: TransactionsSummary }> {
  const [onChainResult, investmentsResult, ...offchainResults] = await Promise.allSettled([
    (async () => {
      const onChainEvents = await getEventsOnChain();
      const onChainSummary = await getSummaryOnChain(onChainEvents);
      return { eventosOnChain: onChainEvents, resumoOnChain: onChainSummary };
    })(),
    listInvestments(),
    listInvestorRegistrations(),
    listIssuerRegistrations(),
    listCreatedOfferings(),
    listPaymentEvents(),
    listConfirmedSelfServiceOfferings(),
  ]);

  const transactions: Transaction[] = [];
  let onChainSummary: OnChainSummary | null = null;

  if (onChainResult.status === "fulfilled") {
    const { eventosOnChain, resumoOnChain: summary } = onChainResult.value;
    onChainSummary = summary;
    transactions.push(...eventosOnChain.map((evento) => onChainEventToTransaction(evento, summary)));
  } else {
    console.error("[socios] falha ao ler eventos on-chain (as demais fontes seguem normalmente):", onChainResult.reason);
  }

  let investments: InvestmentRow[] = [];
  if (investmentsResult.status === "fulfilled") {
    investments = investmentsResult.value;
    transactions.push(...investments.map(investmentToTransaction));
  } else {
    console.error("[socios] falha ao ler aportes (as demais fontes seguem normalmente):", investmentsResult.reason);
  }

  for (const result of offchainResults) {
    if (result.status === "fulfilled") {
      transactions.push(...result.value);
    } else {
      console.error("[socios] falha ao ler uma fonte off-chain (as demais seguem normalmente):", result.reason);
    }
  }

  transactions.sort((a, b) => b.timestamp - a.timestamp);

  const mockSummary = computeMockSummary(investments);

  return {
    movimentacoes: transactions,
    resumo: {
      onChain: onChainSummary,
      totalAportesMockCents: mockSummary.totalCents,
      investidoresUnicosMock: mockSummary.investidoresUnicos,
    },
  };
}

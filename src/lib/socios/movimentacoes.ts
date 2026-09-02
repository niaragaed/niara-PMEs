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
import { getEventosOnChain, getResumoOnChain, type EventoOnChain, type ResumoOnChain } from "@/lib/web3/events";
import { ptBr } from "@/lib/i18n/pt-br";

export type OrigemMovimentacao = "onchain" | "offchain";

export type Movimentacao = {
  id: string;
  timestamp: number; // epoch seconds, para ordenar e formatar igual nos dois lados
  origem: OrigemMovimentacao;
  tipo: string; // já traduzido, pronto pra exibir
  ator: string | null; // nome (off-chain) ou endereço truncado (on-chain)
  valor: string | null; // já formatado (BRL ou token), pronto pra exibir
  link: string | null; // link externo (Sepolia Etherscan), quando existir
};

export type ResumoMovimentacoes = {
  onChain: ResumoOnChain | null;
  totalAportesMockCents: number; // status paid/settled, mesma regra de computeResumoMock antigo
  investidoresUnicosMock: number;
};

function epoch(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000);
}

function centavosParaBRL(cents: number): string {
  return formatBRL(cents / 100);
}

function eventoOnChainParaMovimentacao(evento: EventoOnChain, resumo: ResumoOnChain | null): Movimentacao {
  const t = ptBr.socios.tabelaReal;
  const decimals = resumo?.mockBrlDecimals ?? 18;
  const symbol = resumo?.mockBrlSymbol ?? "mBRL";

  const valor =
    evento.valorWei !== null
      ? `${Number(formatUnits(evento.valorWei, decimals)).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${symbol}`
      : evento.cotas !== null
        ? `${formatUnits(evento.cotas, 18)} cotas`
        : null;

  return {
    id: `onchain-${evento.txHash}-${evento.tipo}`,
    timestamp: evento.timestamp ?? 0,
    origem: "onchain",
    tipo: t.tipos[evento.tipo],
    ator: evento.investidor ? `${evento.investidor.slice(0, 6)}…${evento.investidor.slice(-4)}` : null,
    valor,
    link: `https://sepolia.etherscan.io/tx/${evento.txHash}`,
  };
}

type NomeUnicoOuLista<T> = T | T[] | null;

function primeiro<T>(valor: NomeUnicoOuLista<T>): T | null {
  if (!valor) return null;
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

type InvestorRow = { id: string; full_name: string; created_at: string };
type IssuerRow = { id: string; legal_name: string; created_at: string };
type OfferingRow = {
  id: string;
  created_at: string;
  issuers: NomeUnicoOuLista<{ legal_name: string }>;
};
type InvestmentRow = {
  id: string;
  amount_cents: number;
  status: "reserved" | "paid" | "settled" | "refunded" | "cancelled";
  created_at: string;
  investors: NomeUnicoOuLista<{ full_name: string }>;
  offerings: NomeUnicoOuLista<{ issuers: NomeUnicoOuLista<{ legal_name: string }> }>;
};
type PaymentEventRow = {
  id: string;
  event_type: string;
  created_at: string;
  investments: NomeUnicoOuLista<{
    amount_cents: number;
    investors: NomeUnicoOuLista<{ full_name: string }>;
    offerings: NomeUnicoOuLista<{ issuers: NomeUnicoOuLista<{ legal_name: string }> }>;
  }>;
};

const STATUS_APORTE: Record<InvestmentRow["status"], string> = {
  reserved: "Reservado",
  paid: "Pago (simulado)",
  settled: "Liquidado",
  refunded: "Reembolsado",
  cancelled: "Cancelado",
};

const TIPO_EVENTO_PAGAMENTO: Record<string, string> = {
  escrow_intent: "Escrow iniciado",
  payment_confirmed: "Pagamento confirmado (simulado)",
  release: "Recursos liberados ao emissor",
  refund: "Reembolso",
  tokens_issued: "Tokens emitidos (simulado)",
};

async function listarCadastrosInvestidores(): Promise<Movimentacao[]> {
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

async function listarCadastrosEmissores(): Promise<Movimentacao[]> {
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

async function listarOfertasCriadas(): Promise<Movimentacao[]> {
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
    ator: primeiro(row.issuers)?.legal_name ?? "—",
    valor: null,
    link: null,
  }));
}

async function listarAportes(): Promise<InvestmentRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("investments")
    .select("id, amount_cents, status, created_at, investors(full_name), offerings(issuers(legal_name))")
    .order("created_at", { ascending: false })
    .returns<InvestmentRow[]>();
  return data ?? [];
}

function aporteParaMovimentacao(row: InvestmentRow): Movimentacao {
  const investidor = primeiro(row.investors)?.full_name ?? "—";
  const emissor = primeiro(primeiro(row.offerings)?.issuers ?? null)?.legal_name ?? "—";

  return {
    id: `investment-${row.id}`,
    timestamp: epoch(row.created_at),
    origem: "offchain",
    tipo: `Aporte — ${STATUS_APORTE[row.status]}`,
    ator: `${investidor} — ${emissor}`,
    valor: centavosParaBRL(row.amount_cents),
    link: null,
  };
}

async function listarEventosPagamento(): Promise<Movimentacao[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("payment_events")
    .select("id, event_type, created_at, investments(amount_cents, investors(full_name), offerings(issuers(legal_name)))")
    .order("created_at", { ascending: false })
    .returns<PaymentEventRow[]>();

  return (data ?? []).map((row) => {
    const investimento = primeiro(row.investments);
    const investidor = investimento ? primeiro(investimento.investors) : null;
    const oferta = investimento ? primeiro(investimento.offerings) : null;
    const emissor = oferta ? primeiro(oferta.issuers) : null;
    const ator = [investidor?.full_name, emissor?.legal_name].filter(Boolean).join(" — ") || null;

    return {
      id: `payment-event-${row.id}`,
      timestamp: epoch(row.created_at),
      origem: "offchain" as const,
      tipo: TIPO_EVENTO_PAGAMENTO[row.event_type] ?? row.event_type,
      ator,
      valor: investimento ? centavosParaBRL(investimento.amount_cents) : null,
      link: null,
    };
  });
}

function computeResumoMock(aportes: InvestmentRow[]): { totalCents: number; investidoresUnicos: number } {
  const contabilizados = aportes.filter((a) => a.status === "paid" || a.status === "settled");
  return {
    totalCents: contabilizados.reduce((total, a) => total + a.amount_cents, 0),
    investidoresUnicos: new Set(contabilizados.map((a) => primeiro(a.investors)?.full_name)).size,
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
export async function getMovimentacoesEResumo(): Promise<{ movimentacoes: Movimentacao[]; resumo: ResumoMovimentacoes }> {
  const [onChainResultado, aportesResultado, ...offchainResultados] = await Promise.allSettled([
    (async () => {
      const eventosOnChain = await getEventosOnChain();
      const resumoOnChain = await getResumoOnChain(eventosOnChain);
      return { eventosOnChain, resumoOnChain };
    })(),
    listarAportes(),
    listarCadastrosInvestidores(),
    listarCadastrosEmissores(),
    listarOfertasCriadas(),
    listarEventosPagamento(),
  ]);

  const movimentacoes: Movimentacao[] = [];
  let resumoOnChain: ResumoOnChain | null = null;

  if (onChainResultado.status === "fulfilled") {
    const { eventosOnChain, resumoOnChain: resumo } = onChainResultado.value;
    resumoOnChain = resumo;
    movimentacoes.push(...eventosOnChain.map((evento) => eventoOnChainParaMovimentacao(evento, resumo)));
  } else {
    console.error("[socios] falha ao ler eventos on-chain (as demais fontes seguem normalmente):", onChainResultado.reason);
  }

  let aportes: InvestmentRow[] = [];
  if (aportesResultado.status === "fulfilled") {
    aportes = aportesResultado.value;
    movimentacoes.push(...aportes.map(aporteParaMovimentacao));
  } else {
    console.error("[socios] falha ao ler aportes (as demais fontes seguem normalmente):", aportesResultado.reason);
  }

  for (const resultado of offchainResultados) {
    if (resultado.status === "fulfilled") {
      movimentacoes.push(...resultado.value);
    } else {
      console.error("[socios] falha ao ler uma fonte off-chain (as demais seguem normalmente):", resultado.reason);
    }
  }

  movimentacoes.sort((a, b) => b.timestamp - a.timestamp);

  const resumoMock = computeResumoMock(aportes);

  return {
    movimentacoes,
    resumo: {
      onChain: resumoOnChain,
      totalAportesMockCents: resumoMock.totalCents,
      investidoresUnicosMock: resumoMock.investidoresUnicos,
    },
  };
}

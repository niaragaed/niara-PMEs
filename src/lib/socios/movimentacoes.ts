import "server-only";

// A single timeline of "all the activity on the site" for the internal /socios dashboard — it
// combines real on-chain events (src/lib/web3/events.ts) with the off-chain activity in Supabase:
// investor sign-up, issuer sign-up, offering created, investment (investments, in any status —
// reserved/paid/settled/refunded/cancelled) and each event of the payment trail (payment_events:
// payment confirmed, tokens issued). Explicit request from the user: a single table, not split
// into sections — each row carries its own origin (real on-chain / demo off-chain) for anyone who
// wants to know where it came from, but there is only one list, sorted by date.
//
// Same GOLDEN RULE already used in investments.ts/mockTransacoes.ts: an explicit allowlist of
// columns, never select('*') — even though it's an internal dashboard, there's no reason to pull
// CPF/documents that don't show up on screen.
import { createAdminClient } from "@/lib/supabase/admin";
import { formatUnits } from "viem";
import { formatBRL } from "@/lib/format";
import { getEventsOnChain, getSummaryOnChain, type EventoOnChain, type OnChainSummary } from "@/lib/web3/events";
import { loadConfirmedOnChainOfferings } from "@/lib/web3/confirmedOfferings";
import { solanaExplorerAccountLink } from "@/lib/solana/config";
import { getDictionary } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export type TransactionOrigin = "onchain" | "offchain";

export type Transaction = {
  id: string;
  timestamp: number; // epoch seconds, to sort and format the same way on both sides
  origin: TransactionOrigin;
  type: string; // already translated, ready to display
  actor: string | null; // name (off-chain) or truncated address (on-chain)
  value: string | null; // already formatted (BRL or token), ready to display
  link: string | null; // external link (Sepolia Etherscan), when there is one
};

export type TransactionsSummary = {
  onChain: OnChainSummary | null;
  totalMockInvestmentsCents: number; // status paid/settled, same rule as the old computeResumoMock
  uniqueMockInvestors: number;
};

function epoch(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000);
}

function centsToBRL(cents: number): string {
  return formatBRL(cents / 100);
}

function onChainEventToTransaction(event: EventoOnChain, summary: OnChainSummary | null, dict: Dictionary): Transaction {
  const t = dict.partners.realTable;
  const decimals = summary?.mockBrlDecimals ?? 18;
  const symbol = summary?.mockBrlSymbol ?? "mBRL";

  const value =
    event.amountWei !== null
      ? `${Number(formatUnits(event.amountWei, decimals)).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${symbol}`
      : event.shares !== null
        ? dict.partners.activity.shares(formatUnits(event.shares, 18))
        : null;

  return {
    id: `onchain-${event.txHash}-${event.type}`,
    timestamp: event.timestamp ?? 0,
    origin: "onchain",
    type: t.types[event.type],
    actor: event.investor ? `${event.investor.slice(0, 6)}…${event.investor.slice(-4)}` : null,
    value,
    link: `https://sepolia.etherscan.io/tx/${event.txHash}`,
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

async function listInvestorRegistrations(dict: Dictionary): Promise<Transaction[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("investors")
    .select("id, full_name, created_at")
    .order("created_at", { ascending: false })
    .returns<InvestorRow[]>();

  return (data ?? []).map((row) => ({
    id: `investor-signup-${row.id}`,
    timestamp: epoch(row.created_at),
    origin: "offchain" as const,
    type: dict.partners.activity.investorSignup,
    actor: row.full_name,
    value: null,
    link: null,
  }));
}

async function listIssuerRegistrations(dict: Dictionary): Promise<Transaction[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("issuers")
    .select("id, legal_name, created_at")
    .order("created_at", { ascending: false })
    .returns<IssuerRow[]>();

  return (data ?? []).map((row) => ({
    id: `issuer-signup-${row.id}`,
    timestamp: epoch(row.created_at),
    origin: "offchain" as const,
    type: dict.partners.activity.issuerSignup,
    actor: row.legal_name,
    value: null,
    link: null,
  }));
}

async function listCreatedOfferings(dict: Dictionary): Promise<Transaction[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("offerings")
    .select("id, created_at, issuers(legal_name)")
    .order("created_at", { ascending: false })
    .returns<OfferingRow[]>();

  return (data ?? []).map((row) => ({
    id: `offering-created-${row.id}`,
    timestamp: epoch(row.created_at),
    origin: "offchain" as const,
    type: dict.partners.activity.offeringCreated,
    actor: first(row.issuers)?.legal_name ?? "—",
    value: null,
    link: null,
  }));
}

const deadlineFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

// cents -> mBRL (a number, without a real currency symbol) — the same conversion as
// verificarConsistencia() (UNIDADE_ON_CHAIN, src/lib/web3/gates.ts: "1 MockBRL unit = 1 real
// equivalent"), but labeled mBRL here, never R$: the same principle already applied in
// SelfServicePmesCard.tsx — this is MockBRL with no backing, and the other rows of this SAME
// table (real on-chain investments/events, see onChainEventToTransaction above) already use mBRL
// for the "Amount" of on-chain events, so using R$ here would clash within the column itself.
function formatMbrl(cents: number): string {
  return `${(cents / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mBRL`;
}

/**
 * Self-service offerings (published by the issuer itself via OfertaOrquestrador, see CLAUDE.md
 * "/empresa/ofertas screen" → Phase 3) already confirmed on-chain — they show up in the timeline
 * as soon as `sync_status` reaches 'confirmada', reusing loadConfirmedOnChainOfferings() (the same
 * read already used by /investir/onchain and by the /negociar/token-pmes showcase). Display
 * only — no action here; `origin: "onchain"` because the referent (the offering/contract) is real
 * on Sepolia, even though the read itself comes from Supabase (a mirror already checked against
 * the chain at publication time and on each reconciliation, not a made-up value).
 */
async function listConfirmedSelfServiceOfferings(dict: Dictionary): Promise<Transaction[]> {
  const offerings = await loadConfirmedOnChainOfferings();
  const t = dict.partners.activity;

  return offerings.map((offering) => ({
    id: `self-service-offering-${offering.id}`,
    timestamp: offering.onchainConfirmedAt ? epoch(offering.onchainConfirmedAt) : 0,
    origin: "onchain" as const,
    type: offering.rede === "sepolia" ? t.selfServiceConfirmed : t.selfServiceConfirmedSolana,
    actor: offering.issuerTradeName ?? offering.issuerLegalName,
    value: t.selfServiceTerms(
      `${formatMbrl(offering.targetMinCents)}–${formatMbrl(offering.hardCapCents)}`,
      offering.sharePriceCents === null ? "—" : formatMbrl(offering.sharePriceCents),
      deadlineFormatter.format(new Date(offering.closesAt)),
    ),
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

function investmentToTransaction(row: InvestmentRow, dict: Dictionary): Transaction {
  const investor = first(row.investors)?.full_name ?? "—";
  const issuer = first(first(row.offerings)?.issuers ?? null)?.legal_name ?? "—";

  return {
    id: `investment-${row.id}`,
    timestamp: epoch(row.created_at),
    origin: "offchain",
    type: dict.partners.activity.investment(dict.partners.mockTable.status[row.status]),
    actor: `${investor} — ${issuer}`,
    value: centsToBRL(row.amount_cents),
    link: null,
  };
}

async function listPaymentEvents(dict: Dictionary): Promise<Transaction[]> {
  const paymentEventTypes: Record<string, string> = dict.partners.activity.paymentEvents;
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
      origin: "offchain" as const,
      type: paymentEventTypes[row.event_type] ?? row.event_type,
      actor,
      value: investment ? centsToBRL(investment.amount_cents) : null,
      link: null,
    };
  });
}

function computeMockSummary(investments: InvestmentRow[]): { totalCents: number; uniqueInvestors: number } {
  const counted = investments.filter((a) => a.status === "paid" || a.status === "settled");
  return {
    totalCents: counted.reduce((total, a) => total + a.amount_cents, 0),
    uniqueInvestors: new Set(counted.map((a) => first(a.investors)?.full_name)).size,
  };
}

/**
 * A single timeline with ALL the activity on the site — on-chain (real Sepolia) and off-chain
 * (Supabase: sign-ups, offerings created, investments in any status, payment trail) — most recent
 * first, plus an aggregate summary (the same numbers the KPIs already showed before, now computed
 * together so the read isn't duplicated). Each source is fetched in parallel; an isolated failure
 * (e.g. the on-chain RPC is down) doesn't take down the others — the function never throws, it
 * only logs and carries on without that source.
 */
export async function getTransactionsAndSummary(): Promise<{ transactions: Transaction[]; summary: TransactionsSummary }> {
  const dict = await getDictionary();
  const [onChainResult, investmentsResult, ...offchainResults] = await Promise.allSettled([
    (async () => {
      const onChainEvents = await getEventsOnChain();
      const onChainSummary = await getSummaryOnChain(onChainEvents);
      return { onChainEvents, resumoOnChain: onChainSummary };
    })(),
    listInvestments(),
    listInvestorRegistrations(dict),
    listIssuerRegistrations(dict),
    listCreatedOfferings(dict),
    listPaymentEvents(dict),
    listConfirmedSelfServiceOfferings(dict),
  ]);

  const transactions: Transaction[] = [];
  let onChainSummary: OnChainSummary | null = null;

  if (onChainResult.status === "fulfilled") {
    const { onChainEvents, resumoOnChain: summary } = onChainResult.value;
    onChainSummary = summary;
    transactions.push(...onChainEvents.map((event) => onChainEventToTransaction(event, summary, dict)));
  } else {
    console.error("[socios] failed to read on-chain events (the other sources carry on normally):", onChainResult.reason);
  }

  let investments: InvestmentRow[] = [];
  if (investmentsResult.status === "fulfilled") {
    investments = investmentsResult.value;
    transactions.push(...investments.map((row) => investmentToTransaction(row, dict)));
  } else {
    console.error("[socios] failed to read investments (the other sources carry on normally):", investmentsResult.reason);
  }

  for (const result of offchainResults) {
    if (result.status === "fulfilled") {
      transactions.push(...result.value);
    } else {
      console.error("[socios] failed to read an off-chain source (the others carry on normally):", result.reason);
    }
  }

  transactions.sort((a, b) => b.timestamp - a.timestamp);

  const mockSummary = computeMockSummary(investments);

  return {
    transactions,
    summary: {
      onChain: onChainSummary,
      totalMockInvestmentsCents: mockSummary.totalCents,
      uniqueMockInvestors: mockSummary.uniqueInvestors,
    },
  };
}

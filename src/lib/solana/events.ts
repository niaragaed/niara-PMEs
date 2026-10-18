import "server-only";

// History of the niara-pmes-solana program (devnet), read ON THE SERVER for the /socios panel —
// the Solana counterpart of src/lib/web3/events.ts (getLogs on Sepolia).
//
// Source: the program's own transactions (getSignaturesForAddress on the program ID). From each one:
//   - the Anchor events emitted by OUR program (programData: only "Program data:" lines with our
//     program at the top of the invoke stack — another program can't forge one of our events);
//   - the faucet_mbrl instruction, which emits no event (it's just a test mint), read from the
//     instruction itself, decoded with the IDL.
// A failed transaction is skipped: nothing in it happened on the network.
//
// A confirmed transaction never changes, so whatever was already decoded stays in an in-memory
// cache of the process (by signature); each read only sends the new signatures to the RPC. On a
// cold server the cache starts empty and everything is read again — correct, just slower.
import { PublicKey, type Connection, type VersionedTransactionResponse } from "@solana/web3.js";
import { listSolanaOfferings, smesProgram, solanaConnection } from "./program";
import { SMES_SOLANA_PROGRAM_ID } from "./config";
import { programData } from "./server";

export type SolanaEventType =
  | "OfertaCriada"
  | "Aporte"
  | "OfertaEncerrada"
  | "OfertaCancelada"
  | "CotasResgatadas"
  | "RecursosLiberados"
  | "Reembolso"
  | "OfertaPausadaAlterada"
  | "EmissorDefinido"
  | "QualificacaoAlterada"
  | "FaucetMbrl";

export type SolanaEvent = {
  signature: string;
  /** Position of the event inside the transaction (one tx can emit more than one). */
  index: number;
  slot: number;
  timestamp: number | null;
  type: SolanaEventType;
  offering: string | null;
  /** Wallet that acted: investor, issuer, authorized/qualified wallet or whoever used the faucet. */
  wallet: string | null;
  /** Amount in units of the SPL MockBRL (6 decimals), when the event has one. */
  amount: bigint | null;
  /** Platform fee (RecursosLiberados), in units of the SPL MockBRL. */
  fee: bigint | null;
  shares: bigint | null;
  /** The event's own detail: close succeeded, paused, authorized, qualified. */
  flag: boolean | null;
  /** OfertaCriada only: company name recorded on-chain. */
  company: string | null;
};

export type SolanaSummary = {
  offerings: number;
  openOfferings: number;
  totalInvested: bigint;
  totalRefunded: bigint;
  uniqueWallets: number;
  feesCollected: bigint;
};

const MAX_SIGNATURES = 5_000;
const TX_BATCH = 8;

const txCache = new Map<string, SolanaEvent[]>();

const big = (v: unknown) => BigInt(String(v));
const key = (v: unknown) => (v instanceof PublicKey ? v.toBase58() : v ? String(v) : null);

type Decoded<T> = { name: string; data: T } | null;

// Anchor's generic InstructionCoder type doesn't declare decode; the concrete (Borsh) coder has it.
function decodeInstruction(coder: unknown, data: Uint8Array): Decoded<object> {
  try {
    return (coder as { decode(ix: Buffer): Decoded<object> }).decode(Buffer.from(data));
  } catch {
    return null;
  }
}

function decodeEvent(coder: unknown, base64: string): Decoded<Record<string, unknown>> {
  try {
    return (coder as { decode(data: string): Decoded<Record<string, unknown>> }).decode(base64);
  } catch {
    return null;
  }
}

function decode(tx: VersionedTransactionResponse, signature: string): SolanaEvent[] {
  if (tx.meta?.err) return [];
  const coder = smesProgram(solanaConnection()).coder;
  const base = { signature, slot: tx.slot, timestamp: tx.blockTime ?? null };
  const empty = { offering: null, wallet: null, amount: null, fee: null, shares: null, flag: null, company: null };
  const events: SolanaEvent[] = [];

  // faucet_mbrl: a top-level instruction of our program (the site and the admin script call it directly).
  const message = tx.transaction.message;
  const keys = message.staticAccountKeys;
  for (const ix of message.compiledInstructions) {
    if (!keys[ix.programIdIndex]?.equals(SMES_SOLANA_PROGRAM_ID)) continue;
    const decoded = decodeInstruction(coder.instruction, ix.data);
    if (!decoded || (decoded.name !== "faucetMbrl" && decoded.name !== "faucet_mbrl")) continue;
    events.push({
      ...base,
      ...empty,
      index: events.length,
      type: "FaucetMbrl",
      wallet: keys[ix.accountKeyIndexes[0]]?.toBase58() ?? null,
      amount: big((decoded.data as { valor: unknown }).valor),
    });
  }

  for (const base64 of programData(tx.meta?.logMessages ?? [])) {
    const ev = decodeEvent(coder.events, base64);
    if (!ev) continue;
    const d = ev.data;
    const common = { ...base, ...empty, index: events.length, offering: key(d.oferta) };
    switch (ev.name) {
      case "ofertaCriada":
        events.push({ ...common, type: "OfertaCriada", wallet: key(d.emissor), amount: big(d.metaMaxima), company: String(d.empresa) });
        break;
      case "aporte":
        events.push({ ...common, type: "Aporte", wallet: key(d.investidor), amount: big(d.valor) });
        break;
      case "ofertaEncerrada":
        events.push({ ...common, type: "OfertaEncerrada", amount: big(d.totalArrecadado), flag: Boolean(d.sucesso) });
        break;
      case "ofertaCancelada":
        events.push({ ...common, type: "OfertaCancelada" });
        break;
      case "cotasResgatadas":
        events.push({ ...common, type: "CotasResgatadas", wallet: key(d.investidor), shares: big(d.cotas) });
        break;
      case "recursosLiberados":
        events.push({ ...common, type: "RecursosLiberados", wallet: key(d.emissor), amount: big(d.valorEmissor), fee: big(d.taxa) });
        break;
      case "reembolso":
        events.push({ ...common, type: "Reembolso", wallet: key(d.investidor), amount: big(d.valor) });
        break;
      case "ofertaPausadaAlterada":
        events.push({ ...common, type: "OfertaPausadaAlterada", flag: Boolean(d.pausada) });
        break;
      case "emissorDefinido":
        events.push({ ...common, offering: null, type: "EmissorDefinido", wallet: key(d.wallet), flag: Boolean(d.autorizado) });
        break;
      case "qualificacaoAlterada":
        events.push({ ...common, offering: null, type: "QualificacaoAlterada", wallet: key(d.wallet), flag: Boolean(d.qualificado) });
        break;
    }
  }
  return events;
}

async function readTransactions(connection: Connection, signatures: string[]): Promise<void> {
  for (let i = 0; i < signatures.length; i += TX_BATCH) {
    const batch = signatures.slice(i, i + TX_BATCH);
    const txs = await Promise.all(
      batch.map((s) => connection.getTransaction(s, { commitment: "confirmed", maxSupportedTransactionVersion: 0 })),
    );
    txs.forEach((tx, j) => {
      // null = the node doesn't have the transaction yet (it just landed). Not cached: the next read
      // tries again, instead of hiding the transaction forever.
      if (tx) txCache.set(batch[j], decode(tx, batch[j]));
    });
  }
}

/**
 * Every event of the program, newest first, plus the company name of each offering (read from the
 * offering account, or from OfertaCriada when the account no longer exists). Throws if the RPC
 * fails — the caller decides (the /socios panel carries on without this source).
 */
export async function readSolanaEvents(): Promise<{
  events: SolanaEvent[];
  companies: Map<string, string>;
  summary: SolanaSummary;
}> {
  const connection = solanaConnection();

  const signatures: string[] = [];
  let before: string | undefined;
  while (signatures.length < MAX_SIGNATURES) {
    const page = await connection.getSignaturesForAddress(SMES_SOLANA_PROGRAM_ID, { before, limit: 1000 }, "confirmed");
    for (const s of page) if (!s.err) signatures.push(s.signature);
    if (page.length < 1000) break;
    before = page[page.length - 1].signature;
  }

  const [offerings] = await Promise.all([
    listSolanaOfferings(connection),
    readTransactions(
      connection,
      signatures.filter((s) => !txCache.has(s)),
    ),
  ]);

  const events = signatures
    .flatMap((s) => txCache.get(s) ?? [])
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0) || b.slot - a.slot || b.index - a.index);

  const companies = new Map<string, string>();
  for (const e of events) if (e.type === "OfertaCriada" && e.offering && e.company) companies.set(e.offering, e.company);
  for (const o of offerings) companies.set(o.address, o.company);

  const sum = (type: SolanaEventType, field: "amount" | "fee") =>
    events.filter((e) => e.type === type).reduce((t, e) => t + (e[field] ?? BigInt(0)), BigInt(0));

  return {
    events,
    companies,
    summary: {
      offerings: offerings.length,
      openOfferings: offerings.filter((o) => o.state === "Aberta").length,
      totalInvested: sum("Aporte", "amount"),
      totalRefunded: sum("Reembolso", "amount"),
      uniqueWallets: new Set(events.filter((e) => e.type === "Aporte").map((e) => e.wallet)).size,
      feesCollected: sum("RecursosLiberados", "fee"),
    },
  };
}

import "server-only";

// Solana reads done ON THE SERVER to check a self-service publication — the equivalent of the
// on-chain part of src/app/empresa/ofertas/onchain-actions.ts (Sepolia).
//
// Same golden rule as the EVM side: nothing here trusts what the client says. The publication's
// authenticity comes from two independent reads of the network itself:
//   1. the `OfertaCriada` event in the transaction logs, accepted ONLY when whatever was executing
//      at the moment of the "Program data:" was the niara-pmes-solana program (invoke stack) —
//      another program can't forge an event citing our address;
//   2. the offering account, read straight from the network, with owner = the program (the Solana
//      runtime only lets the program itself create and write the accounts it owns).
import { PublicKey } from "@solana/web3.js";
import { solanaConnection, normalizeOffering, smesProgram, type SolanaOffering } from "./program";
import { SMES_SOLANA_PROGRAM_ID } from "./config";
import { describeSolanaError, type SolanaErrorMessages } from "./errors";

export type OfferingCreatedEvent = {
  oferta: string;
  emissor: string;
  mintCota: string;
  empresa: string;
  cnpjRefHex: string;
  serie: string;
  metaMinima: bigint;
  metaMaxima: bigint;
  precoPorCota: bigint;
  prazo: number;
  taxaBps: number;
};

export type PublicationTxRead =
  | { status: "not-found"; alreadyExpired: boolean }
  | { status: "failed"; reason: string }
  | { status: "ok"; events: OfferingCreatedEvent[]; blockTime: number | null };

/** "Program data:" lines emitted by OUR program (the top of the invoke stack at the time of the log). */
export function programData(logs: string[]): string[] {
  const id = SMES_SOLANA_PROGRAM_ID.toBase58();
  const stack: string[] = [];
  const data: string[] = [];
  for (const line of logs) {
    const invoke = /^Program (\S+) invoke \[\d+\]$/.exec(line);
    if (invoke) {
      stack.push(invoke[1]);
      continue;
    }
    // Anchored on a base58 address: "Program log: success…" must not pop the stack.
    if (/^Program [1-9A-HJ-NP-Za-km-z]{32,44} (success|failed)/.test(line)) {
      stack.pop();
      continue;
    }
    if (line.startsWith("Program data: ") && stack[stack.length - 1] === id) {
      data.push(line.slice("Program data: ".length).trim());
    }
  }
  return data;
}

const big = (v: { toString(): string }) => BigInt(v.toString());

export async function readPublicationTx(signature: string, messages: SolanaErrorMessages): Promise<PublicationTxRead> {
  const connection = solanaConnection();
  const tx = await connection.getTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });

  if (!tx) {
    // Tells "hasn't arrived yet" apart from "will never arrive": with no status at all AND the
    // transaction's blockhash already expired, it won't land on the network anymore. What to do
    // with that is up to the caller (see confirmPublicationSolana).
    const status = await connection.getSignatureStatus(signature, { searchTransactionHistory: true });
    return { status: "not-found", alreadyExpired: status.value === null };
  }

  const logs = tx.meta?.logMessages ?? [];
  if (tx.meta?.err) {
    return { status: "failed", reason: describeSolanaError({ logs, err: tx.meta.err }, messages) };
  }

  const coder = smesProgram(connection).coder;
  const events: OfferingCreatedEvent[] = [];
  for (const base64 of programData(logs)) {
    const decoded = coder.events.decode(base64);
    if (!decoded || decoded.name !== "ofertaCriada") continue;
    const d = decoded.data as Record<string, unknown> & {
      oferta: PublicKey;
      emissor: PublicKey;
      mintCota: PublicKey;
      cnpjRef: number[];
    };
    events.push({
      oferta: d.oferta.toBase58(),
      emissor: d.emissor.toBase58(),
      mintCota: d.mintCota.toBase58(),
      empresa: String(d.empresa),
      cnpjRefHex: `0x${d.cnpjRef.map((b) => b.toString(16).padStart(2, "0")).join("")}`,
      serie: String(d.serie),
      metaMinima: big(d.metaMinima as { toString(): string }),
      metaMaxima: big(d.metaMaxima as { toString(): string }),
      precoPorCota: big(d.precoPorCota as { toString(): string }),
      prazo: Number((d.prazo as { toString(): string }).toString()),
      taxaBps: Number(d.taxaBps),
    });
  }
  return { status: "ok", events, blockTime: tx.blockTime ?? null };
}

/** The network's current block height — compared with an attempt's lastValidBlockHeight. */
export async function currentBlockHeight(): Promise<number> {
  return solanaConnection().getBlockHeight("confirmed");
}

/** The offering account read from the network, only if its owner is the niara-pmes-solana program. */
export async function readVerifiedOfferingAccount(address: string): Promise<SolanaOffering | null> {
  const connection = solanaConnection();
  const key = new PublicKey(address);
  const info = await connection.getAccountInfo(key, "confirmed");
  if (!info || !info.owner.equals(SMES_SOLANA_PROGRAM_ID)) return null;
  const account = smesProgram(connection).coder.accounts.decode("oferta", info.data);
  return normalizeOffering(key, account);
}

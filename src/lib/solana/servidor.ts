import "server-only";

// Leituras da Solana feitas NO SERVIDOR para conferir uma publicação self-service — equivalente da
// parte on-chain de src/app/empresa/ofertas/onchain-actions.ts (Sepolia).
//
// Mesma regra de ouro do lado EVM: nada aqui confia no que o cliente diz. A autenticidade da
// publicação sai de duas leituras independentes da própria rede:
//   1. o evento `OfertaCriada` nos logs da transação, aceito SÓ quando quem estava executando no
//      momento do "Program data:" era o programa niara-pmes-solana (pilha de invoke) — outro
//      programa não consegue forjar um evento citando o nosso endereço;
//   2. a conta da oferta, lida direto da rede, com dono = o programa (o runtime da Solana só deixa o
//      próprio programa criar e escrever contas que ele possui).
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

/** "Program data:" emitidos pelo NOSSO programa (topo da pilha de invoke no momento do log). */
function programData(logs: string[]): string[] {
  const id = SMES_SOLANA_PROGRAM_ID.toBase58();
  const stack: string[] = [];
  const data: string[] = [];
  for (const line of logs) {
    const invoke = /^Program (\S+) invoke \[\d+\]$/.exec(line);
    if (invoke) {
      stack.push(invoke[1]);
      continue;
    }
    // Ancorado num endereço base58: "Program log: success…" não pode desempilhar.
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
    // Distingue "ainda não chegou" de "nunca vai chegar": sem status nenhum E com o blockhash da
    // transação já vencido, ela não entra mais na rede. Quem decide o que fazer com isso é o
    // chamador (ver confirmarPublicacaoSolana).
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

/** Altura de bloco atual da rede — compara com o lastValidBlockHeight de uma tentativa. */
export async function currentBlockHeight(): Promise<number> {
  return solanaConnection().getBlockHeight("confirmed");
}

/** Conta da oferta lida da rede, só se o dono for o programa niara-pmes-solana. */
export async function readVerifiedOfferingAccount(address: string): Promise<SolanaOffering | null> {
  const connection = solanaConnection();
  const key = new PublicKey(address);
  const info = await connection.getAccountInfo(key, "confirmed");
  if (!info || !info.owner.equals(SMES_SOLANA_PROGRAM_ID)) return null;
  const account = smesProgram(connection).coder.accounts.decode("oferta", info.data);
  return normalizeOffering(key, account);
}

"use client";

// Carteira Solana (Phantom, ou outra que injete a mesma interface em `window.phantom.solana` /
// `window.solana`) — sem @solana/wallet-adapter de propósito: o site só precisa de conectar,
// assinar transação e assinar mensagem (vínculo de carteira), e a interface injetada já cobre isso.
//
// A carteira SÓ ASSINA. O envio vai pelo RPC configurado em config.ts (devnet), nunca pelo RPC da
// carteira — assim a rede é sempre a do programa, independente da rede selecionada na Phantom.
import { useSyncExternalStore } from "react";
import { utils } from "@anchor-lang/core";
import { PublicKey, type Connection, type Transaction } from "@solana/web3.js";
import { SolanaClientError } from "./errors";

type PhantomEvent = "connect" | "disconnect" | "accountChanged";

export type ProviderPhantom = {
  isPhantom?: boolean;
  publicKey: PublicKey | null;
  isConnected?: boolean;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  signMessage?: (message: Uint8Array, encoding?: "utf8") => Promise<{ signature: Uint8Array; publicKey: PublicKey }>;
  on?: (event: PhantomEvent, cb: (arg?: unknown) => void) => void;
  removeListener?: (event: PhantomEvent, cb: (arg?: unknown) => void) => void;
};

declare global {
  interface Window {
    phantom?: { solana?: ProviderPhantom };
    solana?: ProviderPhantom;
  }
}

export function providerPhantom(): ProviderPhantom | null {
  if (typeof window === "undefined") return null;
  return window.phantom?.solana ?? window.solana ?? null;
}

// ── estado da conexão (store externo, lido com useSyncExternalStore) ─────────────────────────────

type WalletState = { available: boolean; address: string | null; started: boolean };

const SERVER: WalletState = { available: false, address: null, started: false };
let state: WalletState = SERVER;
const listeners = new Set<() => void>();
let started = false;

function set(patch: Partial<WalletState>) {
  state = { ...state, ...patch };
  listeners.forEach((cb) => cb());
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  const p = providerPhantom();
  state = { available: Boolean(p), address: p?.publicKey?.toBase58() ?? null, started: true };
  if (!p) return;
  p.on?.("connect", () => set({ address: p.publicKey?.toBase58() ?? null }));
  p.on?.("disconnect", () => set({ address: null }));
  p.on?.("accountChanged", (newKey) => {
    const key = newKey as PublicKey | null | undefined;
    set({ address: key ? key.toBase58() : null });
  });
  // Reconexão silenciosa: só funciona se o usuário já tiver autorizado este site antes — nunca abre
  // pop-up sozinho.
  p.connect({ onlyIfTrusted: true }).then(
    (r) => set({ address: r.publicKey.toBase58() }),
    () => undefined,
  );
}

function sign(cb: () => void) {
  start();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useSolanaWallet() {
  const current = useSyncExternalStore(
    sign,
    () => {
      start();
      return state;
    },
    () => SERVER,
  );

  async function connect(): Promise<string> {
    const p = providerPhantom();
    if (!p) throw new SolanaClientError("no-wallet");
    const r = await p.connect();
    const address = r.publicKey.toBase58();
    set({ address });
    return address;
  }

  async function disconnect() {
    await providerPhantom()?.disconnect();
    set({ address: null });
  }

  return { ...current, connect, disconnect };
}

// ── envio de transação ──────────────────────────────────────────────────────────────────────────

export type SignedTransaction = {
  signed: Transaction;
  /** Assinatura do pagador em base58 — o identificador da transação na Solana, já conhecido antes do envio. */
  signature: string;
  blockhash: string;
  lastValidBlockHeight: number;
};

/**
 * Simula (sem pedir assinatura) e pede a assinatura da carteira. NÃO envia. A simulação antes da
 * assinatura é o equivalente do `simulateContract` da Sepolia: uma regra do programa que
 * reprovaria a transação (meta máxima, teto, prazo…) aparece como mensagem legível ANTES da
 * carteira abrir, nunca como uma transação falha paga pelo usuário.
 */
export async function simulateAndSign(connection: Connection, tx: Transaction): Promise<SignedTransaction> {
  const p = providerPhantom();
  if (!p?.publicKey) throw new SolanaClientError("not-connected");
  try {
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    // Normaliza a chave para a classe PublicKey DESTE bundle — a da carteira pode ser de outra
    // versão do @solana/web3.js, e a montagem da mensagem compara por classe.
    tx.feePayer = new PublicKey(p.publicKey.toBase58());
    tx.recentBlockhash = blockhash;

    const simulation = await connection.simulateTransaction(tx);
    if (simulation.value.err) {
      throw Object.assign(new Error("simulation failed"), { logs: simulation.value.logs ?? [], err: simulation.value.err });
    }

    const signed = await p.signTransaction(tx);
    const sig = signed.signature;
    if (!sig) throw new SolanaClientError("no-signature");
    return { signed, signature: utils.bytes.bs58.encode(sig), blockhash, lastValidBlockHeight };
  } catch (error) {
    // Rethrown untouched: the caller translates it with describeSolanaError(error, messages), in
    // the visitor's language (this module has no access to the dictionary).
    throw error;
  }
}

/** Envia pelo RPC da devnet e espera a confirmação ("confirmed"). Lança com mensagem traduzida. */
export async function sendAndConfirm(connection: Connection, t: SignedTransaction): Promise<string> {
  try {
    await connection.sendRawTransaction(t.signed.serialize(), { preflightCommitment: "confirmed" });
    const result = await connection.confirmTransaction(
      { signature: t.signature, blockhash: t.blockhash, lastValidBlockHeight: t.lastValidBlockHeight },
      "confirmed",
    );
    if (result.value.err) {
      const detail = await connection.getTransaction(t.signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
      throw Object.assign(new Error("transaction failed"), { logs: detail?.meta?.logMessages ?? [], err: result.value.err });
    }
    return t.signature;
  } catch (error) {
    // Rethrown untouched: the caller translates it with describeSolanaError(error, messages), in
    // the visitor's language (this module has no access to the dictionary).
    throw error;
  }
}

/** Simula, assina, envia e confirma. `aoAssinar` é chamado assim que a carteira devolve a assinatura. */
export async function signAndSend(
  connection: Connection,
  tx: Transaction,
  onSign?: (signature: string) => void,
): Promise<string> {
  const signed = await simulateAndSign(connection, tx);
  onSign?.(signed.signature);
  return sendAndConfirm(connection, signed);
}

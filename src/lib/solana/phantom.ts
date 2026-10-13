"use client";

// Solana wallet (Phantom, or another one that injects the same interface at `window.phantom.solana` /
// `window.solana`) — without @solana/wallet-adapter on purpose: the site only needs to connect,
// sign a transaction and sign a message (wallet link), and the injected interface already covers that.
//
// The wallet ONLY SIGNS. Sending goes through the RPC configured in config.ts (devnet), never the
// wallet's RPC — so the network is always the program's, regardless of the network selected in Phantom.
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

// ── connection state (external store, read with useSyncExternalStore) ──────────────────────────────

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
  // Silent reconnection: only works if the user has already authorized this site before — it never
  // opens a pop-up on its own.
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

// ── sending a transaction ───────────────────────────────────────────────────────────────────────

export type SignedTransaction = {
  signed: Transaction;
  /** The payer's signature in base58 — the transaction's identifier on Solana, already known before sending. */
  signature: string;
  blockhash: string;
  lastValidBlockHeight: number;
};

/**
 * Simulates (without asking for a signature) and asks the wallet for the signature. Does NOT send.
 * Simulating before signing is the equivalent of Sepolia's `simulateContract`: a program rule that
 * would reject the transaction (maximum target, cap, deadline…) shows up as a readable message
 * BEFORE the wallet opens, never as a failed transaction paid for by the user.
 */
export async function simulateAndSign(connection: Connection, tx: Transaction): Promise<SignedTransaction> {
  const p = providerPhantom();
  if (!p?.publicKey) throw new SolanaClientError("not-connected");
  try {
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    // Normalizes the key to THIS bundle's PublicKey class — the wallet's may come from another
    // version of @solana/web3.js, and building the message compares by class.
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

/** Sends through the devnet RPC and waits for confirmation ("confirmed"). Throws the raw error for the caller to translate. */
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

/** Simulates, signs, sends and confirms. `onSign` is called as soon as the wallet returns the signature. */
export async function signAndSend(
  connection: Connection,
  tx: Transaction,
  onSign?: (signature: string) => void,
): Promise<string> {
  const signed = await simulateAndSign(connection, tx);
  onSign?.(signed.signature);
  return sendAndConfirm(connection, signed);
}

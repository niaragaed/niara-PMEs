// Niara-PMEs's public configuration on Solana (the `niara-pmes-solana` program, devnet).
//
// Everything here is public information — a program address is like a contract address: anyone
// can check it on the explorer. It can be overridden by env var only to point at a local validator
// in development; in production the defaults below are the real devnet values.
//
// Units (unlike Sepolia, see src/lib/web3/gates.ts):
//   - MockBRL on Solana is a 6-decimal SPL mint (the SPL stablecoin standard). 1 mBRL = 1_000_000.
//   - R$ cents (offerings.*_cents) → on-chain unit: cents × 10^4.
//   - Shares have 0 decimals: 1 token unit = 1 share.
import { PublicKey } from "@solana/web3.js";

export const NETWORK_SOLANA = "solana-devnet" as const;

export const SMES_SOLANA_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PMES_SOLANA_PROGRAM_ID ?? "FKefGFhUmgXBM1xCtSFBWpoNnp3wuPJs6Yddpsp67J2y",
);

export const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

/** Cluster used in the explorer links. "custom" only when pointing at a local validator. */
const CLUSTER_EXPLORER = process.env.NEXT_PUBLIC_SOLANA_EXPLORER_CLUSTER ?? "devnet";

export const DECIMALS_MBRL_SOLANA = 6;
// BigInt(...) instead of the `10n` literal: the project compiles to ES2017 (same convention as
// src/lib/money.ts and src/lib/web3/gates.ts).
export const UNIT_MBRL_SOLANA = BigInt(1_000_000);
/** R$ cents → on-chain unit of the SPL MockBRL (6 decimals). Single source, client and server. */
export const UNIT_ON_CHAIN_SOLANA = BigInt(10_000);

/** Mesmos limites de bytes do programa (constants.rs). */
export const MAX_NAME_SOLANA = 64;
export const MAX_SYMBOL_SOLANA = 10;
export const MAX_COMPANY_SOLANA = 64;
export const MAX_SERIES_SOLANA = 16;

/** The program's faucet: at most 1,000,000 mBRL per call (constants.rs). */
export const FAUCET_MAX_MBRL_SOLANA = 1_000_000;

/** Base58 of a public key (32 bytes) and of a transaction signature (64 bytes). */
export const BASE58_PUBKEY = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const BASE58_SIGNATURE = /^[1-9A-HJ-NP-Za-km-z]{64,90}$/;

function clusterSuffix(): string {
  if (CLUSTER_EXPLORER === "mainnet-beta") return "";
  if (CLUSTER_EXPLORER === "custom") return `?cluster=custom&customUrl=${encodeURIComponent(SOLANA_RPC_URL)}`;
  return `?cluster=${CLUSTER_EXPLORER}`;
}

export function linkExplorerSolanaTx(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}${clusterSuffix()}`;
}

export function solanaExplorerAccountLink(address: string): string {
  return `https://explorer.solana.com/address/${address}${clusterSuffix()}`;
}

/** Validates without throwing — useful in Server Actions and loaders. */
export function ehPubkeySolana(value: string): boolean {
  if (!BASE58_PUBKEY.test(value)) return false;
  try {
    // PDAs (offering, shares mint) are off the curve and are valid — only the format matters here.
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

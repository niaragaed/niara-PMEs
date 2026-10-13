// Configuração pública do Niara-PMEs na Solana (programa `niara-pmes-solana`, devnet).
//
// Tudo aqui é informação pública — endereço de programa é como endereço de contrato: qualquer um
// confere no explorador. Pode ser sobrescrito por env var só para apontar para um validador local
// em desenvolvimento; em produção os padrões abaixo são os valores reais da devnet.
//
// Unidades (diferente da Sepolia, ver src/lib/web3/gates.ts):
//   - MockBRL na Solana é um mint SPL de 6 casas (padrão de stablecoin SPL). 1 mBRL = 1_000_000.
//   - Centavos de R$ (offerings.*_cents) → unidade on-chain: centavos × 10^4.
//   - Cotas têm 0 casas: 1 unidade do token = 1 cota.
import { PublicKey } from "@solana/web3.js";

export const NETWORK_SOLANA = "solana-devnet" as const;

export const SMES_SOLANA_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PMES_SOLANA_PROGRAM_ID ?? "FKefGFhUmgXBM1xCtSFBWpoNnp3wuPJs6Yddpsp67J2y",
);

export const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

/** Cluster usado nos links do explorador. "custom" só quando apontando para validador local. */
const CLUSTER_EXPLORER = process.env.NEXT_PUBLIC_SOLANA_EXPLORER_CLUSTER ?? "devnet";

export const DECIMALS_MBRL_SOLANA = 6;
// BigInt(...) em vez de literal `10n`: o projeto compila para ES2017 (mesma convenção de
// src/lib/money.ts e src/lib/web3/gates.ts).
export const UNIT_MBRL_SOLANA = BigInt(1_000_000);
/** Centavos de R$ → unidade on-chain do MockBRL SPL (6 casas). Fonte única, cliente e servidor. */
export const UNIT_ON_CHAIN_SOLANA = BigInt(10_000);

/** Mesmos limites de bytes do programa (constants.rs). */
export const MAX_NAME_SOLANA = 64;
export const MAX_SYMBOL_SOLANA = 10;
export const MAX_COMPANY_SOLANA = 64;
export const MAX_SERIES_SOLANA = 16;

/** Faucet do programa: no máximo 1.000.000 mBRL por chamada (constants.rs). */
export const FAUCET_MAX_MBRL_SOLANA = 1_000_000;

/** Base58 de uma chave pública (32 bytes) e de uma assinatura de transação (64 bytes). */
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

/** Valida sem lançar — útil em Server Actions e loaders. */
export function ehPubkeySolana(value: string): boolean {
  if (!BASE58_PUBKEY.test(value)) return false;
  try {
    // PDAs (oferta, mint de cotas) ficam fora da curva e são válidas — só o formato importa aqui.
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

// PURE evaluation of the on-chain publication gates (Phase 3, see
// PLANO_FASE_3_PUBLICACAO_ONCHAIN.md) — no React/wagmi dependency at all, only values already
// read. This allows testing each rule in isolation (including with numbers actually read from the
// chain via `cast`, outside React) and keeps the UI (GateChecklist.tsx) dumb: it only formats the
// result that already comes ready from here, it never decides on its own.
//
// Each gate ALWAYS tells apart different things, never mixed up:
//   "ok"       — the condition was checked and is satisfied.
//   "rejected" — the condition was actually checked and is NOT satisfied (the chain/the data
//                answered "no", or the precondition for checking hasn't been met yet —
//                e.g. wallet not connected).
//   "error"    — it couldn't be checked (RPC down, the read failed). It NEVER becomes
//                "rejected" — a read error isn't the chain saying no.
//   "loading"  — the check is in progress.
export type GateStatus = "loading" | "ok" | "rejected" | "error";

export type GateProviderResult = { status: Extract<GateStatus, "ok" | "rejected"> };

export function evaluateGateProvider(hasProvider: boolean): GateProviderResult {
  return { status: hasProvider ? "ok" : "rejected" };
}

export type GateNetworkResult =
  | { status: "rejected"; reason: "nao_conectado" }
  | { status: "rejected"; reason: "rede_errada"; connectedChainId: number }
  | { status: "ok" };

export function evaluateGateNetwork(isConnected: boolean, connectedChainId: number | undefined, expectedChainId: number): GateNetworkResult {
  if (!isConnected) return { status: "rejected", reason: "nao_conectado" };
  if (connectedChainId !== expectedChainId) {
    return { status: "rejected", reason: "rede_errada", connectedChainId: connectedChainId ?? -1 };
  }
  return { status: "ok" };
}

/**
 * Estimated cost = a fixed gas limit (not a real simulation of the call — simulating
 * `criarOfertaCompleta` before passing the other gates would just revert for nothing, see
 * niara-contracts-PMEs/PLANO_OFERTA_ORQUESTRADOR.md §1.6 for where the number comes from) × the gas
 * price read now × a safety margin. Phase 2 showed the gas price vary from ~1 gwei to dozens in the
 * same session — the margin exists so a balance "right at the limit" that becomes insufficient
 * between this check and the actual signature doesn't get through. It's still just an estimate:
 * MetaMask itself decides the final cost at signing time.
 */
// BigInt(...) instead of the `123n` suffix — this project compiles to ES2017 (tsconfig.json),
// below the ES2020 required for native BigInt literals; the same convention already used in
// src/lib/money.ts.
export const PUBLICATION_GAS_LIMIT = BigInt(1_200_000);

// R$ cents (bigint in offerings.*_cents) -> MockBRL's 18-decimal unit (1 "unit" =
// 1 real equivalent): amount_wei = cents * 10^16. Single source — used both when building the
// transaction's arguments (client) and when checking the mined event against Supabase
// (confirmPublication, server).
export const UNIT_ON_CHAIN = BigInt("10000000000000000");
export const SAFETY_MARGIN_PERCENT = BigInt(130); // 130% = +30% over the base cost

export function estimatePublicationCostWei(gasPriceWei: bigint): bigint {
  return (PUBLICATION_GAS_LIMIT * gasPriceWei * SAFETY_MARGIN_PERCENT) / BigInt(100);
}

export type GateBalanceResult =
  | { status: "loading" }
  | { status: "error" }
  | { status: "rejected"; balanceWei: bigint; estimatedCostWei: bigint }
  | { status: "ok"; balanceWei: bigint; estimatedCostWei: bigint };

export function evaluateGateBalance(params: {
  isConnected: boolean;
  balanceWei: bigint | undefined;
  gasPriceWei: bigint | undefined;
  balanceLoading: boolean;
  balanceError: boolean;
  gasPriceLoading: boolean;
  gasPriceError: boolean;
}): GateBalanceResult {
  if (!params.isConnected) return { status: "loading" };
  if (params.balanceError || params.gasPriceError) return { status: "error" };
  if (params.balanceLoading || params.gasPriceLoading || params.balanceWei === undefined || params.gasPriceWei === undefined) {
    return { status: "loading" };
  }
  const estimatedCostWei = estimatePublicationCostWei(params.gasPriceWei);
  if (params.balanceWei < estimatedCostWei) return { status: "rejected", balanceWei: params.balanceWei, estimatedCostWei };
  return { status: "ok", balanceWei: params.balanceWei, estimatedCostWei };
}

export type GateOwnershipResult =
  | { status: "rejected"; reason: "sem_carteira_vinculada" }
  | { status: "rejected"; reason: "nao_conectado" }
  | { status: "rejected"; reason: "carteira_diferente"; connectedWallet: `0x${string}`; linkedWallet: string }
  | { status: "ok" };

export function evaluateGateOwnership(
  connectedWallet: `0x${string}` | undefined,
  linkedWallet: string | null,
): GateOwnershipResult {
  if (!linkedWallet) return { status: "rejected", reason: "sem_carteira_vinculada" };
  if (!connectedWallet) return { status: "rejected", reason: "nao_conectado" };
  if (connectedWallet.toLowerCase() !== linkedWallet.toLowerCase()) {
    return { status: "rejected", reason: "carteira_diferente", connectedWallet, linkedWallet };
  }
  return { status: "ok" };
}

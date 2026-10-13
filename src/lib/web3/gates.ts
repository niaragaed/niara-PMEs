// Avaliação PURA dos gates de publicação on-chain (Fase 3, ver
// PLANO_FASE_3_PUBLICACAO_ONCHAIN.md) — sem nenhuma dependência de React/wagmi, só valores já
// lidos. Isso permite testar cada regra isoladamente (inclusive com números lidos de verdade
// da chain via `cast`, fora do React) e mantém a UI (GateChecklist.tsx) burra: ela só formata
// o resultado que já veio pronto daqui, nunca decide sozinha.
//
// Cada gate distingue SEMPRE três coisas diferentes, nunca confundidas:
//   "ok"        — a condição foi checada e está satisfeita.
//   "rejected" — a condição foi checada de verdade e NÃO está satisfeita (a chain/o dado
//                 respondeu "não", ou a pré-condição para checar ainda não foi cumprida —
//                 ex.: carteira não conectada).
//   "error"      — não foi possível checar (RPC fora do ar, leitura falhou). NUNCA vira
//                 "rejected" — um erro de leitura não é a chain dizendo não.
//   "loading"— a checagem está em andamento.
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
 * Custo estimado = gasLimite fixo (não uma simulação real da chamada — simular
 * `criarOfertaCompleta` antes de passar nos outros gates só reverteria à toa, ver
 * niara-contracts-PMEs/PLANO_OFERTA_ORQUESTRADOR.md §1.6 para a origem do número) × preço do
 * gás lido agora × margem de segurança. A Fase 2 mostrou o preço do gás variar de ~1 gwei a
 * dezenas na mesma sessão — a margem existe para não deixar passar um saldo "no limite" que
 * vira insuficiente entre este check e a assinatura de verdade. Ainda assim é só uma
 * estimativa: quem decide o custo final é a própria MetaMask no momento de assinar.
 */
// BigInt(...) em vez do sufixo `123n` — este projeto compila para ES2017 (tsconfig.json),
// abaixo do ES2020 exigido para literais BigInt nativos; mesma convenção já usada em
// src/lib/money.ts.
export const PUBLICATION_GAS_LIMIT = BigInt(1_200_000);

// Centavos de R$ (bigint em offerings.*_cents) -> unidade de 18 casas do MockBRL (1 "unidade" =
// 1 real equivalente): valor_wei = centavos * 10^16. Fonte única — usada tanto ao montar os
// argumentos da transação (client) quanto ao conferir o evento minerado contra o Supabase
// (confirmarPublicacao, server).
export const UNIT_ON_CHAIN = BigInt("10000000000000000");
export const SAFETY_MARGIN_PERCENT = BigInt(130); // 130% = +30% sobre o custo base

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

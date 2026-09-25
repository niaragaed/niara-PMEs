// Avaliação PURA dos gates de publicação on-chain (Fase 3, ver
// PLANO_FASE_3_PUBLICACAO_ONCHAIN.md) — sem nenhuma dependência de React/wagmi, só valores já
// lidos. Isso permite testar cada regra isoladamente (inclusive com números lidos de verdade
// da chain via `cast`, fora do React) e mantém a UI (GateChecklist.tsx) burra: ela só formata
// o resultado que já veio pronto daqui, nunca decide sozinha.
//
// Cada gate distingue SEMPRE três coisas diferentes, nunca confundidas:
//   "ok"        — a condição foi checada e está satisfeita.
//   "reprovado" — a condição foi checada de verdade e NÃO está satisfeita (a chain/o dado
//                 respondeu "não", ou a pré-condição para checar ainda não foi cumprida —
//                 ex.: carteira não conectada).
//   "erro"      — não foi possível checar (RPC fora do ar, leitura falhou). NUNCA vira
//                 "reprovado" — um erro de leitura não é a chain dizendo não.
//   "carregando"— a checagem está em andamento.
export type GateStatus = "carregando" | "ok" | "reprovado" | "erro";

export type GateProviderResultado = { status: Extract<GateStatus, "ok" | "reprovado"> };

export function avaliarGateProvider(hasProvider: boolean): GateProviderResultado {
  return { status: hasProvider ? "ok" : "reprovado" };
}

export type GateRedeResultado =
  | { status: "reprovado"; motivo: "nao_conectado" }
  | { status: "reprovado"; motivo: "rede_errada"; chainIdConectado: number }
  | { status: "ok" };

export function avaliarGateRede(isConnected: boolean, chainIdConectado: number | undefined, chainIdEsperado: number): GateRedeResultado {
  if (!isConnected) return { status: "reprovado", motivo: "nao_conectado" };
  if (chainIdConectado !== chainIdEsperado) {
    return { status: "reprovado", motivo: "rede_errada", chainIdConectado: chainIdConectado ?? -1 };
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
export const GAS_LIMITE_PUBLICACAO = BigInt(1_200_000);
export const MARGEM_SEGURANCA_PERCENT = BigInt(130); // 130% = +30% sobre o custo base

export function estimarCustoPublicacaoWei(precoGasWei: bigint): bigint {
  return (GAS_LIMITE_PUBLICACAO * precoGasWei * MARGEM_SEGURANCA_PERCENT) / BigInt(100);
}

export type GateSaldoResultado =
  | { status: "carregando" }
  | { status: "erro" }
  | { status: "reprovado"; saldoWei: bigint; custoEstimadoWei: bigint }
  | { status: "ok"; saldoWei: bigint; custoEstimadoWei: bigint };

export function avaliarGateSaldo(params: {
  isConnected: boolean;
  saldoWei: bigint | undefined;
  precoGasWei: bigint | undefined;
  saldoCarregando: boolean;
  saldoComErro: boolean;
  precoGasCarregando: boolean;
  precoGasComErro: boolean;
}): GateSaldoResultado {
  if (!params.isConnected) return { status: "carregando" };
  if (params.saldoComErro || params.precoGasComErro) return { status: "erro" };
  if (params.saldoCarregando || params.precoGasCarregando || params.saldoWei === undefined || params.precoGasWei === undefined) {
    return { status: "carregando" };
  }
  const custoEstimadoWei = estimarCustoPublicacaoWei(params.precoGasWei);
  if (params.saldoWei < custoEstimadoWei) return { status: "reprovado", saldoWei: params.saldoWei, custoEstimadoWei };
  return { status: "ok", saldoWei: params.saldoWei, custoEstimadoWei };
}

export type GateTitularidadeResultado =
  | { status: "reprovado"; motivo: "sem_carteira_vinculada" }
  | { status: "reprovado"; motivo: "nao_conectado" }
  | { status: "reprovado"; motivo: "carteira_diferente"; carteiraConectada: `0x${string}`; walletVinculada: string }
  | { status: "ok" };

export function avaliarGateTitularidade(
  carteiraConectada: `0x${string}` | undefined,
  walletVinculada: string | null,
): GateTitularidadeResultado {
  if (!walletVinculada) return { status: "reprovado", motivo: "sem_carteira_vinculada" };
  if (!carteiraConectada) return { status: "reprovado", motivo: "nao_conectado" };
  if (carteiraConectada.toLowerCase() !== walletVinculada.toLowerCase()) {
    return { status: "reprovado", motivo: "carteira_diferente", carteiraConectada, walletVinculada };
  }
  return { status: "ok" };
}

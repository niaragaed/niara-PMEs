// Centraliza a leitura/escrita dos contratos on-chain da demo real em Sepolia — pareia cada
// endereço com seu ABI (src/lib/web3/abis/), no formato que os hooks do wagmi
// (`useReadContract`/`useWriteContract`/`useReadContracts`) esperam via spread
// (`{ ...ofertaCaptacaoContract, functionName: "..." }`). Nenhum componente React deve montar
// esse par address+abi na mão.
//
// Desde a Fase 4 (sub-etapa 5.2, ver PLANO_FASE_3_PUBLICACAO_ONCHAIN.md), este módulo não
// resolve mais "qual oferta" a partir de um índice na lista legada
// (`NEXT_PUBLIC_OFERTAS_ONCHAIN`, ver addresses.ts) — recebe o par de endereços já resolvido
// pelo chamador, que hoje pode vir de duas origens: a lista legada (env var, 10 ofertas de
// reserva criadas por script administrativo) ou o Supabase (`loadConfirmedOnChainOfferings`,
// ofertas publicadas pelo self-service e já confirmadas). Este módulo não sabe nem precisa saber
// a origem — só monta o par address+abi.
import { getOnChainAddresses } from "./addresses";
import { mockBrlAbi } from "./abis/mockBrl";
import { ofertaCaptacaoAbi } from "./abis/ofertaCaptacao";
import { participacaoTokenAbi } from "./abis/participacaoToken";

export type OnChainContracts = {
  mockBrl: { address: `0x${string}`; abi: typeof mockBrlAbi };
  ofertaCaptacao: { address: `0x${string}`; abi: typeof ofertaCaptacaoAbi };
  participacaoToken: { address: `0x${string}`; abi: typeof participacaoTokenAbi };
};

export type OfertaOnChainEnderecos = {
  token: `0x${string}`;
  oferta: `0x${string}`;
};

/**
 * `MockBRL` é compartilhado por TODAS as ofertas, legadas e self-service — confirmado por
 * leitura direta on-chain (`OfertaCaptacao.moeda()`) antes desta sub-etapa, ver CLAUDE.md — por
 * isso é resolvido à parte, sem depender de qual oferta está selecionada (`useMintMockBrl` não
 * precisa de nenhum endereço de oferta para cunhar saldo).
 */
export function getMockBrlContract(): { address: `0x${string}`; abi: typeof mockBrlAbi } | null {
  const addresses = getOnChainAddresses();
  if (!addresses) return null;
  return { address: addresses.mockBrl, abi: mockBrlAbi };
}

/**
 * Retorna `null` (nunca lança) quando `enderecos` é `null` ou o `MockBRL` não está configurado —
 * ver `getMockBrlContract()`.
 */
export function getOnChainContracts(enderecos: OfertaOnChainEnderecos | null): OnChainContracts | null {
  if (!enderecos) return null;
  const mockBrl = getMockBrlContract();
  if (!mockBrl) return null;

  return {
    mockBrl,
    ofertaCaptacao: { address: enderecos.oferta, abi: ofertaCaptacaoAbi },
    participacaoToken: { address: enderecos.token, abi: participacaoTokenAbi },
  };
}

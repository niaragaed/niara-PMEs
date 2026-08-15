// Centraliza a leitura/escrita dos contratos on-chain da demo real em Sepolia — pareia cada
// endereço (src/lib/web3/addresses.ts) com seu ABI (src/lib/web3/abis/), no formato que os
// hooks do wagmi (`useReadContract`/`useWriteContract`/`useReadContracts`) esperam via
// spread (`{ ...ofertaCaptacaoContract, functionName: "..." }`). Nenhum componente React deve
// montar esse par address+abi na mão.
import { getOnChainAddresses } from "./addresses";
import { mockBrlAbi } from "./abis/mockBrl";
import { ofertaCaptacaoAbi } from "./abis/ofertaCaptacao";
import { participacaoTokenAbi } from "./abis/participacaoToken";

export type OnChainContracts = {
  mockBrl: { address: `0x${string}`; abi: typeof mockBrlAbi };
  ofertaCaptacao: { address: `0x${string}`; abi: typeof ofertaCaptacaoAbi };
  participacaoToken: { address: `0x${string}`; abi: typeof participacaoTokenAbi };
};

/**
 * Retorna `null` (nunca lança) quando os endereços da demo não foram configurados, ou quando
 * `ofertaIndex` aponta para uma posição fora da lista — ver `getOnChainAddresses`.
 * `ofertaIndex` seleciona qual das várias ofertas disponíveis usar (padrão: a primeira, índice
 * 0) — ver `NEXT_PUBLIC_OFERTAS_ONCHAIN` em addresses.ts.
 */
export function getOnChainContracts(ofertaIndex = 0): OnChainContracts | null {
  const addresses = getOnChainAddresses();
  if (!addresses) return null;

  const selecionada = addresses.ofertas[ofertaIndex];
  if (!selecionada) return null;

  return {
    mockBrl: { address: addresses.mockBrl, abi: mockBrlAbi },
    ofertaCaptacao: { address: selecionada.oferta, abi: ofertaCaptacaoAbi },
    participacaoToken: { address: selecionada.token, abi: participacaoTokenAbi },
  };
}

// Endereço + rede do OfertaOrquestrador (niara-contracts-PMEs/src/orquestracao/
// OfertaOrquestrador.sol) — canal self-service de criação de oferta pelo emissor (Fase 3, ver
// PLANO_FASE_3_PUBLICACAO_ONCHAIN.md). Diferente de addresses.ts/contracts.ts (que lidam com
// várias ofertas em paralelo, cada uma com seu próprio par token/oferta): aqui só existe UM
// contrato, porque o frontend só fala diretamente com o orquestrador — tokenFactory/gateway/
// captacaoFactory são detalhes internos dele, nunca chamados daqui.
import { sepolia } from "wagmi/chains";
import { ofertaOrquestradorAbi } from "./abis/ofertaOrquestrador";

// Rede fixada explicitamente aqui como constante — nunca inferida da carteira conectada nem
// de alguma config global. Apontar este contrato para outra rede no futuro exige editar esta
// linha de propósito; nunca é um acidente de qual chain a wallet do usuário estava.
export const ORQUESTRADOR_CHAIN_ID = sepolia.id;

const HEX_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

export type OrquestradorContract = {
  address: `0x${string}`;
  abi: typeof ofertaOrquestradorAbi;
  chainId: typeof ORQUESTRADOR_CHAIN_ID;
};

/**
 * Retorna `null` (nunca lança) quando `NEXT_PUBLIC_ORQUESTRADOR_ADDRESS` está ausente ou mal
 * formado — a UI trata isso como "contrato não configurado", mesmo padrão já usado por
 * `getOnChainContracts()` em `contracts.ts`.
 */
export function getOrquestradorContract(): OrquestradorContract | null {
  const address = process.env.NEXT_PUBLIC_ORQUESTRADOR_ADDRESS;
  if (!address || !HEX_ADDRESS_PATTERN.test(address)) return null;

  return {
    address: address as `0x${string}`,
    abi: ofertaOrquestradorAbi,
    chainId: ORQUESTRADOR_CHAIN_ID,
  };
}

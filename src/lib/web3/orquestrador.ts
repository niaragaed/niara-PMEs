// Address + network of OfertaOrquestrador (niara-contracts-PMEs/src/orquestracao/
// OfertaOrquestrador.sol) — the self-service channel for the issuer to create an offering (Phase 3,
// see PLANO_FASE_3_PUBLICACAO_ONCHAIN.md). Unlike addresses.ts/contracts.ts (which deal with
// several offerings in parallel, each with its own token/offering pair): here there's only ONE
// contract, because the frontend only talks directly to the orchestrator — tokenFactory/gateway/
// captacaoFactory are its internal details, never called from here.
import { sepolia } from "wagmi/chains";
import { ofertaOrquestradorAbi } from "./abis/ofertaOrquestrador";

// The network is pinned explicitly here as a constant — never inferred from the connected wallet
// nor from some global config. Pointing this contract at another network in the future requires
// editing this line on purpose; it's never an accident of which chain the user's wallet was on.
export const ORCHESTRATOR_CHAIN_ID = sepolia.id;

const HEX_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

export type OrchestratorContract = {
  address: `0x${string}`;
  abi: typeof ofertaOrquestradorAbi;
  chainId: typeof ORCHESTRATOR_CHAIN_ID;
};

/**
 * Returns `null` (never throws) when `NEXT_PUBLIC_ORQUESTRADOR_ADDRESS` is missing or malformed —
 * the UI treats that as "contract not configured", the same pattern already used by
 * `getOnChainContracts()` in `contracts.ts`.
 */
export function getOrchestratorContract(): OrchestratorContract | null {
  const address = process.env.NEXT_PUBLIC_ORQUESTRADOR_ADDRESS;
  if (!address || !HEX_ADDRESS_PATTERN.test(address)) return null;

  return {
    address: address as `0x${string}`,
    abi: ofertaOrquestradorAbi,
    chainId: ORCHESTRATOR_CHAIN_ID,
  };
}

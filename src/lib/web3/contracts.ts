// Centralizes the reads/writes of the real Sepolia demo's on-chain contracts — pairs each
// address with its ABI (src/lib/web3/abis/), in the shape wagmi's hooks
// (`useReadContract`/`useWriteContract`/`useReadContracts`) expect via spread
// (`{ ...ofertaCaptacaoContract, functionName: "..." }`). No React component should build
// that address+abi pair by hand.
//
// Since Phase 4 (sub-step 5.2, see PLANO_FASE_3_PUBLICACAO_ONCHAIN.md), this module no longer
// resolves "which offering" from an index in the legacy list
// (`NEXT_PUBLIC_OFERTAS_ONCHAIN`, see addresses.ts) — it receives the address pair already resolved
// by the caller, which today can come from two sources: the legacy list (env var, offerings created by
// an admin script) or Supabase (`loadConfirmedOnChainOfferings`, offerings published through
// self-service and already confirmed). This module doesn't know, nor needs to know, the source — it
// only builds the address+abi pair.
import { mockBrlAbi } from "./abis/mockBrl";
import { ofertaCaptacaoAbi } from "./abis/ofertaCaptacao";
import { participacaoTokenAbi } from "./abis/participacaoToken";

export type OnChainContracts = {
  ofertaCaptacao: { address: `0x${string}`; abi: typeof ofertaCaptacaoAbi };
  participacaoToken: { address: `0x${string}`; abi: typeof participacaoTokenAbi };
};

export type OnChainOfferingAddresses = {
  token: `0x${string}`;
  offering: `0x${string}`;
};

/**
 * 🔴 This module NO LONGER resolves the MockBRL — a real incident, fixed: a previous version
 * of this function returned a fixed MockBRL address (`NEXT_PUBLIC_MOCKBRL_ADDRESS`), with the
 * comment claiming "MockBRL is shared by ALL offerings, legacy and self-service". That claim was
 * WRONG — it was never checked line by line against the real self-service offerings, only
 * assumed. Confirmed via `cast call` after a real investment incident (see CLAUDE.md,
 * "/investir/onchain screen"): the legacy offerings (created by the admin script) do share a
 * single `MockBRL` (`0xb99dda4e...`, the env var value) — but the self-service offerings (created
 * via `OfertaOrquestrador.criarOfertaCompleta`) use the orchestrator's OWN `MockBRL`
 * (`0xEC377e00e022675B67Da6ab1966Bc0764bF792A4`), different from the env var. Reading the MockBRL
 * as a global constant made the screen approve and check the allowance against the WRONG token
 * for any self-service offering — the `approve` mined successfully (against the wrong MockBRL),
 * the real offering's allowance stayed zero, and `aportar` reverted with
 * `ERC20InsufficientAllowance`.
 *
 * **Fix**: an offering's MockBRL is always `OfertaCaptacao.moeda()` — read on-chain, from the
 * selected offering ITSELF, never from an env var nor from a value inherited from another hook.
 * Each hook that needs the MockBRL (`useOnChainOfferingTerms`, `useMyOnChainPosition`,
 * `useMintMockBrl`, `useInvestOnChain`) reads `moeda()` from its own offering, independently —
 * none trusts a value resolved by another hook, by the same principle already applied to the
 * allowance (never decide with a read that isn't your own).
 */
export function getMockBrlContractAt(address: `0x${string}`): { address: `0x${string}`; abi: typeof mockBrlAbi } {
  return { address, abi: mockBrlAbi };
}

/**
 * Returns `null` (never throws) when `addresses` is `null`. Only pairs the two addresses already
 * known statically (token/offering) with their ABIs — never does any on-chain read (that's why it
 * no longer includes `mockBrl`, which requires reading the offering's own `moeda()` first — see
 * `getMockBrlContractAt`).
 */
export function getOnChainContracts(addresses: OnChainOfferingAddresses | null): OnChainContracts | null {
  if (!addresses) return null;

  return {
    ofertaCaptacao: { address: addresses.offering, abi: ofertaCaptacaoAbi },
    participacaoToken: { address: addresses.token, abi: participacaoTokenAbi },
  };
}

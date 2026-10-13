"use client";

// Phase 3 gate 4 read (see PLANO_FASE_3_PUBLICACAO_ONCHAIN.md) — the address in
// `emissoresAutorizados` on OfertaOrquestrador. Independent of a connected wallet: reads any
// address passed as a parameter, always on the network pinned in `ORCHESTRATOR_CHAIN_ID` (never a
// wallet's current network, if one is connected) — pointing at another network would require
// editing that constant, it isn't a side effect of which chain the user's MetaMask is on.
import { useReadContract } from "wagmi";
import { getOrchestratorContract, ORCHESTRATOR_CHAIN_ID } from "../orchestrator";
import { describeOnChainError } from "../errors";
import { useDictionary } from "@/lib/i18n/client";

export type AuthorizedIssuerResult = {
  /** `false` only when `NEXT_PUBLIC_ORQUESTRADOR_ADDRESS` is missing/malformed. */
  contractConfigured: boolean;
  /**
   * `null` while loading or if the read failed — never a "made-up" `false` when the real cause is
   * that the read didn't happen. It's only `true`/`false` when the chain answered.
   */
  authorized: boolean | null;
  isLoading: boolean;
  /** Already translated message (e.g. RPC down) — `null` when there's no error. */
  errorMessage: string | null;
};

export function useAuthorizedIssuer(address: `0x${string}` | undefined): AuthorizedIssuerResult {
  const contract = getOrchestratorContract();
  const messages = useDictionary().chainErrors.evm;

  const { data, isLoading, isError, error } = useReadContract({
    address: contract?.address,
    abi: contract?.abi,
    chainId: ORCHESTRATOR_CHAIN_ID,
    functionName: "emissoresAutorizados",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(contract && address) },
  });
  // The ABI guarantees `outputs: [{ type: "bool" }]` (see abis/ofertaOrquestrador.ts) — wagmi's
  // type inference falls back to `{}` when address/abi are optional (in case `contract` is
  // `null`), so the value is always a boolean in practice; only the static type can't prove that
  // on its own here.
  const authorized = data as boolean | undefined;

  return {
    contractConfigured: contract !== null,
    authorized: isError ? null : (authorized ?? null),
    isLoading,
    errorMessage: isError ? describeOnChainError(error, messages) : null,
  };
}

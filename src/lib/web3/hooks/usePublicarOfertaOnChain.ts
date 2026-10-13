"use client";

// Phase 3, sub-step 4 write hook (see PLANO_FASE_3_PUBLICACAO_ONCHAIN.md) — signs
// criarOfertaCompleta, records the attempt (Server Action, BEFORE waiting for confirmation — covers
// the "closes the tab right after signing" case), waits for confirmation and finally asks the
// server to read the mined event and record the result. Never shows "success" before the real
// on-chain confirmation AND the server-side write have come back — "pendente" is never treated as
// "published". The "pendente" / "confirmada" / "divergente" statuses mirror offerings.sync_status.
import { useCallback, useState } from "react";
import { usePublicClient, useWriteContract } from "wagmi";
import { getOrchestratorContract, ORCHESTRATOR_CHAIN_ID } from "../orquestrador";
import { PUBLICATION_GAS_LIMIT } from "../gates";
import { describeOnChainError } from "../errors";
import { registerAttempt, confirmPublication } from "@/app/empresa/ofertas/onchain-actions";
import { useDictionary } from "@/lib/i18n/client";

export type PublishStatus =
  | "idle"
  | "signing"
  | "registering"
  | "confirming"
  | "confirmada"
  | "pendente"
  | "reverted"
  | "divergente"
  | "error";

export type PublishState = {
  status: PublishStatus;
  txHash: `0x${string}` | null;
  errorMessage: string | null;
  contractAddress: string | null;
  tokenAddress: string | null;
};

const IDLE: PublishState = { status: "idle", txHash: null, errorMessage: null, contractAddress: null, tokenAddress: null };

export type PublishArgs = {
  offeringId: string;
  name: string;
  symbol: string;
  company: string;
  cnpjRef: `0x${string}`;
  series: string;
  minTargetWei: bigint;
  maxTargetWei: bigint;
  pricePerShareWei: bigint;
  windowDays: number;
};

export function usePublishOfferingOnChain() {
  const [state, setState] = useState<PublishState>(IDLE);
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const messages = useDictionary().chainErrors.evm;

  const publish = useCallback(
    async (args: PublishArgs) => {
      const orchestrator = getOrchestratorContract();
      if (!orchestrator || !publicClient) {
        setState({ ...IDLE, status: "error", errorMessage: messages.contractNotConfigured });
        return;
      }

      const deadlineUnixSeconds = Math.floor(Date.now() / 1000) + args.windowDays * 24 * 60 * 60;

      setState({ ...IDLE, status: "signing" });
      let hash: `0x${string}`;
      try {
        hash = await writeContractAsync({
          address: orchestrator.address,
          abi: orchestrator.abi,
          chainId: ORCHESTRATOR_CHAIN_ID,
          functionName: "criarOfertaCompleta",
          args: [
            args.name,
            args.symbol,
            args.company,
            args.cnpjRef,
            args.series,
            args.minTargetWei,
            args.maxTargetWei,
            args.pricePerShareWei,
            BigInt(deadlineUnixSeconds),
          ],
          gas: PUBLICATION_GAS_LIMIT,
        });
      } catch (error) {
        // Covers a rejection in MetaMask and a revert already at the simulation/gas estimation
        // (describeOnChainError decodes the OfertaOrquestrador custom error if that's the case).
        setState({ ...IDLE, status: "error", errorMessage: describeOnChainError(error, messages) });
        return;
      }

      // Recorded BEFORE waiting for confirmation — covers "the user closes the tab right after
      // signing": the hash is already saved, and the reconciliation (next visit to this screen)
      // resolves it on its own.
      setState({ status: "registering", txHash: hash, errorMessage: null, contractAddress: null, tokenAddress: null });
      const reg = await registerAttempt({ offeringId: args.offeringId, txHash: hash, deadlineUnixSeconds });
      if (reg.status === "error") {
        setState({ status: "error", txHash: hash, errorMessage: reg.message, contractAddress: null, tokenAddress: null });
        return;
      }

      setState({ status: "confirming", txHash: hash, errorMessage: null, contractAddress: null, tokenAddress: null });
      try {
        await publicClient.waitForTransactionReceipt({ hash });
      } catch (error) {
        // The RPC went down or timed out while waiting — the hash is already saved
        // (sync_status='pendente'); the reconciliation resolves it later, it's not a fatal error
        // for the flow.
        setState({ status: "pendente", txHash: hash, errorMessage: describeOnChainError(error, messages), contractAddress: null, tokenAddress: null });
        return;
      }

      const conf = await confirmPublication(args.offeringId);
      if (conf.status === "confirmada") {
        setState({ status: "confirmada", txHash: hash, errorMessage: null, contractAddress: conf.contractAddress, tokenAddress: conf.tokenAddress });
      } else if (conf.status === "pendente") {
        setState({ status: "pendente", txHash: hash, errorMessage: null, contractAddress: null, tokenAddress: null });
      } else if (conf.status === "reverted") {
        setState({ status: "reverted", txHash: hash, errorMessage: conf.reason, contractAddress: null, tokenAddress: null });
      } else if (conf.status === "divergente") {
        setState({ status: "divergente", txHash: hash, errorMessage: conf.reason, contractAddress: null, tokenAddress: null });
      } else {
        setState({ status: "error", txHash: hash, errorMessage: conf.message, contractAddress: null, tokenAddress: null });
      }
    },
    [publicClient, writeContractAsync, messages],
  );

  const reset = useCallback(() => setState(IDLE), []);

  return { ...state, publish, reset };
}

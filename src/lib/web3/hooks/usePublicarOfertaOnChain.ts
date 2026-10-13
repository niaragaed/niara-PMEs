"use client";

// Hook de escrita da Fase 3, sub-etapa 4 (ver PLANO_FASE_3_PUBLICACAO_ONCHAIN.md) — assina
// criarOfertaCompleta, registra a tentativa (Server Action, ANTES de esperar confirmação — cobre
// o caso "fecha a aba logo após assinar"), espera a confirmação e por fim pede ao servidor para
// ler o evento minerado e gravar o resultado. Nunca mostra "sucesso" antes da confirmação real
// on-chain E da gravação server-side ter voltado — "pendente" nunca é tratado como "publicada".
import { useCallback, useState } from "react";
import { usePublicClient, useWriteContract } from "wagmi";
import { getOrchestratorContract, ORCHESTRATOR_CHAIN_ID } from "../orquestrador";
import { PUBLICATION_GAS_LIMIT } from "../gates";
import { describeOnChainError } from "../errors";
import { registerAttempt, confirmPublication } from "@/app/empresa/ofertas/onchain-actions";

export type PublishStatus =
  | "idle"
  | "assinando"
  | "registrando"
  | "confirmando"
  | "confirmada"
  | "pendente"
  | "revertida"
  | "divergente"
  | "erro";

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

  const publish = useCallback(
    async (args: PublishArgs) => {
      const orchestrator = getOrchestratorContract();
      if (!orchestrator || !publicClient) {
        setState({ ...IDLE, status: "erro", errorMessage: "Contrato não configurado." });
        return;
      }

      const deadlineUnixSeconds = Math.floor(Date.now() / 1000) + args.windowDays * 24 * 60 * 60;

      setState({ ...IDLE, status: "assinando" });
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
        // Cobre rejeição na MetaMask e revert já na simulação/estimativa de gas (describeOnChainError
        // decodifica o erro customizado do OfertaOrquestrador se for o caso).
        setState({ ...IDLE, status: "erro", errorMessage: describeOnChainError(error) });
        return;
      }

      // Registrado ANTES de esperar confirmação — cobre "usuário fecha a aba logo após assinar":
      // o hash já fica salvo, e a reconciliação (próxima visita a esta tela) resolve sozinha.
      setState({ status: "registrando", txHash: hash, errorMessage: null, contractAddress: null, tokenAddress: null });
      const reg = await registerAttempt({ offeringId: args.offeringId, txHash: hash, prazoUnixSeconds: deadlineUnixSeconds });
      if (reg.status === "error") {
        setState({ status: "erro", txHash: hash, errorMessage: reg.message, contractAddress: null, tokenAddress: null });
        return;
      }

      setState({ status: "confirmando", txHash: hash, errorMessage: null, contractAddress: null, tokenAddress: null });
      try {
        await publicClient.waitForTransactionReceipt({ hash });
      } catch (error) {
        // RPC caiu ou timeout esperando — o hash já está salvo (sync_status='pendente'); a
        // reconciliação resolve depois, não é um erro fatal do fluxo.
        setState({ status: "pendente", txHash: hash, errorMessage: describeOnChainError(error), contractAddress: null, tokenAddress: null });
        return;
      }

      const conf = await confirmPublication(args.offeringId);
      if (conf.status === "confirmada") {
        setState({ status: "confirmada", txHash: hash, errorMessage: null, contractAddress: conf.contractAddress, tokenAddress: conf.tokenAddress });
      } else if (conf.status === "pendente") {
        setState({ status: "pendente", txHash: hash, errorMessage: null, contractAddress: null, tokenAddress: null });
      } else if (conf.status === "revertida") {
        setState({ status: "revertida", txHash: hash, errorMessage: conf.motivo, contractAddress: null, tokenAddress: null });
      } else if (conf.status === "divergente") {
        setState({ status: "divergente", txHash: hash, errorMessage: conf.motivo, contractAddress: null, tokenAddress: null });
      } else {
        setState({ status: "erro", txHash: hash, errorMessage: conf.message, contractAddress: null, tokenAddress: null });
      }
    },
    [publicClient, writeContractAsync],
  );

  const reset = useCallback(() => setState(IDLE), []);

  return { ...state, publicar: publish, reset };
}

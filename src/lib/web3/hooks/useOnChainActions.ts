"use client";

// Ações de escrita on-chain (Sepolia) — mint de MockBRL (faucet auto-serviço), investir
// (approve -> aportar), encerrar oferta e resgatar cotas. Cada hook expõe seu próprio status
// explícito (nunca mostra "sucesso" antes da confirmação on-chain, ver CLAUDE.md deste
// projeto) e traduz qualquer erro via describeOnChainError antes de devolvê-lo à UI.
import { useCallback, useState } from "react";
import { useConnection, usePublicClient, useWriteContract } from "wagmi";
import { getOnChainContracts } from "../contracts";
import { describeOnChainError } from "../errors";

export type SimpleTxStatus = "idle" | "assinando" | "confirmando" | "sucesso" | "erro";

export type SimpleTxState = {
  status: SimpleTxStatus;
  errorMessage: string | null;
};

const IDLE: SimpleTxState = { status: "idle", errorMessage: null };

/**
 * MockBRL.mint é público e irrestrito (mock de teste) — qualquer carteira conectada pode
 * cunhar saldo para si mesma, sem depender de nenhuma carteira administrativa.
 */
export function useMintMockBrl() {
  const [state, setState] = useState<SimpleTxState>(IDLE);
  const { address } = useConnection();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const mint = useCallback(
    async (amount: bigint) => {
      const contracts = getOnChainContracts();
      if (!contracts || !address || !publicClient) return;

      setState({ status: "assinando", errorMessage: null });
      try {
        const hash = await writeContractAsync({
          ...contracts.mockBrl,
          functionName: "mint",
          args: [address, amount],
        });
        setState({ status: "confirmando", errorMessage: null });
        await publicClient.waitForTransactionReceipt({ hash });
        setState({ status: "sucesso", errorMessage: null });
      } catch (error) {
        setState({ status: "erro", errorMessage: describeOnChainError(error) });
      }
    },
    [address, publicClient, writeContractAsync],
  );

  const reset = useCallback(() => setState(IDLE), []);

  return { ...state, mint, reset };
}

export type InvestStatus =
  | "idle"
  | "verificando-allowance"
  | "assinando-approve"
  | "confirmando-approve"
  | "assinando-aportar"
  | "confirmando-aportar"
  | "sucesso"
  | "erro";

export type InvestState = {
  status: InvestStatus;
  errorMessage: string | null;
};

/**
 * Fluxo completo de investimento: checa a allowance atual do MockBRL contra `valor`; só chama
 * `approve` quando insuficiente (nunca pede aprovação de novo se já houver allowance
 * suficiente); só então chama `aportar`. `valor` já deve vir calculado como
 * `quantidadeDeCotas * precoPorCota` (múltiplo exato — ver OfertaCaptacao.aportar) e
 * `allowanceAtual` deve vir do hook de leitura (useMinhaPosicaoOnChain), para não duplicar a
 * mesma leitura aqui. `ofertaIndex` seleciona qual das várias ofertas disponíveis usar.
 */
export function useInvestirOnChain(ofertaIndex = 0) {
  const [state, setState] = useState<InvestState>({ status: "idle", errorMessage: null });
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const investir = useCallback(
    async (valor: bigint, allowanceAtual: bigint) => {
      const contracts = getOnChainContracts(ofertaIndex);
      if (!contracts || !publicClient) return;

      try {
        setState({ status: "verificando-allowance", errorMessage: null });

        if (allowanceAtual < valor) {
          setState({ status: "assinando-approve", errorMessage: null });
          const approveHash = await writeContractAsync({
            ...contracts.mockBrl,
            functionName: "approve",
            args: [contracts.ofertaCaptacao.address, valor],
          });
          setState({ status: "confirmando-approve", errorMessage: null });
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }

        setState({ status: "assinando-aportar", errorMessage: null });
        const aportarHash = await writeContractAsync({
          ...contracts.ofertaCaptacao,
          functionName: "aportar",
          args: [valor],
        });
        setState({ status: "confirmando-aportar", errorMessage: null });
        await publicClient.waitForTransactionReceipt({ hash: aportarHash });

        setState({ status: "sucesso", errorMessage: null });
      } catch (error) {
        setState({ status: "erro", errorMessage: describeOnChainError(error) });
      }
    },
    [publicClient, writeContractAsync, ofertaIndex],
  );

  const reset = useCallback(() => setState({ status: "idle", errorMessage: null }), []);

  return { ...state, investir, reset };
}

/**
 * `encerrar()` é permissionless — qualquer carteira conectada pode chamar assim que a oferta
 * for elegível (prazo atingido, ou total arrecadado == meta máxima exata). `ofertaIndex`
 * seleciona qual das várias ofertas disponíveis usar.
 */
export function useEncerrarOferta(ofertaIndex = 0) {
  const [state, setState] = useState<SimpleTxState>(IDLE);
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const encerrar = useCallback(async () => {
    const contracts = getOnChainContracts(ofertaIndex);
    if (!contracts || !publicClient) return;

    setState({ status: "assinando", errorMessage: null });
    try {
      const hash = await writeContractAsync({ ...contracts.ofertaCaptacao, functionName: "encerrar" });
      setState({ status: "confirmando", errorMessage: null });
      await publicClient.waitForTransactionReceipt({ hash });
      setState({ status: "sucesso", errorMessage: null });
    } catch (error) {
      setState({ status: "erro", errorMessage: describeOnChainError(error) });
    }
  }, [publicClient, writeContractAsync, ofertaIndex]);

  const reset = useCallback(() => setState(IDLE), []);

  return { ...state, encerrar, reset };
}

/**
 * `resgatarCotas()` é pull, uma vez por investidor, só após `EncerradaSucesso` — independente
 * de `liberarParaEmissor` (ver OfertaCaptacao.sol, confirmado antes de fixar este fluxo).
 * `ofertaIndex` seleciona qual das várias ofertas disponíveis usar.
 */
export function useResgatarCotas(ofertaIndex = 0) {
  const [state, setState] = useState<SimpleTxState>(IDLE);
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const resgatar = useCallback(async () => {
    const contracts = getOnChainContracts(ofertaIndex);
    if (!contracts || !publicClient) return;

    setState({ status: "assinando", errorMessage: null });
    try {
      const hash = await writeContractAsync({ ...contracts.ofertaCaptacao, functionName: "resgatarCotas" });
      setState({ status: "confirmando", errorMessage: null });
      await publicClient.waitForTransactionReceipt({ hash });
      setState({ status: "sucesso", errorMessage: null });
    } catch (error) {
      setState({ status: "erro", errorMessage: describeOnChainError(error) });
    }
  }, [publicClient, writeContractAsync, ofertaIndex]);

  const reset = useCallback(() => setState(IDLE), []);

  return { ...state, resgatar, reset };
}

/**
 * `liberarParaEmissor()` é pull, uma vez, permissionless, só após `EncerradaSucesso` — transfere
 * o arrecadado (menos a taxa, se `taxaBps > 0`) ao emissor e a taxa ao `protocoloWallet` (ver
 * OfertaCaptacao.sol). Sem chamar esta função, o dinheiro fica retido no escrow para sempre — é o
 * gatilho que de fato move a receita de taxa da plataforma, quando existir. `ofertaIndex` seleciona
 * qual das várias ofertas disponíveis usar.
 */
export function useLiberarParaEmissor(ofertaIndex = 0) {
  const [state, setState] = useState<SimpleTxState>(IDLE);
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const liberar = useCallback(async () => {
    const contracts = getOnChainContracts(ofertaIndex);
    if (!contracts || !publicClient) return;

    setState({ status: "assinando", errorMessage: null });
    try {
      const hash = await writeContractAsync({ ...contracts.ofertaCaptacao, functionName: "liberarParaEmissor" });
      setState({ status: "confirmando", errorMessage: null });
      await publicClient.waitForTransactionReceipt({ hash });
      setState({ status: "sucesso", errorMessage: null });
    } catch (error) {
      setState({ status: "erro", errorMessage: describeOnChainError(error) });
    }
  }, [publicClient, writeContractAsync, ofertaIndex]);

  const reset = useCallback(() => setState(IDLE), []);

  return { ...state, liberar, reset };
}

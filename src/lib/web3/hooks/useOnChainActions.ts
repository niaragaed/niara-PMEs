"use client";

// Ações de escrita on-chain (Sepolia) — mint de MockBRL (faucet auto-serviço), investir
// (approve -> aportar), encerrar oferta e resgatar cotas. Cada hook expõe seu próprio status
// explícito (nunca mostra "sucesso" antes da confirmação on-chain, ver CLAUDE.md deste
// projeto) e traduz qualquer erro via describeOnChainError antes de devolvê-lo à UI.
import { useCallback, useState } from "react";
import { useConnection, usePublicClient, useWriteContract } from "wagmi";
import { getMockBrlContract, getOnChainContracts, type OfertaOnChainEnderecos } from "../contracts";
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
      const mockBrl = getMockBrlContract();
      if (!mockBrl || !address || !publicClient) return;

      setState({ status: "assinando", errorMessage: null });
      try {
        const hash = await writeContractAsync({
          ...mockBrl,
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
  | "simulando-aportar"
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
 * `quantidadeDeCotas * precoPorCota` (múltiplo exato — ver OfertaCaptacao.aportar).
 *
 * 🔴 Incidente real corrigido aqui: `allowanceAtual` costumava vir de fora, do hook de leitura
 * (`useMinhaPosicaoOnChain`, via React state) — e podia estar OBSOLETO numa segunda tentativa
 * logo após a primeira falhar (ex.: `approve` rejeitado por "nonce too low" na carteira): o
 * `refetch()` disparado depois da falha é assíncrono e não é esperado antes do botão reabilitar,
 * então um clique rápido em seguida podia herdar um `allowanceAtual` de antes da tentativa
 * anterior, decidir (errado) que a allowance já era suficiente, pular o `approve` inteiro e ir
 * direto para `aportar` — que revertia por allowance insuficiente de verdade (e, como
 * `criarOfertaCompleta`/`aportar` não têm gas fixo aqui, a MetaMask nem consegue estimar uma
 * chamada que reverte, daí o gás absurdo de novo — mesma classe de sintoma já documentada no
 * CLAUDE.md). Corrigido lendo a allowance **direto da chain, agora, dentro desta função** — nunca
 * mais um valor herdado de fora, que pode estar desatualizado por qualquer motivo (timing de
 * refetch, RPC, o que for).
 */
export function useInvestirOnChain(enderecos: OfertaOnChainEnderecos | null) {
  const [state, setState] = useState<InvestState>({ status: "idle", errorMessage: null });
  const { address } = useConnection();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const investir = useCallback(
    async (valor: bigint) => {
      const contracts = getOnChainContracts(enderecos);
      if (!contracts || !publicClient || !address) return;

      try {
        setState({ status: "verificando-allowance", errorMessage: null });
        const allowanceAtual = (await publicClient.readContract({
          ...contracts.mockBrl,
          functionName: "allowance",
          args: [address, contracts.ofertaCaptacao.address],
        })) as bigint;

        if (allowanceAtual < valor) {
          setState({ status: "assinando-approve", errorMessage: null });
          const approveHash = await writeContractAsync({
            ...contracts.mockBrl,
            functionName: "approve",
            args: [contracts.ofertaCaptacao.address, valor],
          });
          setState({ status: "confirmando-approve", errorMessage: null });
          const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
          // A aprovação foi MINERADA (não lançou exceção), mas pode ter revertido — checar o
          // status é obrigatório aqui, pelo mesmo motivo que confirmarPublicacao() checa
          // receipt.status do lado do servidor: um recibo existir não significa que deu certo.
          if (approveReceipt.status === "reverted") {
            setState({
              status: "erro",
              errorMessage: "A aprovação (approve) de MockBRL reverteu on-chain — o aporte não foi tentado.",
            });
            return;
          }
        }

        // 🔴 Proteção final, independente da causa raiz: nunca pede assinatura de algo que já
        // sabemos que vai reverter. Simula a MESMA chamada que estamos prestes a pedir pra
        // assinar — se reverter, decodifica o motivo real (describeOnChainError, mesma tradução
        // de sempre) e para aqui, sem chegar a chamar writeContractAsync. Isso mata a classe
        // inteira do sintoma "gás absurdo/MetaMask não consegue estimar", não só a causa já
        // corrigida acima (allowance obsoleta) — vale mesmo que a causa desta vez seja outra
        // (ver CLAUDE.md: aporte nas ofertas do OfertaOrquestrador ainda falha por motivo não
        // identificado, mesmo código de approve/aportar das 10 ofertas legadas que funcionam).
        setState({ status: "simulando-aportar", errorMessage: null });
        try {
          await publicClient.simulateContract({
            ...contracts.ofertaCaptacao,
            functionName: "aportar",
            args: [valor],
            account: address,
          });
        } catch (simError) {
          setState({ status: "erro", errorMessage: describeOnChainError(simError) });
          return;
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
    [address, publicClient, writeContractAsync, enderecos],
  );

  const reset = useCallback(() => setState({ status: "idle", errorMessage: null }), []);

  return { ...state, investir, reset };
}

/**
 * `encerrar()` é permissionless — qualquer carteira conectada pode chamar assim que a oferta
 * for elegível (prazo atingido, ou total arrecadado == meta máxima exata). `enderecos`
 * identifica a oferta (par token/oferta, ver contracts.ts).
 */
export function useEncerrarOferta(enderecos: OfertaOnChainEnderecos | null) {
  const [state, setState] = useState<SimpleTxState>(IDLE);
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const encerrar = useCallback(async () => {
    const contracts = getOnChainContracts(enderecos);
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
  }, [publicClient, writeContractAsync, enderecos]);

  const reset = useCallback(() => setState(IDLE), []);

  return { ...state, encerrar, reset };
}

/**
 * `resgatarCotas()` é pull, uma vez por investidor, só após `EncerradaSucesso` — independente
 * de `liberarParaEmissor` (ver OfertaCaptacao.sol, confirmado antes de fixar este fluxo).
 * `enderecos` identifica a oferta (par token/oferta, ver contracts.ts).
 */
export function useResgatarCotas(enderecos: OfertaOnChainEnderecos | null) {
  const [state, setState] = useState<SimpleTxState>(IDLE);
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const resgatar = useCallback(async () => {
    const contracts = getOnChainContracts(enderecos);
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
  }, [publicClient, writeContractAsync, enderecos]);

  const reset = useCallback(() => setState(IDLE), []);

  return { ...state, resgatar, reset };
}

/**
 * `liberarParaEmissor()` é pull, uma vez, permissionless, só após `EncerradaSucesso` — transfere
 * o arrecadado (menos a taxa, se `taxaBps > 0`) ao emissor e a taxa ao `protocoloWallet` (ver
 * OfertaCaptacao.sol). Sem chamar esta função, o dinheiro fica retido no escrow para sempre — é o
 * gatilho que de fato move a receita de taxa da plataforma, quando existir. `enderecos`
 * identifica a oferta (par token/oferta, ver contracts.ts).
 */
export function useLiberarParaEmissor(enderecos: OfertaOnChainEnderecos | null) {
  const [state, setState] = useState<SimpleTxState>(IDLE);
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const liberar = useCallback(async () => {
    const contracts = getOnChainContracts(enderecos);
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
  }, [publicClient, writeContractAsync, enderecos]);

  const reset = useCallback(() => setState(IDLE), []);

  return { ...state, liberar, reset };
}

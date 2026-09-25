"use client";

// Agrega os 5 gates on-chain/carteira da publicação (Fase 3, ver
// PLANO_FASE_3_PUBLICACAO_ONCHAIN.md) — o 6º (termo) é decidido pela própria tela, sem UI
// ainda nesta etapa (sub-etapa 3: sem assinatura, sem escrita). Tudo aqui vem de hooks
// reativos do wagmi (useConnection/useBalance/useGasPrice/useReadContract dentro de
// useEmissorAutorizado) — o próprio wagmi já reage a accountsChanged/chainChanged/troca de
// rede internamente (mesmo mecanismo já documentado para ConnectWallet.tsx no CLAUDE.md deste
// projeto: "a UI simplesmente re-renderiza porque os hooks são reativos ao estado do
// connector"), então trocar de conta ou de rede com esta tela aberta recalcula tudo sozinho —
// nenhum listener manual de window.ethereum é necessário nem adicionado aqui.
import { useSyncExternalStore } from "react";
import { useBalance, useConnection, useGasPrice } from "wagmi";
import { ORQUESTRADOR_CHAIN_ID } from "../orquestrador";
import { useEmissorAutorizado } from "./useEmissorAutorizado";
import { avaliarGateProvider, avaliarGateRede, avaliarGateSaldo, avaliarGateTitularidade } from "../gates";

function subscribeToProvider() {
  // Presença de window.ethereum não muda de forma observável — não há evento para assinar,
  // só a leitura pós-hidratação via getSnapshot (mesmo padrão de ConnectWallet.tsx).
  return () => {};
}
function getProviderSnapshot() {
  return Boolean((window as Window & { ethereum?: unknown }).ethereum);
}
function getProviderServerSnapshot() {
  // Assume presente no servidor/primeira pintura para não penalizar o caminho feliz com um
  // flash negativo — mesmo padrão de ConnectWallet.tsx.
  return true;
}

export function usePublicarOnChainGates(walletVinculada: string | null) {
  const hasProvider = useSyncExternalStore(subscribeToProvider, getProviderSnapshot, getProviderServerSnapshot);
  const connection = useConnection();

  const naRedeCerta = connection.isConnected && connection.chainId === ORQUESTRADOR_CHAIN_ID;

  const balance = useBalance({
    address: connection.address,
    chainId: ORQUESTRADOR_CHAIN_ID,
    query: { enabled: naRedeCerta },
  });

  const gasPrice = useGasPrice({
    chainId: ORQUESTRADOR_CHAIN_ID,
    // Refetch periódico: a Fase 2 mostrou o preço do gás variar de ~1 gwei a dezenas dentro da
    // mesma sessão — um valor lido uma vez ao abrir a tela pode já estar desatualizado minutos
    // depois, se o emissor demorar para revisar o checklist antes de assinar.
    query: { enabled: naRedeCerta, refetchInterval: 15_000 },
  });

  const gateAutorizado = useEmissorAutorizado(connection.address);

  const gateProvider = avaliarGateProvider(hasProvider);
  const gateRede = avaliarGateRede(connection.isConnected, connection.chainId, ORQUESTRADOR_CHAIN_ID);
  const gateSaldo = avaliarGateSaldo({
    isConnected: naRedeCerta,
    saldoWei: balance.data?.value,
    precoGasWei: gasPrice.data,
    saldoCarregando: balance.isLoading,
    saldoComErro: balance.isError,
    precoGasCarregando: gasPrice.isLoading,
    precoGasComErro: gasPrice.isError,
  });
  const gateTitularidade = avaliarGateTitularidade(connection.address, walletVinculada);

  return { connection, gateProvider, gateRede, gateSaldo, gateAutorizado, gateTitularidade };
}

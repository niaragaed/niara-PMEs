"use client";

// Hooks de leitura da oferta on-chain real (Sepolia) — nunca chamados fora de "use client".
// Todo valor monetário/de cotas trafega em bigint (unidade bruta do contrato, 18 casas) — a
// conversão para exibição (formatUnits) acontece só na UI, nunca aqui.
import { useConnection, useReadContracts } from "wagmi";
import { getOnChainContracts } from "../contracts";

const ESTADO_LABELS = ["Aberta", "EncerradaSucesso", "EncerradaFalha"] as const;
export type EstadoOferta = (typeof ESTADO_LABELS)[number];

export type OfertaOnChainTermos = {
  configurado: boolean;
  isLoading: boolean;
  estado: EstadoOferta | null;
  totalArrecadado: bigint;
  metaMinima: bigint;
  metaMaxima: bigint;
  precoPorCota: bigint;
  prazo: bigint;
  tetoPorInvestidor: bigint;
  taxaBps: bigint;
  recursosLiberados: boolean;
  mockBrlDecimals: number;
  mockBrlSymbol: string;
  participacaoTokenDecimals: number;
  participacaoTokenSymbol: string;
  refetch: () => void;
};

/**
 * Termos públicos da oferta + metadados dos dois tokens — não depende de carteira conectada.
 * `ofertaIndex` seleciona qual das várias ofertas disponíveis usar (padrão: a primeira).
 */
export function useOfertaOnChainTermos(ofertaIndex = 0): OfertaOnChainTermos {
  const contracts = getOnChainContracts(ofertaIndex);

  const { data, isLoading, refetch } = useReadContracts({
    contracts: contracts
      ? [
          { ...contracts.ofertaCaptacao, functionName: "estado" },
          { ...contracts.ofertaCaptacao, functionName: "totalArrecadado" },
          { ...contracts.ofertaCaptacao, functionName: "metaMinima" },
          { ...contracts.ofertaCaptacao, functionName: "metaMaxima" },
          { ...contracts.ofertaCaptacao, functionName: "precoPorCota" },
          { ...contracts.ofertaCaptacao, functionName: "prazo" },
          { ...contracts.ofertaCaptacao, functionName: "tetoPorInvestidor" },
          { ...contracts.ofertaCaptacao, functionName: "taxaBps" },
          { ...contracts.ofertaCaptacao, functionName: "recursosLiberados" },
          { ...contracts.mockBrl, functionName: "decimals" },
          { ...contracts.mockBrl, functionName: "symbol" },
          { ...contracts.participacaoToken, functionName: "decimals" },
          { ...contracts.participacaoToken, functionName: "symbol" },
        ]
      : [],
    query: { enabled: Boolean(contracts), refetchInterval: 15_000 },
  });

  const estadoRaw = data?.[0]?.status === "success" ? (data[0].result as number) : null;

  return {
    configurado: Boolean(contracts),
    isLoading,
    estado: estadoRaw === null ? null : ESTADO_LABELS[estadoRaw],
    totalArrecadado: data?.[1]?.status === "success" ? (data[1].result as bigint) : BigInt(0),
    metaMinima: data?.[2]?.status === "success" ? (data[2].result as bigint) : BigInt(0),
    metaMaxima: data?.[3]?.status === "success" ? (data[3].result as bigint) : BigInt(0),
    precoPorCota: data?.[4]?.status === "success" ? (data[4].result as bigint) : BigInt(0),
    prazo: data?.[5]?.status === "success" ? (data[5].result as bigint) : BigInt(0),
    tetoPorInvestidor: data?.[6]?.status === "success" ? (data[6].result as bigint) : BigInt(0),
    taxaBps: data?.[7]?.status === "success" ? (data[7].result as bigint) : BigInt(0),
    recursosLiberados: data?.[8]?.status === "success" ? (data[8].result as boolean) : false,
    mockBrlDecimals: data?.[9]?.status === "success" ? (data[9].result as number) : 18,
    mockBrlSymbol: data?.[10]?.status === "success" ? (data[10].result as string) : "mBRL",
    participacaoTokenDecimals: data?.[11]?.status === "success" ? (data[11].result as number) : 18,
    participacaoTokenSymbol: data?.[12]?.status === "success" ? (data[12].result as string) : "",
    refetch: () => void refetch(),
  };
}

export type MinhaPosicaoOnChain = {
  isLoading: boolean;
  aportado: bigint;
  jaResgatouCotas: boolean;
  jaFoiReembolsado: boolean;
  saldoMockBrl: bigint;
  allowanceMockBrl: bigint;
  saldoParticipacaoToken: bigint;
  refetch: () => void;
};

/**
 * Posição do investidor conectado nesta oferta + saldos das duas carteiras de token. Desligado
 * (todos os campos zerados) enquanto não houver carteira conectada. `ofertaIndex` seleciona
 * qual das várias ofertas disponíveis usar (padrão: a primeira).
 */
export function useMinhaPosicaoOnChain(ofertaIndex = 0): MinhaPosicaoOnChain {
  const { address, isConnected } = useConnection();
  const contracts = getOnChainContracts(ofertaIndex);
  const enabled = Boolean(contracts) && isConnected && Boolean(address);

  const { data, isLoading, refetch } = useReadContracts({
    contracts:
      contracts && address
        ? [
            { ...contracts.ofertaCaptacao, functionName: "aportadoPor", args: [address] },
            { ...contracts.ofertaCaptacao, functionName: "cotasResgatadas", args: [address] },
            { ...contracts.ofertaCaptacao, functionName: "reembolsado", args: [address] },
            { ...contracts.mockBrl, functionName: "balanceOf", args: [address] },
            {
              ...contracts.mockBrl,
              functionName: "allowance",
              args: [address, contracts.ofertaCaptacao.address],
            },
            { ...contracts.participacaoToken, functionName: "balanceOf", args: [address] },
          ]
        : [],
    query: { enabled, refetchInterval: 10_000 },
  });

  return {
    isLoading,
    aportado: data?.[0]?.status === "success" ? (data[0].result as bigint) : BigInt(0),
    jaResgatouCotas: data?.[1]?.status === "success" ? (data[1].result as boolean) : false,
    jaFoiReembolsado: data?.[2]?.status === "success" ? (data[2].result as boolean) : false,
    saldoMockBrl: data?.[3]?.status === "success" ? (data[3].result as bigint) : BigInt(0),
    allowanceMockBrl: data?.[4]?.status === "success" ? (data[4].result as bigint) : BigInt(0),
    saldoParticipacaoToken: data?.[5]?.status === "success" ? (data[5].result as bigint) : BigInt(0),
    refetch: () => void refetch(),
  };
}

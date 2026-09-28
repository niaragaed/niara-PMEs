"use client";

// Hooks de leitura da oferta on-chain real (Sepolia) — nunca chamados fora de "use client".
// Todo valor monetário/de cotas trafega em bigint (unidade bruta do contrato, 18 casas) — a
// conversão para exibição (formatUnits) acontece só na UI, nunca aqui.
import { useConnection, useReadContracts } from "wagmi";
import { getOnChainContracts, type OfertaOnChainEnderecos } from "../contracts";
import { describeOnChainError } from "../errors";

const ESTADO_LABELS = ["Aberta", "EncerradaSucesso", "EncerradaFalha"] as const;
export type EstadoOferta = (typeof ESTADO_LABELS)[number];

export type OfertaOnChainTermos = {
  configurado: boolean;
  isLoading: boolean;
  /**
   * `true` só quando TODAS as leituras abaixo terminaram com sucesso — mesmo princípio de
   * `useEmissorAutorizado` (ver CLAUDE.md, "Tela /empresa/ofertas"): nunca confundir "ainda
   * carregando"/"a leitura falhou" com "a chain respondeu isto". Enquanto `pronto` for `false`,
   * os campos abaixo podem estar no valor de fallback (0/false) — NUNCA usar para decidir um
   * investimento (gate de `investirDesabilitado` em RealOnChainInvestPanel.tsx depende disto).
   */
  pronto: boolean;
  /** Mensagem em pt-BR já traduzida (ex.: RPC fora do ar) — `null` quando não há erro. */
  errorMessage: string | null;
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

const TERMOS_CONTRACT_COUNT = 13;

/**
 * Termos públicos da oferta + metadados dos dois tokens — não depende de carteira conectada.
 * `enderecos` identifica a oferta (par token/oferta, ver contracts.ts) — `null` enquanto nenhuma
 * estiver selecionada/configurada.
 */
export function useOfertaOnChainTermos(enderecos: OfertaOnChainEnderecos | null): OfertaOnChainTermos {
  const contracts = getOnChainContracts(enderecos);

  const { data, isLoading, isError, error, refetch } = useReadContracts({
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

  // Cada uma das 13 leituras do multicall tem seu próprio `status` — um `eth_call` de RPC pode
  // "funcionar" (sem isError na query) enquanto uma chamada individual dentro dele falha
  // (`status: "failure"`, ex.: um contrato que não responde àquela função). `pronto` exige as 13
  // com sucesso, não só ausência de erro na query como um todo.
  const todasComSucesso =
    Boolean(contracts) &&
    Array.from({ length: TERMOS_CONTRACT_COUNT }, (_, i) => i).every((i) => data?.[i]?.status === "success");
  const pronto = todasComSucesso && !isLoading && !isError;

  const estadoRaw = data?.[0]?.status === "success" ? (data[0].result as number) : null;

  return {
    configurado: Boolean(contracts),
    isLoading,
    pronto,
    errorMessage: isError ? describeOnChainError(error) : null,
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
  /** Mesmo princípio de `OfertaOnChainTermos.pronto` — ver ali. */
  pronto: boolean;
  errorMessage: string | null;
  aportado: bigint;
  jaResgatouCotas: boolean;
  jaFoiReembolsado: boolean;
  saldoMockBrl: bigint;
  allowanceMockBrl: bigint;
  saldoParticipacaoToken: bigint;
  refetch: () => void;
};

const POSICAO_CONTRACT_COUNT = 6;

/**
 * Posição do investidor conectado nesta oferta + saldos das duas carteiras de token. Desligado
 * (todos os campos zerados, `pronto=false`) enquanto não houver carteira conectada. `enderecos`
 * identifica a oferta (par token/oferta, ver contracts.ts) — `null` enquanto nenhuma estiver
 * selecionada/configurada.
 */
export function useMinhaPosicaoOnChain(enderecos: OfertaOnChainEnderecos | null): MinhaPosicaoOnChain {
  const { address, isConnected } = useConnection();
  const contracts = getOnChainContracts(enderecos);
  const enabled = Boolean(contracts) && isConnected && Boolean(address);

  const { data, isLoading, isError, error, refetch } = useReadContracts({
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

  // Mesmo raciocínio de useOfertaOnChainTermos: exige as 6 leituras com status "success", não só
  // ausência de erro na query — é exatamente aqui que um allowance obsoleto/não confirmado NUNCA
  // pode ser tratado como "suficiente" por engano (incidente real, ver CLAUDE.md).
  const todasComSucesso =
    enabled && Array.from({ length: POSICAO_CONTRACT_COUNT }, (_, i) => i).every((i) => data?.[i]?.status === "success");
  const pronto = todasComSucesso && !isLoading && !isError;

  return {
    isLoading,
    pronto,
    errorMessage: isError ? describeOnChainError(error) : null,
    aportado: data?.[0]?.status === "success" ? (data[0].result as bigint) : BigInt(0),
    jaResgatouCotas: data?.[1]?.status === "success" ? (data[1].result as boolean) : false,
    jaFoiReembolsado: data?.[2]?.status === "success" ? (data[2].result as boolean) : false,
    saldoMockBrl: data?.[3]?.status === "success" ? (data[3].result as bigint) : BigInt(0),
    allowanceMockBrl: data?.[4]?.status === "success" ? (data[4].result as bigint) : BigInt(0),
    saldoParticipacaoToken: data?.[5]?.status === "success" ? (data[5].result as bigint) : BigInt(0),
    refetch: () => void refetch(),
  };
}

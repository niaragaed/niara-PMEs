"use client";

// Hooks de leitura da oferta on-chain real (Sepolia) — nunca chamados fora de "use client".
// Todo valor monetário/de cotas trafega em bigint (unidade bruta do contrato, 18 casas) — a
// conversão para exibição (formatUnits) acontece só na UI, nunca aqui.
//
// 🔴 MockBRL é lido em DOIS ESTÁGIOS, sempre — nunca de uma env var/constante global. Incidente
// real (ver CLAUDE.md, "Tela /investir/onchain"): a versão anterior destes hooks assumia um
// `MockBRL` único compartilhado por todas as ofertas; na prática, só as ofertas LEGADAS
// compartilham um MockBRL (o do env var); as ofertas self-service (`OfertaOrquestrador`) usam um
// MockBRL PRÓPRIO, diferente. 1º estágio: lê `OfertaCaptacao.moeda()` — o único jeito confiável
// de saber qual MockBRL esta oferta específica usa. 2º estágio, só depois do 1º resolver: lê
// decimals/symbol/saldo/allowance DESSE MockBRL, nunca de um endereço herdado de fora.
import { useConnection, useReadContracts } from "wagmi";
import { getMockBrlContractAt, getOnChainContracts, type OnChainOfferingAddresses } from "../contracts";
import { describeOnChainError } from "../errors";

const STATE_LABELS = ["Aberta", "EncerradaSucesso", "EncerradaFalha"] as const;
export type OfferingState = (typeof STATE_LABELS)[number];

export type OnChainOfferingTerms = {
  configured: boolean;
  isLoading: boolean;
  /**
   * `true` só quando TODAS as leituras abaixo (os dois estágios) terminaram com sucesso — mesmo
   * princípio de `useEmissorAutorizado` (ver CLAUDE.md, "Tela /empresa/ofertas"): nunca confundir
   * "ainda carregando"/"a leitura falhou" com "a chain respondeu isto". Enquanto `pronto` for
   * `false`, os campos abaixo podem estar no valor de fallback (0/false) — NUNCA usar para decidir
   * um investimento (gate de `investirDesabilitado` em RealOnChainInvestPanel.tsx depende disto).
   */
  ready: boolean;
  /** Mensagem em pt-BR já traduzida (ex.: RPC fora do ar) — `null` quando não há erro. */
  errorMessage: string | null;
  state: OfferingState | null;
  totalRaised: bigint;
  minTarget: bigint;
  maxTarget: bigint;
  pricePerShare: bigint;
  deadline: bigint;
  capPerInvestor: bigint;
  feeBps: bigint;
  fundsReleased: boolean;
  /** Endereço do MockBRL desta oferta específica, lido de `moeda()` — nunca uma constante. */
  mockBrlAddress: `0x${string}` | null;
  mockBrlDecimals: number;
  mockBrlSymbol: string;
  participationTokenDecimals: number;
  participationTokenSymbol: string;
  refetch: () => void;
};

const ESTAGIO1_CONTRACT_COUNT = 12;
const ESTAGIO2_CONTRACT_COUNT = 2;

/**
 * Termos públicos da oferta + metadados dos dois tokens — não depende de carteira conectada.
 * `enderecos` identifica a oferta (par token/oferta, ver contracts.ts) — `null` enquanto nenhuma
 * estiver selecionada/configurada.
 */
export function useOnChainOfferingTerms(addresses: OnChainOfferingAddresses | null): OnChainOfferingTerms {
  const contracts = getOnChainContracts(addresses);

  // Estágio 1: tudo que NÃO depende de saber o MockBRL ainda — inclui `moeda()` em si.
  const {
    data,
    isLoading,
    isError,
    error,
    refetch: refetchEstagio1,
  } = useReadContracts({
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
          { ...contracts.ofertaCaptacao, functionName: "moeda" },
          { ...contracts.participacaoToken, functionName: "decimals" },
          { ...contracts.participacaoToken, functionName: "symbol" },
        ]
      : [],
    query: { enabled: Boolean(contracts), refetchInterval: 15_000 },
  });

  const mockBrlAddress = data?.[9]?.status === "success" ? (data[9].result as `0x${string}`) : null;
  const mockBrlContract = mockBrlAddress ? getMockBrlContractAt(mockBrlAddress) : null;

  // Estágio 2: decimals/symbol do MockBRL DESTA oferta (endereço lido no estágio 1) — só roda
  // depois que `moeda()` resolveu.
  const {
    data: mockBrlData,
    isLoading: mockBrlIsLoading,
    isError: mockBrlIsError,
    error: mockBrlError,
    refetch: refetchEstagio2,
  } = useReadContracts({
    contracts: mockBrlContract
      ? [
          { ...mockBrlContract, functionName: "decimals" },
          { ...mockBrlContract, functionName: "symbol" },
        ]
      : [],
    query: { enabled: Boolean(mockBrlContract), refetchInterval: 15_000 },
  });

  // Cada uma das leituras de cada estágio tem seu próprio `status` — um `eth_call` de RPC pode
  // "funcionar" (sem isError na query) enquanto uma chamada individual dentro dele falha
  // (`status: "failure"`, ex.: um contrato que não responde àquela função). `pronto` exige todas
  // as leituras dos DOIS estágios com sucesso, não só ausência de erro na query como um todo.
  const stage1Complete =
    Boolean(contracts) &&
    Array.from({ length: ESTAGIO1_CONTRACT_COUNT }, (_, i) => i).every((i) => data?.[i]?.status === "success");
  const stage2Complete =
    Boolean(mockBrlContract) &&
    Array.from({ length: ESTAGIO2_CONTRACT_COUNT }, (_, i) => i).every(
      (i) => mockBrlData?.[i]?.status === "success",
    );
  const ready = stage1Complete && stage2Complete && !isLoading && !isError && !mockBrlIsLoading && !mockBrlIsError;

  const stateRaw = data?.[0]?.status === "success" ? (data[0].result as number) : null;

  return {
    configured: Boolean(contracts),
    isLoading: isLoading || mockBrlIsLoading,
    ready,
    errorMessage: isError ? describeOnChainError(error) : mockBrlIsError ? describeOnChainError(mockBrlError) : null,
    state: stateRaw === null ? null : STATE_LABELS[stateRaw],
    totalRaised: data?.[1]?.status === "success" ? (data[1].result as bigint) : BigInt(0),
    minTarget: data?.[2]?.status === "success" ? (data[2].result as bigint) : BigInt(0),
    maxTarget: data?.[3]?.status === "success" ? (data[3].result as bigint) : BigInt(0),
    pricePerShare: data?.[4]?.status === "success" ? (data[4].result as bigint) : BigInt(0),
    deadline: data?.[5]?.status === "success" ? (data[5].result as bigint) : BigInt(0),
    capPerInvestor: data?.[6]?.status === "success" ? (data[6].result as bigint) : BigInt(0),
    feeBps: data?.[7]?.status === "success" ? (data[7].result as bigint) : BigInt(0),
    fundsReleased: data?.[8]?.status === "success" ? (data[8].result as boolean) : false,
    mockBrlAddress,
    mockBrlDecimals: mockBrlData?.[0]?.status === "success" ? (mockBrlData[0].result as number) : 18,
    mockBrlSymbol: mockBrlData?.[1]?.status === "success" ? (mockBrlData[1].result as string) : "mBRL",
    participationTokenDecimals: data?.[10]?.status === "success" ? (data[10].result as number) : 18,
    participationTokenSymbol: data?.[11]?.status === "success" ? (data[11].result as string) : "",
    refetch: () => {
      void refetchEstagio1();
      void refetchEstagio2();
    },
  };
}

export type MyOnChainPosition = {
  isLoading: boolean;
  /** Mesmo princípio de `OfertaOnChainTermos.pronto` — ver ali. */
  ready: boolean;
  errorMessage: string | null;
  invested: bigint;
  alreadyRedeemedShares: boolean;
  alreadyRefunded: boolean;
  mockBrlBalance: bigint;
  allowanceMockBrl: bigint;
  participationTokenBalance: bigint;
  refetch: () => void;
};

const STAGE1_POSITION_COUNT = 4;

/**
 * Posição do investidor conectado nesta oferta + saldos das duas carteiras de token. Desligado
 * (todos os campos zerados, `pronto=false`) enquanto não houver carteira conectada. `enderecos`
 * identifica a oferta (par token/oferta, ver contracts.ts) — `null` enquanto nenhuma estiver
 * selecionada/configurada.
 *
 * Resolve seu PRÓPRIO `moeda()` (independente de `useOfertaOnChainTermos`, mesmo que as duas
 * hooks sejam usadas juntas no mesmo componente) — nunca confia num endereço de MockBRL vindo de
 * fora: é exatamente esse tipo de confiança entre hooks que já causou o incidente de allowance
 * lida contra o MockBRL errado (ver CLAUDE.md).
 */
export function useMyOnChainPosition(addresses: OnChainOfferingAddresses | null): MyOnChainPosition {
  const { address, isConnected } = useConnection();
  const contracts = getOnChainContracts(addresses);
  const baseEnabled = Boolean(contracts) && isConnected && Boolean(address);

  // Estágio 1: aportadoPor/cotasResgatadas/reembolsado (não dependem de MockBRL) + moeda() (pra
  // saber qual MockBRL consultar a seguir).
  const {
    data,
    isLoading,
    isError,
    error,
    refetch: refetchEstagio1,
  } = useReadContracts({
    contracts:
      contracts && address
        ? [
            { ...contracts.ofertaCaptacao, functionName: "aportadoPor", args: [address] },
            { ...contracts.ofertaCaptacao, functionName: "cotasResgatadas", args: [address] },
            { ...contracts.ofertaCaptacao, functionName: "reembolsado", args: [address] },
            { ...contracts.ofertaCaptacao, functionName: "moeda" },
          ]
        : [],
    query: { enabled: baseEnabled, refetchInterval: 10_000 },
  });

  const mockBrlAddress = data?.[3]?.status === "success" ? (data[3].result as `0x${string}`) : null;
  const mockBrlContract = mockBrlAddress ? getMockBrlContractAt(mockBrlAddress) : null;

  // Estágio 2: saldo/allowance/saldo de cotas — allowance é do MockBRL DESTA oferta (lido no
  // estágio 1), nunca de um endereço herdado de fora.
  const {
    data: estagio2Data,
    isLoading: estagio2Loading,
    isError: estagio2IsError,
    error: estagio2Error,
    refetch: refetchEstagio2,
  } = useReadContracts({
    contracts:
      mockBrlContract && contracts && address
        ? [
            { ...mockBrlContract, functionName: "balanceOf", args: [address] },
            { ...mockBrlContract, functionName: "allowance", args: [address, contracts.ofertaCaptacao.address] },
            { ...contracts.participacaoToken, functionName: "balanceOf", args: [address] },
          ]
        : [],
    query: { enabled: Boolean(mockBrlContract) && baseEnabled, refetchInterval: 10_000 },
  });

  const stage1Complete =
    baseEnabled &&
    Array.from({ length: STAGE1_POSITION_COUNT }, (_, i) => i).every((i) => data?.[i]?.status === "success");
  // 3 leituras no estágio 2 (balanceOf/allowance do MockBRL + balanceOf do ParticipacaoToken),
  // mas só 2 dependem do MockBRL — contadas juntas por simplicidade, todas vêm da mesma query.
  const stage2Complete =
    Boolean(mockBrlContract) &&
    baseEnabled &&
    [0, 1, 2].every((i) => estagio2Data?.[i]?.status === "success");
  const ready =
    stage1Complete && stage2Complete && !isLoading && !isError && !estagio2Loading && !estagio2IsError;

  return {
    isLoading: isLoading || estagio2Loading,
    ready,
    errorMessage: isError ? describeOnChainError(error) : estagio2IsError ? describeOnChainError(estagio2Error) : null,
    invested: data?.[0]?.status === "success" ? (data[0].result as bigint) : BigInt(0),
    alreadyRedeemedShares: data?.[1]?.status === "success" ? (data[1].result as boolean) : false,
    alreadyRefunded: data?.[2]?.status === "success" ? (data[2].result as boolean) : false,
    mockBrlBalance: estagio2Data?.[0]?.status === "success" ? (estagio2Data[0].result as bigint) : BigInt(0),
    allowanceMockBrl: estagio2Data?.[1]?.status === "success" ? (estagio2Data[1].result as bigint) : BigInt(0),
    participationTokenBalance: estagio2Data?.[2]?.status === "success" ? (estagio2Data[2].result as bigint) : BigInt(0),
    refetch: () => {
      void refetchEstagio1();
      void refetchEstagio2();
    },
  };
}

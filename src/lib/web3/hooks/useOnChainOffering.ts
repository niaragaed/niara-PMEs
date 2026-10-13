"use client";

// Read hooks for the real on-chain offering (Sepolia) — never called outside "use client". Every
// monetary/share value travels as a bigint (the contract's raw unit, 18 decimals) — the conversion
// for display (formatUnits) only happens in the UI, never here.
//
// 🔴 MockBRL is always read in TWO STAGES — never from an env var/global constant. Real incident
// (see CLAUDE.md, "/investir/onchain screen"): the previous version of these hooks assumed a
// single `MockBRL` shared by all offerings; in practice, only the LEGACY offerings share a MockBRL
// (the env var one); the self-service offerings (`OfertaOrquestrador`) use their OWN, different
// MockBRL. Stage 1: reads `OfertaCaptacao.moeda()` — the only reliable way to know which MockBRL
// this specific offering uses. Stage 2, only after stage 1 resolves: reads
// decimals/symbol/balance/allowance of THAT MockBRL, never from an address inherited from outside.
import { useConnection, useReadContracts } from "wagmi";
import { getMockBrlContractAt, getOnChainContracts, type OnChainOfferingAddresses } from "../contracts";
import { describeOnChainError } from "../errors";
import { useDictionary } from "@/lib/i18n/client";

// The contract's `Estado` enum, in order — on-chain values, not interface copy.
const STATE_LABELS = ["Aberta", "EncerradaSucesso", "EncerradaFalha"] as const;
export type OfferingState = (typeof STATE_LABELS)[number];

export type OnChainOfferingTerms = {
  configured: boolean;
  isLoading: boolean;
  /**
   * `true` only when ALL the reads below (both stages) finished successfully — the same principle
   * as `useAuthorizedIssuer` (see CLAUDE.md, "/empresa/ofertas screen"): never mistake "still
   * loading"/"the read failed" for "the chain answered this". While `ready` is `false`, the fields
   * below may hold their fallback value (0/false) — NEVER use them to decide an investment (the
   * `investDisabled` gate in RealOnChainInvestPanel.tsx depends on this).
   */
  ready: boolean;
  /** Already translated message (e.g. RPC down) — `null` when there's no error. */
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
  /** This specific offering's MockBRL address, read from `moeda()` — never a constant. */
  mockBrlAddress: `0x${string}` | null;
  mockBrlDecimals: number;
  mockBrlSymbol: string;
  participationTokenDecimals: number;
  participationTokenSymbol: string;
  refetch: () => void;
};

const STAGE1_CONTRACT_COUNT = 12;
const STAGE2_CONTRACT_COUNT = 2;

/**
 * The offering's public terms + metadata of both tokens — doesn't depend on a connected wallet.
 * `addresses` identifies the offering (token/offering pair, see contracts.ts) — `null` while none
 * is selected/configured.
 */
export function useOnChainOfferingTerms(addresses: OnChainOfferingAddresses | null): OnChainOfferingTerms {
  const contracts = getOnChainContracts(addresses);
  const messages = useDictionary().chainErrors.evm;

  // Stage 1: everything that does NOT depend on knowing the MockBRL yet — includes `moeda()` itself.
  const {
    data,
    isLoading,
    isError,
    error,
    refetch: refetchStage1,
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

  // Stage 2: decimals/symbol of THIS offering's MockBRL (address read in stage 1) — only runs once
  // `moeda()` has resolved.
  const {
    data: mockBrlData,
    isLoading: mockBrlIsLoading,
    isError: mockBrlIsError,
    error: mockBrlError,
    refetch: refetchStage2,
  } = useReadContracts({
    contracts: mockBrlContract
      ? [
          { ...mockBrlContract, functionName: "decimals" },
          { ...mockBrlContract, functionName: "symbol" },
        ]
      : [],
    query: { enabled: Boolean(mockBrlContract), refetchInterval: 15_000 },
  });

  // Each read of each stage has its own `status` — an RPC `eth_call` can "work" (no isError on
  // the query) while an individual call inside it fails (`status: "failure"`, e.g. a contract that
  // doesn't answer that function). `ready` requires every read of BOTH stages to succeed, not just
  // the absence of an error on the query as a whole.
  const stage1Complete =
    Boolean(contracts) &&
    Array.from({ length: STAGE1_CONTRACT_COUNT }, (_, i) => i).every((i) => data?.[i]?.status === "success");
  const stage2Complete =
    Boolean(mockBrlContract) &&
    Array.from({ length: STAGE2_CONTRACT_COUNT }, (_, i) => i).every(
      (i) => mockBrlData?.[i]?.status === "success",
    );
  const ready = stage1Complete && stage2Complete && !isLoading && !isError && !mockBrlIsLoading && !mockBrlIsError;

  const stateRaw = data?.[0]?.status === "success" ? (data[0].result as number) : null;

  return {
    configured: Boolean(contracts),
    isLoading: isLoading || mockBrlIsLoading,
    ready,
    errorMessage: isError
      ? describeOnChainError(error, messages)
      : mockBrlIsError
        ? describeOnChainError(mockBrlError, messages)
        : null,
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
      void refetchStage1();
      void refetchStage2();
    },
  };
}

export type MyOnChainPosition = {
  isLoading: boolean;
  /** Same principle as `OnChainOfferingTerms.ready` — see there. */
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
 * The connected investor's position in this offering + the balances of both tokens. Off (every
 * field zeroed, `ready=false`) while no wallet is connected. `addresses` identifies the offering
 * (token/offering pair, see contracts.ts) — `null` while none is selected/configured.
 *
 * Resolves its OWN `moeda()` (independently of `useOnChainOfferingTerms`, even when both hooks are
 * used together in the same component) — it never trusts a MockBRL address coming from outside:
 * that kind of trust between hooks is exactly what caused the incident of the allowance read
 * against the wrong MockBRL (see CLAUDE.md).
 */
export function useMyOnChainPosition(addresses: OnChainOfferingAddresses | null): MyOnChainPosition {
  const { address, isConnected } = useConnection();
  const contracts = getOnChainContracts(addresses);
  const baseEnabled = Boolean(contracts) && isConnected && Boolean(address);
  const messages = useDictionary().chainErrors.evm;

  // Stage 1: aportadoPor/cotasResgatadas/reembolsado (don't depend on MockBRL) + moeda() (to know
  // which MockBRL to query next).
  const {
    data,
    isLoading,
    isError,
    error,
    refetch: refetchStage1,
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

  // Stage 2: balance/allowance/share balance — the allowance is on THIS offering's MockBRL (read
  // in stage 1), never on an address inherited from outside.
  const {
    data: stage2Data,
    isLoading: stage2Loading,
    isError: stage2IsError,
    error: stage2Error,
    refetch: refetchStage2,
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
  // 3 reads in stage 2 (MockBRL balanceOf/allowance + ParticipacaoToken balanceOf), but only 2
  // depend on the MockBRL — counted together for simplicity, they all come from the same query.
  const stage2Complete =
    Boolean(mockBrlContract) &&
    baseEnabled &&
    [0, 1, 2].every((i) => stage2Data?.[i]?.status === "success");
  const ready =
    stage1Complete && stage2Complete && !isLoading && !isError && !stage2Loading && !stage2IsError;

  return {
    isLoading: isLoading || stage2Loading,
    ready,
    errorMessage: isError
      ? describeOnChainError(error, messages)
      : stage2IsError
        ? describeOnChainError(stage2Error, messages)
        : null,
    invested: data?.[0]?.status === "success" ? (data[0].result as bigint) : BigInt(0),
    alreadyRedeemedShares: data?.[1]?.status === "success" ? (data[1].result as boolean) : false,
    alreadyRefunded: data?.[2]?.status === "success" ? (data[2].result as boolean) : false,
    mockBrlBalance: stage2Data?.[0]?.status === "success" ? (stage2Data[0].result as bigint) : BigInt(0),
    allowanceMockBrl: stage2Data?.[1]?.status === "success" ? (stage2Data[1].result as bigint) : BigInt(0),
    participationTokenBalance: stage2Data?.[2]?.status === "success" ? (stage2Data[2].result as bigint) : BigInt(0),
    refetch: () => {
      void refetchStage1();
      void refetchStage2();
    },
  };
}

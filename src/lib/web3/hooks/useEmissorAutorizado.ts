"use client";

// Leitura do gate 4 da Fase 3 (ver PLANO_FASE_3_PUBLICACAO_ONCHAIN.md) — endereço em
// `emissoresAutorizados` no OfertaOrquestrador. Independe de carteira conectada: lê qualquer
// endereço passado como parâmetro, sempre na rede fixada em `ORQUESTRADOR_CHAIN_ID` (nunca a
// rede atual de uma wallet, se houver uma conectada) — apontar para outra rede exigiria editar
// aquela constante, não é um efeito colateral de qual chain o MetaMask do usuário está.
import { useReadContract } from "wagmi";
import { getOrquestradorContract, ORQUESTRADOR_CHAIN_ID } from "../orquestrador";
import { describeOnChainError } from "../errors";

export type EmissorAutorizadoResult = {
  /** `false` só quando `NEXT_PUBLIC_ORQUESTRADOR_ADDRESS` está ausente/mal formado. */
  contratoConfigurado: boolean;
  /**
   * `null` enquanto carregando ou se a leitura falhou — nunca um `false` "inventado" quando a
   * causa real é a leitura não ter acontecido. Só é `true`/`false` quando a chain respondeu.
   */
  autorizado: boolean | null;
  isLoading: boolean;
  /** Mensagem em pt-BR já traduzida (ex.: RPC fora do ar) — `null` quando não há erro. */
  errorMessage: string | null;
};

export function useEmissorAutorizado(endereco: `0x${string}` | undefined): EmissorAutorizadoResult {
  const contract = getOrquestradorContract();

  const { data, isLoading, isError, error } = useReadContract({
    address: contract?.address,
    abi: contract?.abi,
    chainId: ORQUESTRADOR_CHAIN_ID,
    functionName: "emissoresAutorizados",
    args: endereco ? [endereco] : undefined,
    query: { enabled: Boolean(contract && endereco) },
  });
  // O ABI garante `outputs: [{ type: "bool" }]` (ver abis/ofertaOrquestrador.ts) — a
  // inferência de tipo do wagmi cai para `{}` quando address/abi são opcionais (caso
  // `contract` seja `null`), então o valor é sempre booleano de fato; só o tipo estático não
  // consegue provar isso sozinho aqui.
  const autorizado = data as boolean | undefined;

  return {
    contratoConfigurado: contract !== null,
    autorizado: isError ? null : (autorizado ?? null),
    isLoading,
    errorMessage: isError ? describeOnChainError(error) : null,
  };
}

"use client";

// Leitura de uma oferta do niara-pmes-solana e da posição da carteira conectada — equivalente de
// src/lib/web3/hooks/useOfertaOnChain.ts. Mesma regra de ouro (ver CLAUDE.md, incidentes do
// approve): `pronto` só é true quando TODAS as leituras terminaram com sucesso; enquanto isso a UI
// não decide nada com valores de fallback.
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import {
  minutes,
  solanaConnection,
  readSolanaOffering,
  readSolanaPosition,
  pdaMintMbrl,
  solanaTokenBalance,
  type SolanaOffering,
  type SolanaPosition,
} from "../program";
import { describeSolanaError } from "../errors";

const INTERVAL_MS = 15_000;

export type SolanaOfferingRead = {
  offering: SolanaOffering | null;
  /** A conta da oferta não existe no programa (endereço errado ou programa diferente). */
  nonexistent: boolean;
  position: SolanaPosition;
  mbrlBalance: bigint;
  shareBalance: bigint;
  ready: boolean;
  errorMessage: string | null;
  refetch: () => void;
};

export function useSolanaOffering(address: string, investor: string | null): SolanaOfferingRead {
  const connection = useMemo(() => solanaConnection(), []);

  const terms = useQuery({
    queryKey: ["solana-oferta", address],
    queryFn: () => readSolanaOffering(connection, address),
    refetchInterval: INTERVAL_MS,
  });

  const shareMint = terms.data?.shareMint ?? null;
  const position = useQuery({
    queryKey: ["solana-posicao", address, investor, shareMint],
    enabled: Boolean(investor && shareMint),
    queryFn: async () => {
      const owner = new PublicKey(investor as string);
      const [p, mbrlBalance, shareBalance] = await Promise.all([
        readSolanaPosition(connection, address, investor as string),
        solanaTokenBalance(connection, minutes(owner, pdaMintMbrl())),
        solanaTokenBalance(connection, minutes(owner, new PublicKey(shareMint as string))),
      ]);
      return { position: p, mbrlBalance, shareBalance };
    },
    refetchInterval: INTERVAL_MS,
  });

  const error = terms.error ?? position.error;
  const zero = BigInt(0);

  return {
    offering: terms.data ?? null,
    nonexistent: terms.isSuccess && terms.data === null,
    position: position.data?.position ?? { invested: zero, sharesRedeemed: false, refunded: false },
    mbrlBalance: position.data?.mbrlBalance ?? zero,
    shareBalance: position.data?.shareBalance ?? zero,
    ready: terms.isSuccess && Boolean(terms.data) && (!investor || position.isSuccess),
    errorMessage: error ? describeSolanaError(error) : null,
    refetch: () => {
      void terms.refetch();
      void position.refetch();
    },
  };
}

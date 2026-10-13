"use client";

// Reads a niara-pmes-solana offering and the connected wallet's position — the equivalent of
// src/lib/web3/hooks/useOfertaOnChain.ts. Same golden rule (see CLAUDE.md, the approve incidents):
// `ready` is only true when ALL the reads finished successfully; until then the UI decides nothing
// with fallback values.
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
import { useDictionary } from "@/lib/i18n/client";

const INTERVAL_MS = 15_000;

export type SolanaOfferingRead = {
  offering: SolanaOffering | null;
  /** The offering account doesn't exist in the program (wrong address or a different program). */
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
  const messages = useDictionary().chainErrors.solana;

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
    errorMessage: error ? describeSolanaError(error, messages) : null,
    refetch: () => {
      void terms.refetch();
      void position.refetch();
    },
  };
}

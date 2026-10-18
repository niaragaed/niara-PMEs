"use client";

// Generic executor for a niara-pmes-solana transaction with the same status cycle as the Sepolia
// actions (useOnChainActions.ts): signing → confirming → success/error. "success" only after the
// real confirmation on the network — never on signing.
import { useCallback, useMemo, useState } from "react";
import type { Connection, Transaction } from "@solana/web3.js";
import { solanaConnection } from "../program";
import { signAndSend } from "../phantom";
import { describeSolanaError } from "../errors";
import { useDictionary } from "@/lib/i18n/client";

export type SolanaActionStatus = "idle" | "signing" | "confirming" | "success" | "error";

export function useSolanaAction() {
  const connection = useMemo(() => solanaConnection(), []);
  const messages = useDictionary().chainErrors.solana;
  const [status, setStatus] = useState<SolanaActionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const execute = useCallback(
    async (build: (connection: Connection) => Promise<Transaction>): Promise<string | null> => {
      setStatus("signing");
      setErrorMessage(null);
      setSignature(null);
      try {
        const tx = await build(connection);
        const sig = await signAndSend(connection, tx, (s) => {
          setSignature(s);
          setStatus("confirming");
        });
        setStatus("success");
        return sig;
      } catch (error) {
        setErrorMessage(describeSolanaError(error, messages));
        setStatus("error");
        return null;
      }
    },
    [connection, messages],
  );

  const busy = status === "signing" || status === "confirming";
  return { status, errorMessage, signature, busy, execute };
}

"use client";

// Executor genérico de uma transação do niara-pmes-solana com o mesmo ciclo de status das ações
// da Sepolia (useOnChainActions.ts): assinando → confirmando → sucesso/erro. "sucesso" só depois
// da confirmação real na rede — nunca ao assinar.
import { useCallback, useMemo, useState } from "react";
import type { Connection, Transaction } from "@solana/web3.js";
import { solanaConnection } from "../program";
import { signAndSend } from "../phantom";

export type SolanaActionStatus = "idle" | "assinando" | "confirmando" | "sucesso" | "erro";

export function useSolanaAction() {
  const connection = useMemo(() => solanaConnection(), []);
  const [status, setStatus] = useState<SolanaActionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const execute = useCallback(
    async (build: (connection: Connection) => Promise<Transaction>): Promise<string | null> => {
      setStatus("assinando");
      setErrorMessage(null);
      setSignature(null);
      try {
        const tx = await build(connection);
        const sig = await signAndSend(connection, tx, (s) => {
          setSignature(s);
          setStatus("confirmando");
        });
        setStatus("sucesso");
        return sig;
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : String(error));
        setStatus("erro");
        return null;
      }
    },
    [connection],
  );

  const busy = status === "assinando" || status === "confirmando";
  return { status, errorMessage, signature, busy, execute };
}

"use client";

// Executor genérico de uma transação do niara-pmes-solana com o mesmo ciclo de status das ações
// da Sepolia (useOnChainActions.ts): assinando → confirmando → sucesso/erro. "sucesso" só depois
// da confirmação real na rede — nunca ao assinar.
import { useCallback, useMemo, useState } from "react";
import type { Connection, Transaction } from "@solana/web3.js";
import { conexaoSolana } from "../program";
import { assinarEEnviar } from "../phantom";

export type StatusAcaoSolana = "idle" | "assinando" | "confirmando" | "sucesso" | "erro";

export function useAcaoSolana() {
  const connection = useMemo(() => conexaoSolana(), []);
  const [status, setStatus] = useState<StatusAcaoSolana>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [assinatura, setAssinatura] = useState<string | null>(null);

  const executar = useCallback(
    async (montar: (connection: Connection) => Promise<Transaction>): Promise<string | null> => {
      setStatus("assinando");
      setErrorMessage(null);
      setAssinatura(null);
      try {
        const tx = await montar(connection);
        const sig = await assinarEEnviar(connection, tx, (s) => {
          setAssinatura(s);
          setStatus("confirmando");
        });
        setStatus("sucesso");
        return sig;
      } catch (erro) {
        setErrorMessage(erro instanceof Error ? erro.message : String(erro));
        setStatus("erro");
        return null;
      }
    },
    [connection],
  );

  const ocupado = status === "assinando" || status === "confirmando";
  return { status, errorMessage, assinatura, ocupado, executar };
}

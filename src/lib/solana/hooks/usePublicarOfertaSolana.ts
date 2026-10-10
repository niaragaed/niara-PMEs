"use client";

// Publicação self-service da oferta na Solana Devnet — par de usePublicarOfertaOnChain.ts (Sepolia).
// Ordem (a assinatura da transação na Solana já existe antes do envio, então dá para registrar a
// tentativa ANTES de qualquer coisa ir para a rede):
//   1. lê o Emissor no programa (índice da próxima oferta = seed do endereço);
//   2. simula e pede a assinatura na Phantom (nada enviado ainda);
//   3. registra a tentativa no servidor com a assinatura — se falhar, PARA: nada foi enviado;
//   4. envia e espera a confirmação;
//   5. pede ao servidor para ler a transação e a conta da oferta na rede e gravar o resultado.
// Nunca mostra "publicada" antes do passo 5 voltar "confirmada".
import { useCallback, useMemo, useState } from "react";
import { conexaoSolana, lerEmissorSolana } from "../program";
import { txCriarOferta, type ParametrosCriarOferta } from "../instrucoes";
import { enviarEConfirmar, simularEAssinar, useCarteiraSolana } from "../phantom";
import { confirmarPublicacaoSolana, registrarTentativaSolana } from "@/app/empresa/ofertas/solana-actions";
import type { PublicarStatus } from "@/lib/web3/hooks/usePublicarOfertaOnChain";

/** Mesmos estados da Sepolia; `txHash` aqui é a assinatura base58 da transação. */
export type PublicarSolanaState = {
  status: PublicarStatus;
  txHash: string | null;
  errorMessage: string | null;
  contractAddress: string | null;
  tokenAddress: string | null;
};

const IDLE: PublicarSolanaState = { status: "idle", txHash: null, errorMessage: null, contractAddress: null, tokenAddress: null };

export type PublicarSolanaArgs = Omit<ParametrosCriarOferta, "prazoUnix"> & { offeringId: string; windowDays: number };

export function usePublicarOfertaSolana() {
  const [state, setState] = useState<PublicarSolanaState>(IDLE);
  const connection = useMemo(() => conexaoSolana(), []);
  const carteira = useCarteiraSolana();

  const publicar = useCallback(
    async (args: PublicarSolanaArgs) => {
      const emissorWallet = carteira.endereco;
      if (!emissorWallet) {
        setState({ ...IDLE, status: "erro", errorMessage: "Conecte a carteira Solana (Phantom) para publicar." });
        return;
      }

      setState({ ...IDLE, status: "assinando" });
      const prazoUnix = Math.floor(Date.now() / 1000) + args.windowDays * 24 * 60 * 60;

      let assinada;
      try {
        const emissor = await lerEmissorSolana(connection, emissorWallet);
        if (!emissor?.autorizado) throw new Error("Esta carteira não está autorizada como emissora no programa niara-pmes-solana.");
        const { tx } = await txCriarOferta(connection, emissorWallet, emissor.totalOfertas, {
          nome: args.nome,
          simbolo: args.simbolo,
          empresa: args.empresa,
          cnpjRefHex: args.cnpjRefHex,
          serie: args.serie,
          metaMinima: args.metaMinima,
          metaMaxima: args.metaMaxima,
          precoPorCota: args.precoPorCota,
          prazoUnix,
        });
        assinada = await simularEAssinar(connection, tx);
      } catch (erro) {
        setState({ ...IDLE, status: "erro", errorMessage: erro instanceof Error ? erro.message : String(erro) });
        return;
      }

      const sig = assinada.assinatura;
      setState({ ...IDLE, status: "registrando", txHash: sig });
      const reg = await registrarTentativaSolana({ offeringId: args.offeringId, assinatura: sig, prazoUnixSeconds: prazoUnix });
      if (reg.status === "error") {
        // Nada foi enviado à rede — a assinatura simplesmente não é usada.
        setState({ ...IDLE, status: "erro", errorMessage: reg.message });
        return;
      }

      setState({ ...IDLE, status: "confirmando", txHash: sig });
      try {
        await enviarEConfirmar(connection, assinada);
      } catch (erro) {
        // A tentativa já está registrada (sync_status='pendente'): a reconciliação resolve depois —
        // inclusive o caso "não chegou à rede", que volta a oferta para 'nao_onchain' sozinho.
        setState({ ...IDLE, status: "pendente", txHash: sig, errorMessage: erro instanceof Error ? erro.message : String(erro) });
        return;
      }

      const conf = await confirmarPublicacaoSolana(args.offeringId);
      const base = { ...IDLE, txHash: sig };
      if (conf.status === "confirmada") {
        setState({ ...base, status: "confirmada", contractAddress: conf.contractAddress, tokenAddress: conf.tokenAddress });
      } else if (conf.status === "pendente") {
        setState({ ...base, status: "pendente" });
      } else if (conf.status === "revertida") {
        setState({ ...base, status: "revertida", errorMessage: conf.motivo });
      } else if (conf.status === "divergente") {
        setState({ ...base, status: "divergente", errorMessage: conf.motivo });
      } else {
        setState({ ...base, status: "erro", errorMessage: conf.message });
      }
    },
    [carteira.endereco, connection],
  );

  return { ...state, publicar };
}

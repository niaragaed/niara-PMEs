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
import { solanaConnection, readSolanaIssuer } from "../program";
import { txCreateOffering, type CreateOfferingParams } from "../instrucoes";
import { sendAndConfirm, simulateAndSign, useSolanaWallet } from "../phantom";
import { confirmPublicationSolana, registerAttemptSolana } from "@/app/empresa/ofertas/solana-actions";
import type { PublishStatus } from "@/lib/web3/hooks/usePublicarOfertaOnChain";

/** Mesmos estados da Sepolia; `txHash` aqui é a assinatura base58 da transação. */
export type PublishSolanaState = {
  status: PublishStatus;
  txHash: string | null;
  errorMessage: string | null;
  contractAddress: string | null;
  tokenAddress: string | null;
};

const IDLE: PublishSolanaState = { status: "idle", txHash: null, errorMessage: null, contractAddress: null, tokenAddress: null };

export type PublishSolanaArgs = Omit<CreateOfferingParams, "prazoUnix"> & { offeringId: string; windowDays: number };

export function usePublishSolanaOffering() {
  const [state, setState] = useState<PublishSolanaState>(IDLE);
  const connection = useMemo(() => solanaConnection(), []);
  const wallet = useSolanaWallet();

  const publish = useCallback(
    async (args: PublishSolanaArgs) => {
      const issuerWallet = wallet.address;
      if (!issuerWallet) {
        setState({ ...IDLE, status: "erro", errorMessage: "Conecte a carteira Solana (Phantom) para publicar." });
        return;
      }

      setState({ ...IDLE, status: "assinando" });
      const deadlineUnix = Math.floor(Date.now() / 1000) + args.windowDays * 24 * 60 * 60;

      let signed;
      try {
        const issuer = await readSolanaIssuer(connection, issuerWallet);
        if (!issuer?.authorized) throw new Error("Esta carteira não está autorizada como emissora no programa niara-pmes-solana.");
        const { tx } = await txCreateOffering(connection, issuerWallet, issuer.totalOfferings, {
          name: args.name,
          symbol: args.symbol,
          company: args.company,
          cnpjRefHex: args.cnpjRefHex,
          series: args.series,
          minTarget: args.minTarget,
          maxTarget: args.maxTarget,
          pricePerShare: args.pricePerShare,
          prazoUnix: deadlineUnix,
        });
        signed = await simulateAndSign(connection, tx);
      } catch (error) {
        setState({ ...IDLE, status: "erro", errorMessage: error instanceof Error ? error.message : String(error) });
        return;
      }

      const sig = signed.signature;
      setState({ ...IDLE, status: "registrando", txHash: sig });
      const reg = await registerAttemptSolana({
        offeringId: args.offeringId,
        assinatura: sig,
        prazoUnixSeconds: deadlineUnix,
        ultimoBlocoValido: signed.lastValidBlockHeight,
      });
      if (reg.status === "error") {
        // Nada foi enviado à rede — a assinatura simplesmente não é usada.
        setState({ ...IDLE, status: "erro", errorMessage: reg.message });
        return;
      }

      setState({ ...IDLE, status: "confirmando", txHash: sig });
      try {
        await sendAndConfirm(connection, signed);
      } catch (error) {
        // A tentativa já está registrada (sync_status='pendente'): a reconciliação resolve depois —
        // inclusive o caso "não chegou à rede", que volta a oferta para 'nao_onchain' sozinho.
        setState({ ...IDLE, status: "pendente", txHash: sig, errorMessage: error instanceof Error ? error.message : String(error) });
        return;
      }

      const conf = await confirmPublicationSolana(args.offeringId);
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
    [wallet.address, connection],
  );

  return { ...state, publicar: publish };
}

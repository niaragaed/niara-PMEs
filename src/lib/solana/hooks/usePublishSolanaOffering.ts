"use client";

// Self-service publication of the offering on Solana Devnet — the counterpart of
// usePublishOfferingOnChain.ts (Sepolia). Order (on Solana the transaction signature exists before
// sending, so the attempt can be recorded BEFORE anything goes to the network):
//   1. reads the Emissor account in the program (index of the next offering = the address seed);
//   2. simulates and asks Phantom for the signature (nothing sent yet);
//   3. records the attempt on the server with the signature — if that fails, it STOPS: nothing
//      was sent;
//   4. sends and waits for confirmation;
//   5. asks the server to read the transaction and the offering account on the network and record
//      the result.
// Never shows "published" before step 5 comes back "confirmada".
import { useCallback, useMemo, useState } from "react";
import { solanaConnection, readSolanaIssuer } from "../program";
import { txCreateOffering, type CreateOfferingParams } from "../instructions";
import { sendAndConfirm, simulateAndSign, useSolanaWallet } from "../phantom";
import { confirmPublicationSolana, registerAttemptSolana } from "@/app/empresa/ofertas/solana-actions";
import type { PublishStatus } from "@/lib/web3/hooks/usePublishOfferingOnChain";
import { describeSolanaError } from "../errors";
import { useDictionary } from "@/lib/i18n/client";

/** Same states as Sepolia; `txHash` here is the transaction's base58 signature. */
export type PublishSolanaState = {
  status: PublishStatus;
  txHash: string | null;
  errorMessage: string | null;
  contractAddress: string | null;
  tokenAddress: string | null;
};

const IDLE: PublishSolanaState = { status: "idle", txHash: null, errorMessage: null, contractAddress: null, tokenAddress: null };

export type PublishSolanaArgs = Omit<CreateOfferingParams, "deadlineUnix"> & { offeringId: string; windowDays: number };

export function usePublishSolanaOffering() {
  const [state, setState] = useState<PublishSolanaState>(IDLE);
  const connection = useMemo(() => solanaConnection(), []);
  const wallet = useSolanaWallet();
  const messages = useDictionary().chainErrors.solana;

  const publish = useCallback(
    async (args: PublishSolanaArgs) => {
      const issuerWallet = wallet.address;
      if (!issuerWallet) {
        setState({ ...IDLE, status: "error", errorMessage: messages.notConnectedPublish });
        return;
      }

      setState({ ...IDLE, status: "signing" });
      const deadlineUnix = Math.floor(Date.now() / 1000) + args.windowDays * 24 * 60 * 60;

      let signed;
      try {
        const issuer = await readSolanaIssuer(connection, issuerWallet);
        if (!issuer?.authorized) {
          setState({ ...IDLE, status: "error", errorMessage: messages.issuerNotAuthorized });
          return;
        }
        const { tx } = await txCreateOffering(connection, issuerWallet, issuer.totalOfferings, {
          name: args.name,
          symbol: args.symbol,
          company: args.company,
          cnpjRefHex: args.cnpjRefHex,
          series: args.series,
          minTarget: args.minTarget,
          maxTarget: args.maxTarget,
          pricePerShare: args.pricePerShare,
          deadlineUnix,
        });
        signed = await simulateAndSign(connection, tx);
      } catch (error) {
        setState({ ...IDLE, status: "error", errorMessage: describeSolanaError(error, messages) });
        return;
      }

      const sig = signed.signature;
      setState({ ...IDLE, status: "registering", txHash: sig });
      const reg = await registerAttemptSolana({
        offeringId: args.offeringId,
        signature: sig,
        deadlineUnixSeconds: deadlineUnix,
        lastValidBlockHeight: signed.lastValidBlockHeight,
      });
      if (reg.status === "error") {
        // Nothing was sent to the network — the signature simply isn't used.
        setState({ ...IDLE, status: "error", errorMessage: reg.message });
        return;
      }

      setState({ ...IDLE, status: "confirming", txHash: sig });
      try {
        await sendAndConfirm(connection, signed);
      } catch (error) {
        // The attempt is already recorded (sync_status='pendente'): the reconciliation resolves it
        // later — including the "never reached the network" case, which sends the offering back to
        // 'nao_onchain' on its own.
        setState({ ...IDLE, status: "pendente", txHash: sig, errorMessage: describeSolanaError(error, messages) });
        return;
      }

      const conf = await confirmPublicationSolana(args.offeringId);
      const base = { ...IDLE, txHash: sig };
      if (conf.status === "confirmada") {
        setState({ ...base, status: "confirmada", contractAddress: conf.contractAddress, tokenAddress: conf.tokenAddress });
      } else if (conf.status === "pendente") {
        setState({ ...base, status: "pendente" });
      } else if (conf.status === "reverted") {
        setState({ ...base, status: "reverted", errorMessage: conf.reason });
      } else if (conf.status === "divergente") {
        setState({ ...base, status: "divergente", errorMessage: conf.reason });
      } else {
        setState({ ...base, status: "error", errorMessage: conf.message });
      }
    },
    [wallet.address, connection, messages],
  );

  return { ...state, publish };
}

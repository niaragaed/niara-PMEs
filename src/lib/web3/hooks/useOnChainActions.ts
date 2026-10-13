"use client";

// On-chain write actions (Sepolia) — MockBRL mint (self-service faucet), invest
// (approve -> aportar), close the offering and redeem shares. Each hook exposes its own explicit
// status (it never shows "success" before the on-chain confirmation, see this project's
// CLAUDE.md) and translates any error via describeOnChainError before handing it to the UI.
import { useCallback, useState } from "react";
import { useConnection, usePublicClient, useWriteContract } from "wagmi";
import { getMockBrlContractAt, getOnChainContracts, type OnChainOfferingAddresses } from "../contracts";
import { describeOnChainError } from "../errors";
import { useDictionary } from "@/lib/i18n/client";

export type SimpleTxStatus = "idle" | "signing" | "confirming" | "success" | "error";

export type SimpleTxState = {
  status: SimpleTxStatus;
  errorMessage: string | null;
};

const IDLE: SimpleTxState = { status: "idle", errorMessage: null };

/**
 * MockBRL.mint is public and unrestricted (a test mock) — any connected wallet can mint a balance
 * for itself, without depending on any admin wallet.
 *
 * `addresses` identifies the offering the balance is being minted for — needed because MockBRL
 * is no longer a global constant (see CLAUDE.md, the per-offering MockBRL incident): each offering
 * can have its own MockBRL (`OfertaCaptacao.moeda()`), resolved on-chain in here, never
 * inherited from another hook nor from an env var.
 */
export function useMintMockBrl(addresses: OnChainOfferingAddresses | null) {
  const [state, setState] = useState<SimpleTxState>(IDLE);
  const { address } = useConnection();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const messages = useDictionary().chainErrors.evm;

  const mint = useCallback(
    async (amount: bigint) => {
      const contracts = getOnChainContracts(addresses);
      if (!contracts || !address || !publicClient) return;

      setState({ status: "signing", errorMessage: null });
      try {
        const currencyAddress = (await publicClient.readContract({
          ...contracts.ofertaCaptacao,
          functionName: "moeda",
        })) as `0x${string}`;
        const mockBrl = getMockBrlContractAt(currencyAddress);

        const hash = await writeContractAsync({
          ...mockBrl,
          functionName: "mint",
          args: [address, amount],
        });
        setState({ status: "confirming", errorMessage: null });
        await publicClient.waitForTransactionReceipt({ hash });
        setState({ status: "success", errorMessage: null });
      } catch (error) {
        setState({ status: "error", errorMessage: describeOnChainError(error, messages) });
      }
    },
    [address, publicClient, writeContractAsync, addresses, messages],
  );

  const reset = useCallback(() => setState(IDLE), []);

  return { ...state, mint, reset };
}

export type InvestStatus =
  | "idle"
  | "checking-allowance"
  | "signing-approve"
  | "confirming-approve"
  | "simulating-invest"
  | "signing-invest"
  | "confirming-invest"
  | "success"
  | "error";

export type InvestState = {
  status: InvestStatus;
  errorMessage: string | null;
};

/**
 * Full investment flow: checks the current MockBRL allowance against `value`; only calls
 * `approve` when it's insufficient (it never asks for approval again if there's already enough
 * allowance); only then calls `aportar`. `value` must already be computed as
 * `shareCount * pricePerShare` (an exact multiple — see OfertaCaptacao.aportar).
 *
 * 🔴 Real incident fixed here (1): `currentAllowance` used to come from outside, from the read
 * hook (`useMyOnChainPosition`, via React state) — and it could be STALE on a second attempt
 * right after the first one failed (e.g. `approve` rejected with "nonce too low" in the wallet):
 * the `refetch()` fired after the failure is async and isn't awaited before the button is
 * re-enabled, so a quick click right after could inherit a `currentAllowance` from before the
 * previous attempt, decide (wrongly) that the allowance was already enough, skip the whole
 * `approve` and go straight to `aportar` — which reverted for genuinely insufficient allowance
 * (and, since `criarOfertaCompleta`/`aportar` have no fixed gas here, MetaMask can't even
 * estimate a call that reverts, hence the absurd gas again — the same class of symptom already
 * documented in CLAUDE.md). Fixed by reading the allowance **directly from the chain, now,
 * inside this function** — never again a value inherited from outside, which can be outdated for
 * any reason (refetch timing, RPC, whatever).
 *
 * 🔴 Real incident fixed here (2), the root cause of the same symptom: the MockBRL itself must
 * never come from outside either — it's resolved from `OfertaCaptacao.moeda()`, read on-chain,
 * from the offering ITSELF, right before deciding on the approve. Before, `contracts.mockBrl`
 * came from a global constant (`NEXT_PUBLIC_MOCKBRL_ADDRESS`) — right by coincidence for the 10
 * legacy offerings (which do share that MockBRL, confirmed via `cast call`), but WRONG for any
 * self-service offering (`OfertaOrquestrador`), which uses its own, different MockBRL. The
 * `approve` was mined successfully against the wrong MockBRL; the allowance on the real offering
 * stayed zero; `aportar` always reverted with `ERC20InsufficientAllowance`, even right after an
 * apparently successful approve. See CLAUDE.md for the full incident.
 */
export function useInvestOnChain(addresses: OnChainOfferingAddresses | null) {
  const [state, setState] = useState<InvestState>({ status: "idle", errorMessage: null });
  const { address } = useConnection();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const messages = useDictionary().chainErrors.evm;

  const invest = useCallback(
    async (value: bigint) => {
      const contracts = getOnChainContracts(addresses);
      if (!contracts || !publicClient || !address) return;

      try {
        setState({ status: "checking-allowance", errorMessage: null });
        const currencyAddress = (await publicClient.readContract({
          ...contracts.ofertaCaptacao,
          functionName: "moeda",
        })) as `0x${string}`;
        const mockBrl = getMockBrlContractAt(currencyAddress);

        const currentAllowance = (await publicClient.readContract({
          ...mockBrl,
          functionName: "allowance",
          args: [address, contracts.ofertaCaptacao.address],
        })) as bigint;

        if (currentAllowance < value) {
          setState({ status: "signing-approve", errorMessage: null });
          const approveHash = await writeContractAsync({
            ...mockBrl,
            functionName: "approve",
            args: [contracts.ofertaCaptacao.address, value],
          });
          setState({ status: "confirming-approve", errorMessage: null });
          const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
          // The approval was MINED (it didn't throw), but it may have reverted — checking the
          // status is mandatory here, for the same reason confirmPublication() checks
          // receipt.status on the server side: a receipt existing doesn't mean it worked.
          if (approveReceipt.status === "reverted") {
            setState({ status: "error", errorMessage: messages.approveReverted });
            return;
          }
        }

        // 🔴 Final safeguard, independent of the root cause: never ask for a signature on
        // something we already know will revert. Simulates the SAME call we're about to ask to
        // sign — if it reverts, decodes the real reason (describeOnChainError, the usual
        // translation) and stops here, without ever calling writeContractAsync. This kills the
        // whole class of the "absurd gas / MetaMask can't estimate" symptom, not only the cause
        // already fixed above (stale allowance) — it holds even if the cause is a different one
        // next time.
        setState({ status: "simulating-invest", errorMessage: null });
        try {
          await publicClient.simulateContract({
            ...contracts.ofertaCaptacao,
            functionName: "aportar",
            args: [value],
            account: address,
          });
        } catch (simError) {
          setState({ status: "error", errorMessage: describeOnChainError(simError, messages) });
          return;
        }

        setState({ status: "signing-invest", errorMessage: null });
        const investHash = await writeContractAsync({
          ...contracts.ofertaCaptacao,
          functionName: "aportar",
          args: [value],
        });
        setState({ status: "confirming-invest", errorMessage: null });
        await publicClient.waitForTransactionReceipt({ hash: investHash });

        setState({ status: "success", errorMessage: null });
      } catch (error) {
        setState({ status: "error", errorMessage: describeOnChainError(error, messages) });
      }
    },
    [address, publicClient, writeContractAsync, addresses, messages],
  );

  const reset = useCallback(() => setState({ status: "idle", errorMessage: null }), []);

  return { ...state, invest, reset };
}

/**
 * `encerrar()` is permissionless — any connected wallet can call it as soon as the offering is
 * eligible (deadline reached, or total raised == exact maximum target). `addresses` identifies
 * the offering (token/offering pair, see contracts.ts).
 */
export function useCloseOffering(addresses: OnChainOfferingAddresses | null) {
  const [state, setState] = useState<SimpleTxState>(IDLE);
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const messages = useDictionary().chainErrors.evm;

  const close = useCallback(async () => {
    const contracts = getOnChainContracts(addresses);
    if (!contracts || !publicClient) return;

    setState({ status: "signing", errorMessage: null });
    try {
      const hash = await writeContractAsync({ ...contracts.ofertaCaptacao, functionName: "encerrar" });
      setState({ status: "confirming", errorMessage: null });
      await publicClient.waitForTransactionReceipt({ hash });
      setState({ status: "success", errorMessage: null });
    } catch (error) {
      setState({ status: "error", errorMessage: describeOnChainError(error, messages) });
    }
  }, [publicClient, writeContractAsync, addresses, messages]);

  const reset = useCallback(() => setState(IDLE), []);

  return { ...state, close, reset };
}

/**
 * `resgatarCotas()` is a pull, once per investor, only after `EncerradaSucesso` — independent of
 * `liberarParaEmissor` (see OfertaCaptacao.sol, checked before settling this flow). `addresses`
 * identifies the offering (token/offering pair, see contracts.ts).
 */
export function useRedeemShares(addresses: OnChainOfferingAddresses | null) {
  const [state, setState] = useState<SimpleTxState>(IDLE);
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const messages = useDictionary().chainErrors.evm;

  const redeem = useCallback(async () => {
    const contracts = getOnChainContracts(addresses);
    if (!contracts || !publicClient) return;

    setState({ status: "signing", errorMessage: null });
    try {
      const hash = await writeContractAsync({ ...contracts.ofertaCaptacao, functionName: "resgatarCotas" });
      setState({ status: "confirming", errorMessage: null });
      await publicClient.waitForTransactionReceipt({ hash });
      setState({ status: "success", errorMessage: null });
    } catch (error) {
      setState({ status: "error", errorMessage: describeOnChainError(error, messages) });
    }
  }, [publicClient, writeContractAsync, addresses, messages]);

  const reset = useCallback(() => setState(IDLE), []);

  return { ...state, redeem, reset };
}

/**
 * `liberarParaEmissor()` is a pull, once, permissionless, only after `EncerradaSucesso` — it
 * transfers the amount raised (minus the fee, if `taxaBps > 0`) to the issuer and the fee to
 * `protocoloWallet` (see OfertaCaptacao.sol). Without calling this function, the money stays
 * locked in escrow forever — it's the trigger that actually moves the platform's fee revenue,
 * when there is any. `addresses` identifies the offering (token/offering pair, see contracts.ts).
 */
export function useReleaseToIssuer(addresses: OnChainOfferingAddresses | null) {
  const [state, setState] = useState<SimpleTxState>(IDLE);
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const messages = useDictionary().chainErrors.evm;

  const release = useCallback(async () => {
    const contracts = getOnChainContracts(addresses);
    if (!contracts || !publicClient) return;

    setState({ status: "signing", errorMessage: null });
    try {
      const hash = await writeContractAsync({ ...contracts.ofertaCaptacao, functionName: "liberarParaEmissor" });
      setState({ status: "confirming", errorMessage: null });
      await publicClient.waitForTransactionReceipt({ hash });
      setState({ status: "success", errorMessage: null });
    } catch (error) {
      setState({ status: "error", errorMessage: describeOnChainError(error, messages) });
    }
  }, [publicClient, writeContractAsync, addresses, messages]);

  const reset = useCallback(() => setState(IDLE), []);

  return { ...state, release, reset };
}

"use client";

// Aggregates the publication's 5 on-chain/wallet gates (Phase 3, see
// PLANO_FASE_3_PUBLICACAO_ONCHAIN.md) — the 6th (terms) is decided by the screen itself.
// Everything here comes from wagmi's reactive hooks (useConnection/useBalance/useGasPrice/
// useReadContract inside useAuthorizedIssuer) — wagmi itself already reacts to
// accountsChanged/chainChanged/network switches internally (the same mechanism already documented
// for ConnectWallet.tsx in this project's CLAUDE.md: "the UI simply re-renders because the hooks
// are reactive to the connector's state"), so switching account or network with this screen open
// recomputes everything on its own — no manual window.ethereum listener is needed nor added here.
import { useSyncExternalStore } from "react";
import { useBalance, useConnection, useGasPrice } from "wagmi";
import { ORCHESTRATOR_CHAIN_ID } from "../orquestrador";
import { useAuthorizedIssuer } from "./useEmissorAutorizado";
import { evaluateGateProvider, evaluateGateNetwork, evaluateGateBalance, evaluateGateOwnership } from "../gates";

function subscribeToProvider() {
  // The presence of window.ethereum doesn't change observably — there's no event to subscribe to,
  // only the post-hydration read via getSnapshot (same pattern as ConnectWallet.tsx).
  return () => {};
}
function getProviderSnapshot() {
  return Boolean((window as Window & { ethereum?: unknown }).ethereum);
}
function getProviderServerSnapshot() {
  // Assumes it's present on the server/first paint so the happy path isn't penalized with a
  // negative flash — same pattern as ConnectWallet.tsx.
  return true;
}

export function usePublishOnChainGates(linkedWallet: string | null) {
  const hasProvider = useSyncExternalStore(subscribeToProvider, getProviderSnapshot, getProviderServerSnapshot);
  const connection = useConnection();

  const onRightNetwork = connection.isConnected && connection.chainId === ORCHESTRATOR_CHAIN_ID;

  const balance = useBalance({
    address: connection.address,
    chainId: ORCHESTRATOR_CHAIN_ID,
    query: { enabled: onRightNetwork },
  });

  const gasPrice = useGasPrice({
    chainId: ORCHESTRATOR_CHAIN_ID,
    // Periodic refetch: Phase 2 showed the gas price vary from ~1 gwei to dozens within the
    // same session — a value read once when opening the screen may already be outdated minutes
    // later, if the issuer takes a while to review the checklist before signing.
    query: { enabled: onRightNetwork, refetchInterval: 15_000 },
  });

  const gateAuthorized = useAuthorizedIssuer(connection.address);

  const gateProvider = evaluateGateProvider(hasProvider);
  const gateNetwork = evaluateGateNetwork(connection.isConnected, connection.chainId, ORCHESTRATOR_CHAIN_ID);
  const gateBalance = evaluateGateBalance({
    isConnected: onRightNetwork,
    balanceWei: balance.data?.value,
    gasPriceWei: gasPrice.data,
    balanceLoading: balance.isLoading,
    balanceError: balance.isError,
    gasPriceLoading: gasPrice.isLoading,
    gasPriceError: gasPrice.isError,
  });
  const gateOwnership = evaluateGateOwnership(connection.address, linkedWallet);

  return { connection, gateProvider, gateNetwork, gateBalance, gateAuthorized, gateOwnership };
}

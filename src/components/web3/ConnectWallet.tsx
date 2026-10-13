"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AlertTriangle, Check, Copy, Loader2, LogOut, Wallet } from "lucide-react";
import { useConnect, useConnectors, useConnection, useDisconnect, useSwitchChain } from "wagmi";
import { UserRejectedRequestError } from "viem";
import { sepolia } from "wagmi/chains";
import { useDictionary } from "@/lib/i18n/client";

// How long wagmi's automatic reconnection (reconnectOnMount) can stay on "Connecting…"
// before the button is freed for a manual connection — see the comment on isPending.
const RECONNECT_TIMEOUT_MS = 5000;

function subscribeToProvider() {
  // The presence of window.ethereum doesn't change observably — there's no
  // event to subscribe to, only the post-hydration read via getSnapshot.
  return () => {};
}

function getProviderSnapshot() {
  return Boolean((window as Window & { ethereum?: unknown }).ethereum);
}

function getProviderServerSnapshot() {
  // Assumes it's present on the server/first paint so the happy path
  // (wallet installed) isn't penalized with a negative flash.
  return true;
}

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function isUserRejection(error: unknown) {
  if (error instanceof UserRejectedRequestError) return true;
  if (error && typeof error === "object") {
    const err = error as { code?: number; cause?: { code?: number } };
    return err.code === 4001 || err.cause?.code === 4001;
  }
  return false;
}

export function ConnectWallet({
  connectLabel,
  connectButtonClassName,
}: { connectLabel?: string; connectButtonClassName?: string } = {}) {
  const dict = useDictionary();
  const t = dict.profile.wallet;
  const hasProvider = useSyncExternalStore(
    subscribeToProvider,
    getProviderSnapshot,
    getProviderServerSnapshot,
  );

  const connection = useConnection();
  const connectors = useConnectors();
  const { mutate: connect, isPending: isConnectPending, error: connectError } = useConnect();
  const { mutate: disconnect } = useDisconnect();
  const { mutate: switchChain, isPending: isSwitching } = useSwitchChain();
  const [copied, setCopied] = useState(false);

  // Never reset on purpose: it only has an effect while isReconnecting (see autoReconnectPending/
  // reconnectStalled), and wagmi enters "reconnecting" at most once per load —
  // reconnect() only runs on mount and has a re-entrancy lock.
  const [reconnectTimedOut, setReconnectTimedOut] = useState(false);
  useEffect(() => {
    if (!connection.isReconnecting) return;
    const timer = setTimeout(() => setReconnectTimedOut(true), RECONNECT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [connection.isReconnecting]);

  const injectedConnector = connectors[0];
  const isWrongNetwork = connection.isConnected && connection.chainId !== sepolia.id;
  const rejected = connectError !== null && isUserRejection(connectError);

  async function handleCopy(address: string) {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!hasProvider && !connection.isConnected) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-panel-border bg-military px-3 py-2 text-sm text-on-military-muted">
        <Wallet className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{t.notDetected}</span>
        <a
          href="https://metamask.io/download/"
          target="_blank"
          rel="noreferrer"
          className="text-salmon underline underline-offset-2 hover:text-salmon-600"
        >
          {t.installMetaMask}
        </a>
      </div>
    );
  }

  if (connection.isConnected && isWrongNetwork) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-2 rounded-md border border-salmon/40 bg-salmon/10 p-3 text-sm text-on-military">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-salmon" aria-hidden="true" />
          <span>{t.wrongNetwork}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => switchChain({ chainId: sepolia.id })}
            disabled={isSwitching}
            className="flex items-center gap-2 rounded-md bg-salmon px-3 py-1.5 text-sm font-medium text-on-salmon transition-colors hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSwitching && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            <span>{isSwitching ? t.switchingNetwork : t.switchNetworkButton}</span>
          </button>
          <button
            type="button"
            onClick={() => disconnect()}
            aria-label={t.disconnectAriaLabel}
            title={t.disconnectButton}
            className="rounded-md border border-panel-border bg-military p-1.5 text-on-military-muted transition-colors hover:text-on-military"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  if (connection.isConnected && connection.address) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border border-panel-border bg-military px-3 py-1.5 text-sm">
            <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-value-positive" />
            <span className="font-mono tabular-nums text-on-military">
              {truncateAddress(connection.address)}
            </span>
            <span className="rounded-full border border-panel-border px-2 py-0.5 text-xs text-on-military-muted">
              {sepolia.name}
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(connection.address as string)}
            aria-label={t.copyAddress}
            title={t.copyAddress}
            className="rounded-md border border-panel-border bg-military p-1.5 text-on-military-muted transition-colors hover:text-on-military"
          >
            {copied ? (
              <Check className="h-4 w-4 text-value-positive" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={() => disconnect()}
            aria-label={t.disconnectAriaLabel}
            title={t.disconnectButton}
            className="rounded-md border border-panel-border bg-military p-1.5 text-on-military-muted transition-colors hover:text-on-military"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p className="text-xs text-on-military-muted">{t.disconnectNote}</p>
      </div>
    );
  }

  // 🔴 The automatic reconnection only counts as pending while (a) there's an injected provider —
  // without window.ethereum wagmi itself already skips the connector without calling anything — and
  // (b) RECONNECT_TIMEOUT_MS hasn't run out. Without this the button got stuck on "Connecting…"
  // forever: with a connection saved in the cookie but the wallet locked/unavailable, the
  // reconnection's eth_accounts/eth_chainId may never answer, and core's `reconnect()` only sets the
  // status back to "disconnected" AFTER waiting for the connector (and still leaves an internal lock
  // that turns any following `reconnect()` into a no-op). The manual click uses `connect()`, which
  // doesn't go through that lock. A user-initiated connection (isConnectPending/isConnecting) has no
  // timeout — there the wait is for the wallet popup, which can legitimately take a while.
  const autoReconnectPending = connection.isReconnecting && hasProvider && !reconnectTimedOut;
  const isPending = isConnectPending || connection.isConnecting || autoReconnectPending;
  const reconnectStalled = connection.isReconnecting && reconnectTimedOut;

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={() => injectedConnector && connect({ connector: injectedConnector })}
        disabled={isPending || !injectedConnector}
        className={`flex items-center gap-2 rounded-md bg-salmon px-4 py-2 text-sm font-medium text-on-salmon transition-colors hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60 ${connectButtonClassName ?? ""}`}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Wallet className="h-4 w-4" aria-hidden="true" />
        )}
        <span>{isPending ? t.connecting : (connectLabel ?? t.connectButton)}</span>
      </button>
      {rejected && <span className="text-xs text-on-military-muted">{t.connectionRejected}</span>}
      {reconnectStalled && !rejected && (
        <span className="text-xs text-on-military-muted">{t.reconnectionTimedOut}</span>
      )}
    </div>
  );
}

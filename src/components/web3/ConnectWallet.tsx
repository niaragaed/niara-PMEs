"use client";

import { useState, useSyncExternalStore } from "react";
import { AlertTriangle, Check, Copy, Loader2, LogOut, Wallet } from "lucide-react";
import { useConnect, useConnectors, useConnection, useDisconnect, useSwitchChain } from "wagmi";
import { UserRejectedRequestError } from "viem";
import { sepolia } from "wagmi/chains";
import { ptBr } from "@/lib/i18n/pt-br";

function subscribeToProvider() {
  // Presença de window.ethereum não muda de forma observável — não há
  // evento para assinar, só a leitura pós-hidratação via getSnapshot.
  return () => {};
}

function getProviderSnapshot() {
  return Boolean((window as Window & { ethereum?: unknown }).ethereum);
}

function getProviderServerSnapshot() {
  // Assume presente no servidor/primeira pintura para não penalizar o
  // caminho feliz (carteira instalada) com um flash negativo.
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

export function ConnectWallet() {
  const t = ptBr.perfil.carteira;
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
        <span>{t.naoDetectada}</span>
        <a
          href="https://metamask.io/download/"
          target="_blank"
          rel="noreferrer"
          className="text-salmon underline underline-offset-2 hover:text-salmon-600"
        >
          {t.instalarMetaMask}
        </a>
      </div>
    );
  }

  if (connection.isConnected && isWrongNetwork) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-2 rounded-md border border-salmon/40 bg-salmon/10 p-3 text-sm text-on-military">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-salmon" aria-hidden="true" />
          <span>{t.redeErrada}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => switchChain({ chainId: sepolia.id })}
            disabled={isSwitching}
            className="flex items-center gap-2 rounded-md bg-salmon px-3 py-1.5 text-sm font-medium text-on-salmon transition-colors hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSwitching && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            <span>{isSwitching ? t.trocandoRede : t.trocarRedeBotao}</span>
          </button>
          <button
            type="button"
            onClick={() => disconnect()}
            aria-label={t.desconectarAriaLabel}
            title={t.desconectarBotao}
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
            aria-label={t.copiarEndereco}
            title={t.copiarEndereco}
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
            aria-label={t.desconectarAriaLabel}
            title={t.desconectarBotao}
            className="rounded-md border border-panel-border bg-military p-1.5 text-on-military-muted transition-colors hover:text-on-military"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p className="text-xs text-on-military-muted">{t.desconectarNota}</p>
      </div>
    );
  }

  const isPending = isConnectPending || connection.isConnecting || connection.isReconnecting;

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={() => injectedConnector && connect({ connector: injectedConnector })}
        disabled={isPending || !injectedConnector}
        className="flex items-center gap-2 rounded-md bg-salmon px-4 py-2 text-sm font-medium text-on-salmon transition-colors hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Wallet className="h-4 w-4" aria-hidden="true" />
        )}
        <span>{isPending ? t.conectando : t.conectarBotao}</span>
      </button>
      {rejected && <span className="text-xs text-on-military-muted">{t.conexaoRejeitada}</span>}
    </div>
  );
}

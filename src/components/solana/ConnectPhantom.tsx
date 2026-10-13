"use client";

// Conexão da carteira Solana (Phantom) — par do ConnectWallet.tsx (MetaMask/Sepolia), mesmo visual.
// Não existe "rede errada" aqui: a Phantom só assina, e o envio vai sempre pelo RPC da devnet
// configurado no site (ver src/lib/solana/phantom.ts) — por isso o selo mostra a rede do PROGRAMA,
// não a rede selecionada dentro da Phantom.
import { useEffect, useState } from "react";
import { Check, Copy, Loader2, LogOut, Wallet } from "lucide-react";
import { useSolanaWallet } from "@/lib/solana/phantom";
import { solanaConnection } from "@/lib/solana/program";
import { useDictionary } from "@/lib/i18n/client";
import { describeSolanaError } from "@/lib/solana/errors";

function truncate(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function ConnectPhantom({ showSolBalance = true }: { showSolBalance?: boolean }) {
  const dict = useDictionary();
  const t = dict.solana.wallet;
  const wallet = useSolanaWallet();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [solBalance, setBalanceSol] = useState<number | null>(null);

  useEffect(() => {
    if (!showSolBalance || !wallet.address) return;
    let cancelled = false;
    const address = wallet.address;
    async function read() {
      try {
        const { PublicKey } = await import("@solana/web3.js");
        const lamports = await solanaConnection().getBalance(new PublicKey(address), "confirmed");
        if (!cancelled) setBalanceSol(lamports / 1_000_000_000);
      } catch {
        if (!cancelled) setBalanceSol(null);
      }
    }
    void read();
    const timer = setInterval(read, 20_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [wallet.address, showSolBalance]);

  async function handleConnect() {
    setError(null);
    setConnecting(true);
    try {
      await wallet.connect();
    } catch (e) {
      const code = (e as { code?: number })?.code;
      setError(code === 4001 ? t.connectionRejected : describeSolanaError(e, dict.chainErrors.solana));
    } finally {
      setConnecting(false);
    }
  }

  async function handleCopy(address: string) {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (wallet.started && !wallet.available) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-panel-border bg-military px-3 py-2 text-sm text-on-military-muted">
        <Wallet className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{t.notDetected}</span>
        <a href="https://phantom.com/download" target="_blank" rel="noreferrer" className="text-salmon underline underline-offset-2 hover:text-salmon-600">
          {t.installPhantom}
        </a>
      </div>
    );
  }

  if (wallet.address) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border border-panel-border bg-military px-3 py-1.5 text-sm">
            <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-value-positive" />
            <span className="font-mono tabular-nums text-on-military">{truncate(wallet.address)}</span>
            <span className="rounded-full border border-panel-border px-2 py-0.5 text-xs text-on-military-muted">{t.network}</span>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(wallet.address as string)}
            aria-label={t.copyAddress}
            title={t.copyAddress}
            className="rounded-md border border-panel-border bg-military p-1.5 text-on-military-muted transition-colors hover:text-on-military"
          >
            {copied ? <Check className="h-4 w-4 text-value-positive" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          </button>
          <button
            type="button"
            onClick={() => void wallet.disconnect()}
            aria-label={t.disconnect}
            title={t.disconnect}
            className="rounded-md border border-panel-border bg-military p-1.5 text-on-military-muted transition-colors hover:text-on-military"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {showSolBalance && (
          <p className="text-xs text-on-military-muted">
            {t.solBalance(solBalance === null ? "—" : solBalance.toLocaleString("pt-BR", { maximumFractionDigits: 4 }))}
            {solBalance !== null && solBalance < 0.01 && (
              <>
                {" "}
                <a href="https://faucet.solana.com" target="_blank" rel="noreferrer" className="text-salmon underline underline-offset-2 hover:text-salmon-600">
                  {t.faucetSol}
                </a>
              </>
            )}
          </p>
        )}
        <p className="text-xs text-on-military-muted">{t.networkNote}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={handleConnect}
        disabled={connecting}
        className="flex items-center gap-2 rounded-md bg-salmon px-4 py-2 text-sm font-medium text-on-salmon transition-colors hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {connecting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Wallet className="h-4 w-4" aria-hidden="true" />}
        <span>{connecting ? t.connecting : t.connect}</span>
      </button>
      {error && <span className="text-xs text-on-military-muted">{error}</span>}
    </div>
  );
}

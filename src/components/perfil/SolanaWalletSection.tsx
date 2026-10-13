"use client";

// Carteira Solana (Phantom) no /perfil — par da WalletSection (MetaMask). Vincular exige assinar
// uma mensagem (signMessage, sem transação e sem custo) que prova a posse da carteira — ver
// src/app/perfil/solana-actions.ts. É esta carteira que pode publicar ofertas na Solana Devnet.
import { useState, useTransition } from "react";
import { Link2, Link2Off, RefreshCw } from "lucide-react";
import { utils } from "@anchor-lang/core";
import { ConnectPhantom } from "@/components/solana/ConnectPhantom";
import { providerPhantom, useSolanaWallet } from "@/lib/solana/phantom";
import { prepareSolanaLink, saveSolanaWallet, unlinkSolanaWallet } from "@/app/perfil/solana-actions";
import { useDictionary } from "@/lib/i18n/client";
import { describeSolanaError } from "@/lib/solana/errors";

function truncate(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function SolanaWalletSection({ solanaWalletAddress }: { solanaWalletAddress: string | null }) {
  const dict = useDictionary();
  const t = dict.solana.profile;
  const wallet = useSolanaWallet();
  const [linked, setLinked] = useState(solanaWalletAddress);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"linked" | "unlinked" | null>(null);
  const [isPending, startTransition] = useTransition();

  const connected = wallet.address;
  const matches = Boolean(linked && connected && linked === connected);

  function handleLink() {
    if (!connected) return;
    setError(null);
    setDone(null);
    startTransition(async () => {
      const preparation = await prepareSolanaLink(connected);
      if (preparation.status === "error") {
        setError(preparation.message);
        return;
      }
      const p = providerPhantom();
      if (!p?.signMessage) {
        setError(t.noSignMessage);
        return;
      }
      let signature: string;
      try {
        const r = await p.signMessage(new TextEncoder().encode(preparation.message), "utf8");
        signature = utils.bytes.bs58.encode(r.signature);
      } catch (e) {
        const code = (e as { code?: number })?.code;
        setError(code === 4001 ? t.signatureRefused : describeSolanaError(e, dict.chainErrors.solana));
        return;
      }
      const r = await saveSolanaWallet({ address: connected, message: preparation.message, signature });
      if (r.status === "error") {
        setError(r.message);
        return;
      }
      setLinked(connected);
      setDone("linked");
    });
  }

  function handleUnlink() {
    setError(null);
    setDone(null);
    startTransition(async () => {
      const r = await unlinkSolanaWallet();
      if (r.status === "error") {
        setError(r.message);
        return;
      }
      setLinked(null);
      setDone("unlinked");
    });
  }

  const primaryButton =
    "flex items-center gap-1.5 rounded-md bg-salmon px-3 py-1.5 text-sm font-medium text-on-salmon transition-colors hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <section id="solana-wallet" aria-labelledby="solana-wallet-heading" className="scroll-mt-24">
      <h2 id="solana-wallet-heading" className="text-xl font-semibold text-on-military">
        {t.title}
      </h2>
      <p className="mt-1 text-xs text-on-military-muted">{t.subtitle}</p>

      <div className="mt-6 rounded-lg border border-panel-border bg-panel p-6">
        <ConnectPhantom />
      </div>

      <div className="mt-6 rounded-lg border border-panel-border bg-panel p-6">
        <h3 className="text-sm font-semibold text-on-military">{t.linkTitle}</h3>
        <p className="mt-1 text-xs text-on-military-muted">{t.explanation}</p>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-on-military-muted">{t.linkedLabel}</dt>
            <dd className="break-all text-right font-mono tabular-nums text-on-military">{linked ? truncate(linked) : t.none}</dd>
          </div>
          {connected && !matches && (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-on-military-muted">{t.connectedNowLabel}</dt>
              <dd className="break-all text-right font-mono tabular-nums text-on-military">{truncate(connected)}</dd>
            </div>
          )}
        </dl>

        {error && (
          <p role="alert" className="mt-4 text-sm text-value-negative">
            {error}
          </p>
        )}
        {done && !error && (
          <p className="mt-4 rounded-md border border-value-positive/30 bg-value-positive/10 px-3 py-2 text-xs text-value-positive">
            {done === "linked" ? t.successLinked : t.successUnlinked}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {connected && !matches && (
            <button type="button" onClick={handleLink} disabled={isPending} className={primaryButton}>
              {linked ? <RefreshCw className="h-4 w-4" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
              {isPending ? t.signing : linked ? t.switchButton : t.linkButton}
            </button>
          )}
          {linked && (
            <button
              type="button"
              onClick={handleUnlink}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-md border border-panel-border px-3 py-1.5 text-sm font-medium text-on-military-muted transition-colors hover:text-on-military disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Link2Off className="h-4 w-4" aria-hidden="true" />
              {t.unlinkButton}
            </button>
          )}
          {!linked && !connected && <p className="text-xs text-on-military-muted">{t.connectToLink}</p>}
        </div>
      </div>
    </section>
  );
}

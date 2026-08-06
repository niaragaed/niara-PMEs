"use client";

import { useState, useTransition } from "react";
import { Link2, Link2Off, RefreshCw } from "lucide-react";
import { useConnection } from "wagmi";
import { saveWallet, unlinkWallet } from "@/app/perfil/actions";
import { ConnectWallet } from "@/components/web3/ConnectWallet";
import { ConnectionPanel } from "@/components/web3/ConnectionPanel";
import { ptBr } from "@/lib/i18n/pt-br";

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletSection({ walletAddress }: { walletAddress: string | null }) {
  const t = ptBr.perfil.carteira;
  const tv = t.vinculo;

  const connection = useConnection();
  const [linked, setLinked] = useState(walletAddress);
  const [serverError, setServerError] = useState<string | null>(null);
  const [justDid, setJustDid] = useState<"vinculada" | "desvinculada" | null>(null);
  const [isPending, startTransition] = useTransition();

  const connectedAddress = connection.isConnected ? connection.address : undefined;
  const matches =
    Boolean(linked) && Boolean(connectedAddress) && linked!.toLowerCase() === connectedAddress!.toLowerCase();

  function handleSave() {
    if (!connectedAddress) return;
    setServerError(null);
    setJustDid(null);
    startTransition(async () => {
      const result = await saveWallet(connectedAddress);
      if (result.status === "error") {
        setServerError(result.message);
        return;
      }
      setLinked(connectedAddress);
      setJustDid("vinculada");
    });
  }

  function handleUnlink() {
    setServerError(null);
    setJustDid(null);
    startTransition(async () => {
      const result = await unlinkWallet();
      if (result.status === "error") {
        setServerError(result.message);
        return;
      }
      setLinked(null);
      setJustDid("desvinculada");
    });
  }

  return (
    <section id="carteira" aria-labelledby="carteira-heading" className="scroll-mt-24">
      <h2 id="carteira-heading" className="text-xl font-semibold text-on-military">
        {t.title}
      </h2>
      <p className="mt-1 text-xs text-on-military-muted">{t.subtitle}</p>

      <div className="mt-6 rounded-lg border border-panel-border bg-panel p-6">
        <ConnectWallet />
      </div>

      <div className="mt-6">
        <ConnectionPanel />
      </div>

      <div className="mt-6 rounded-lg border border-panel-border bg-panel p-6">
        <h3 className="text-sm font-semibold text-on-military">{tv.title}</h3>
        <p className="mt-1 text-xs text-on-military-muted">{tv.explicacao}</p>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-on-military-muted">{tv.vinculadaLabel}</dt>
            <dd className="break-all text-right font-mono tabular-nums text-on-military">
              {linked ? truncateAddress(linked) : tv.nenhuma}
            </dd>
          </div>
          {connectedAddress && !matches && (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-on-military-muted">{tv.conectadaAgoraLabel}</dt>
              <dd className="break-all text-right font-mono tabular-nums text-on-military">
                {truncateAddress(connectedAddress)}
              </dd>
            </div>
          )}
        </dl>

        {serverError && (
          <p role="alert" className="mt-4 text-sm text-value-negative">
            {serverError}
          </p>
        )}
        {justDid === "vinculada" && !serverError && (
          <p className="mt-4 rounded-md border border-value-positive/30 bg-value-positive/10 px-3 py-2 text-xs text-value-positive">
            {tv.sucessoVinculada}
          </p>
        )}
        {justDid === "desvinculada" && !serverError && (
          <p className="mt-4 rounded-md border border-value-positive/30 bg-value-positive/10 px-3 py-2 text-xs text-value-positive">
            {tv.sucessoDesvinculada}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {!linked && connectedAddress && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-md bg-salmon px-3 py-1.5 text-sm font-medium text-on-salmon transition-colors hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Link2 className="h-4 w-4" aria-hidden="true" />
              {isPending ? tv.salvando : tv.salvarBotao}
            </button>
          )}
          {linked && connectedAddress && !matches && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-md bg-salmon px-3 py-1.5 text-sm font-medium text-on-salmon transition-colors hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {isPending ? tv.trocando : tv.trocarBotao}
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
              {isPending ? tv.desvinculando : tv.desvincularBotao}
            </button>
          )}
          {!linked && !connectedAddress && (
            <p className="text-xs text-on-military-muted">{tv.conecteParaVincular}</p>
          )}
        </div>
      </div>

      <p className="mt-4 text-[11px] text-on-military-muted">{t.redeNota}</p>
    </section>
  );
}

"use client";

import { useState } from "react";
import { Star, Trash2, Wallet as WalletIcon } from "lucide-react";
import { ptBr } from "@/lib/i18n/pt-br";
import { DEMO_WALLET_POOL } from "@/lib/mock/perfil";

type ConnectedWallet = {
  id: string;
  label: string;
  address: string;
  network: string;
  principal: boolean;
};

export function WalletSection() {
  // Conexão simulada: nenhuma carteira real é acessada, nenhuma transação
  // on-chain acontece. Estado só em memória, some ao recarregar a página.
  const [wallets, setWallets] = useState<ConnectedWallet[]>([]);
  const t = ptBr.perfil.carteira;

  const nextDemoWallet = DEMO_WALLET_POOL.find((demo) => !wallets.some((wallet) => wallet.id === demo.id));

  function handleConnect() {
    if (!nextDemoWallet) return;
    setWallets((current) => [
      ...current,
      { ...nextDemoWallet, principal: current.length === 0 },
    ]);
  }

  function handleSetPrincipal(id: string) {
    setWallets((current) => current.map((wallet) => ({ ...wallet, principal: wallet.id === id })));
  }

  function handleRemove(id: string) {
    setWallets((current) => {
      const next = current.filter((wallet) => wallet.id !== id);
      if (next.length > 0 && !next.some((wallet) => wallet.principal)) {
        next[0] = { ...next[0], principal: true };
      }
      return next;
    });
  }

  return (
    <section id="carteira" aria-labelledby="carteira-heading" className="scroll-mt-24">
      <h2 id="carteira-heading" className="text-xl font-semibold text-on-military">
        {t.title}
      </h2>
      <p className="mt-1 text-xs text-on-military-muted">{t.nota}</p>

      <div className="mt-6 rounded-lg border border-panel-border bg-panel p-6">
        {wallets.length === 0 && (
          <p className="text-sm text-on-military-muted">{t.vazio}</p>
        )}

        {wallets.length > 0 && (
          <ul className="flex flex-col gap-3">
            {wallets.map((wallet) => (
              <li
                key={wallet.id}
                className="flex flex-col gap-3 rounded-md border border-panel-border bg-military-600/20 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-military-600/40 text-on-military">
                    <WalletIcon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-on-military">
                      {wallet.label}
                      {wallet.principal && (
                        <span className="rounded-full border border-salmon/40 bg-salmon/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-on-military">
                          {t.principal}
                        </span>
                      )}
                    </p>
                    <p className="font-mono text-xs tabular-nums text-on-military-muted">
                      {wallet.address} · {wallet.network}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!wallet.principal && (
                    <button
                      type="button"
                      onClick={() => handleSetPrincipal(wallet.id)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-panel-border px-3 py-1.5 text-xs font-medium text-on-military hover:border-salmon"
                    >
                      <Star className="h-3.5 w-3.5" aria-hidden="true" />
                      {t.definirPrincipal}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(wallet.id)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-panel-border px-3 py-1.5 text-xs font-medium text-on-military-muted hover:border-value-negative hover:text-value-negative"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {t.remover}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {nextDemoWallet && (
          <button
            type="button"
            onClick={handleConnect}
            className={`inline-flex items-center gap-2 rounded-full bg-salmon px-4 py-2 text-sm font-medium text-on-salmon hover:bg-salmon-600 ${
              wallets.length > 0 ? "mt-4" : ""
            }`}
          >
            <WalletIcon className="h-4 w-4" aria-hidden="true" />
            {wallets.length === 0 ? t.conectarBotao : t.conectarOutraBotao}
          </button>
        )}

        <p className="mt-4 text-[11px] text-on-military-muted">{t.testnetNota}</p>
      </div>
    </section>
  );
}

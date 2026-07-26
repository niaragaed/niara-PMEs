"use client";

import { ConnectWallet } from "@/components/web3/ConnectWallet";
import { ConnectionPanel } from "@/components/web3/ConnectionPanel";
import { ptBr } from "@/lib/i18n/pt-br";

export function WalletSection() {
  const t = ptBr.perfil.carteira;

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

      <p className="mt-4 text-[11px] text-on-military-muted">{t.redeNota}</p>
    </section>
  );
}

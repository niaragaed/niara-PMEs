"use client";

// Carteira Solana (Phantom) no /perfil — par da WalletSection (MetaMask). Vincular exige assinar
// uma mensagem (signMessage, sem transação e sem custo) que prova a posse da carteira — ver
// src/app/perfil/solana-actions.ts. É esta carteira que pode publicar ofertas na Solana Devnet.
import { useState, useTransition } from "react";
import { Link2, Link2Off, RefreshCw } from "lucide-react";
import { utils } from "@anchor-lang/core";
import { ConnectPhantom } from "@/components/solana/ConnectPhantom";
import { providerPhantom, useCarteiraSolana } from "@/lib/solana/phantom";
import { prepararVinculoSolana, saveSolanaWallet, unlinkSolanaWallet } from "@/app/perfil/solana-actions";
import { ptBr } from "@/lib/i18n/pt-br";

function truncar(endereco: string) {
  return `${endereco.slice(0, 4)}…${endereco.slice(-4)}`;
}

export function SolanaWalletSection({ solanaWalletAddress }: { solanaWalletAddress: string | null }) {
  const t = ptBr.solana.perfil;
  const carteira = useCarteiraSolana();
  const [vinculada, setVinculada] = useState(solanaWalletAddress);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<"vinculada" | "desvinculada" | null>(null);
  const [isPending, startTransition] = useTransition();

  const conectada = carteira.endereco;
  const confere = Boolean(vinculada && conectada && vinculada === conectada);

  function handleVincular() {
    if (!conectada) return;
    setErro(null);
    setFeito(null);
    startTransition(async () => {
      const preparo = await prepararVinculoSolana(conectada);
      if (preparo.status === "error") {
        setErro(preparo.message);
        return;
      }
      const p = providerPhantom();
      if (!p?.signMessage) {
        setErro(t.semSignMessage);
        return;
      }
      let assinatura: string;
      try {
        const r = await p.signMessage(new TextEncoder().encode(preparo.mensagem), "utf8");
        assinatura = utils.bytes.bs58.encode(r.signature);
      } catch (e) {
        const codigo = (e as { code?: number })?.code;
        setErro(codigo === 4001 ? t.assinaturaRecusada : e instanceof Error ? e.message : String(e));
        return;
      }
      const r = await saveSolanaWallet({ endereco: conectada, mensagem: preparo.mensagem, assinatura });
      if (r.status === "error") {
        setErro(r.message);
        return;
      }
      setVinculada(conectada);
      setFeito("vinculada");
    });
  }

  function handleDesvincular() {
    setErro(null);
    setFeito(null);
    startTransition(async () => {
      const r = await unlinkSolanaWallet();
      if (r.status === "error") {
        setErro(r.message);
        return;
      }
      setVinculada(null);
      setFeito("desvinculada");
    });
  }

  const botaoPrimario =
    "flex items-center gap-1.5 rounded-md bg-salmon px-3 py-1.5 text-sm font-medium text-on-salmon transition-colors hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <section id="carteira-solana" aria-labelledby="carteira-solana-heading" className="scroll-mt-24">
      <h2 id="carteira-solana-heading" className="text-xl font-semibold text-on-military">
        {t.title}
      </h2>
      <p className="mt-1 text-xs text-on-military-muted">{t.subtitle}</p>

      <div className="mt-6 rounded-lg border border-panel-border bg-panel p-6">
        <ConnectPhantom />
      </div>

      <div className="mt-6 rounded-lg border border-panel-border bg-panel p-6">
        <h3 className="text-sm font-semibold text-on-military">{t.vinculoTitulo}</h3>
        <p className="mt-1 text-xs text-on-military-muted">{t.explicacao}</p>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-on-military-muted">{t.vinculadaLabel}</dt>
            <dd className="break-all text-right font-mono tabular-nums text-on-military">{vinculada ? truncar(vinculada) : t.nenhuma}</dd>
          </div>
          {conectada && !confere && (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-on-military-muted">{t.conectadaAgoraLabel}</dt>
              <dd className="break-all text-right font-mono tabular-nums text-on-military">{truncar(conectada)}</dd>
            </div>
          )}
        </dl>

        {erro && (
          <p role="alert" className="mt-4 text-sm text-value-negative">
            {erro}
          </p>
        )}
        {feito && !erro && (
          <p className="mt-4 rounded-md border border-value-positive/30 bg-value-positive/10 px-3 py-2 text-xs text-value-positive">
            {feito === "vinculada" ? t.sucessoVinculada : t.sucessoDesvinculada}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {conectada && !confere && (
            <button type="button" onClick={handleVincular} disabled={isPending} className={botaoPrimario}>
              {vinculada ? <RefreshCw className="h-4 w-4" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
              {isPending ? t.assinando : vinculada ? t.trocarBotao : t.vincularBotao}
            </button>
          )}
          {vinculada && (
            <button
              type="button"
              onClick={handleDesvincular}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-md border border-panel-border px-3 py-1.5 text-sm font-medium text-on-military-muted transition-colors hover:text-on-military disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Link2Off className="h-4 w-4" aria-hidden="true" />
              {t.desvincularBotao}
            </button>
          )}
          {!vinculada && !conectada && <p className="text-xs text-on-military-muted">{t.conecteParaVincular}</p>}
        </div>
      </div>
    </section>
  );
}

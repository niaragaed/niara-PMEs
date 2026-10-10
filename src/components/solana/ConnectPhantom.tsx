"use client";

// Conexão da carteira Solana (Phantom) — par do ConnectWallet.tsx (MetaMask/Sepolia), mesmo visual.
// Não existe "rede errada" aqui: a Phantom só assina, e o envio vai sempre pelo RPC da devnet
// configurado no site (ver src/lib/solana/phantom.ts) — por isso o selo mostra a rede do PROGRAMA,
// não a rede selecionada dentro da Phantom.
import { useEffect, useState } from "react";
import { Check, Copy, Loader2, LogOut, Wallet } from "lucide-react";
import { useCarteiraSolana } from "@/lib/solana/phantom";
import { conexaoSolana } from "@/lib/solana/program";
import { ptBr } from "@/lib/i18n/pt-br";

function truncar(endereco: string) {
  return `${endereco.slice(0, 4)}…${endereco.slice(-4)}`;
}

export function ConnectPhantom({ mostrarSaldoSol = true }: { mostrarSaldoSol?: boolean }) {
  const t = ptBr.solana.carteira;
  const carteira = useCarteiraSolana();
  const [conectando, setConectando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [saldoSol, setSaldoSol] = useState<number | null>(null);

  useEffect(() => {
    if (!mostrarSaldoSol || !carteira.endereco) return;
    let cancelado = false;
    const endereco = carteira.endereco;
    async function ler() {
      try {
        const { PublicKey } = await import("@solana/web3.js");
        const lamports = await conexaoSolana().getBalance(new PublicKey(endereco), "confirmed");
        if (!cancelado) setSaldoSol(lamports / 1_000_000_000);
      } catch {
        if (!cancelado) setSaldoSol(null);
      }
    }
    void ler();
    const timer = setInterval(ler, 20_000);
    return () => {
      cancelado = true;
      clearInterval(timer);
    };
  }, [carteira.endereco, mostrarSaldoSol]);

  async function handleConectar() {
    setErro(null);
    setConectando(true);
    try {
      await carteira.conectar();
    } catch (e) {
      const codigo = (e as { code?: number })?.code;
      setErro(codigo === 4001 ? t.conexaoRejeitada : e instanceof Error ? e.message : String(e));
    } finally {
      setConectando(false);
    }
  }

  async function handleCopiar(endereco: string) {
    await navigator.clipboard.writeText(endereco);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  if (carteira.iniciado && !carteira.disponivel) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-panel-border bg-military px-3 py-2 text-sm text-on-military-muted">
        <Wallet className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{t.naoDetectada}</span>
        <a href="https://phantom.com/download" target="_blank" rel="noreferrer" className="text-salmon underline underline-offset-2 hover:text-salmon-600">
          {t.instalarPhantom}
        </a>
      </div>
    );
  }

  if (carteira.endereco) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border border-panel-border bg-military px-3 py-1.5 text-sm">
            <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-value-positive" />
            <span className="font-mono tabular-nums text-on-military">{truncar(carteira.endereco)}</span>
            <span className="rounded-full border border-panel-border px-2 py-0.5 text-xs text-on-military-muted">{t.rede}</span>
          </div>
          <button
            type="button"
            onClick={() => handleCopiar(carteira.endereco as string)}
            aria-label={t.copiarEndereco}
            title={t.copiarEndereco}
            className="rounded-md border border-panel-border bg-military p-1.5 text-on-military-muted transition-colors hover:text-on-military"
          >
            {copiado ? <Check className="h-4 w-4 text-value-positive" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          </button>
          <button
            type="button"
            onClick={() => void carteira.desconectar()}
            aria-label={t.desconectar}
            title={t.desconectar}
            className="rounded-md border border-panel-border bg-military p-1.5 text-on-military-muted transition-colors hover:text-on-military"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {mostrarSaldoSol && (
          <p className="text-xs text-on-military-muted">
            {t.saldoSol(saldoSol === null ? "—" : saldoSol.toLocaleString("pt-BR", { maximumFractionDigits: 4 }))}
            {saldoSol !== null && saldoSol < 0.01 && (
              <>
                {" "}
                <a href="https://faucet.solana.com" target="_blank" rel="noreferrer" className="text-salmon underline underline-offset-2 hover:text-salmon-600">
                  {t.faucetSol}
                </a>
              </>
            )}
          </p>
        )}
        <p className="text-xs text-on-military-muted">{t.notaRede}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={handleConectar}
        disabled={conectando}
        className="flex items-center gap-2 rounded-md bg-salmon px-4 py-2 text-sm font-medium text-on-salmon transition-colors hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {conectando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Wallet className="h-4 w-4" aria-hidden="true" />}
        <span>{conectando ? t.conectando : t.conectar}</span>
      </button>
      {erro && <span className="text-xs text-on-military-muted">{erro}</span>}
    </div>
  );
}

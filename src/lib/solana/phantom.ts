"use client";

// Carteira Solana (Phantom, ou outra que injete a mesma interface em `window.phantom.solana` /
// `window.solana`) — sem @solana/wallet-adapter de propósito: o site só precisa de conectar,
// assinar transação e assinar mensagem (vínculo de carteira), e a interface injetada já cobre isso.
//
// A carteira SÓ ASSINA. O envio vai pelo RPC configurado em config.ts (devnet), nunca pelo RPC da
// carteira — assim a rede é sempre a do programa, independente da rede selecionada na Phantom.
import { useSyncExternalStore } from "react";
import { utils } from "@anchor-lang/core";
import { PublicKey, type Connection, type Transaction } from "@solana/web3.js";
import { descreverErroSolana } from "./errors";

type EventoPhantom = "connect" | "disconnect" | "accountChanged";

export type ProviderPhantom = {
  isPhantom?: boolean;
  publicKey: PublicKey | null;
  isConnected?: boolean;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  signMessage?: (mensagem: Uint8Array, encoding?: "utf8") => Promise<{ signature: Uint8Array; publicKey: PublicKey }>;
  on?: (evento: EventoPhantom, cb: (arg?: unknown) => void) => void;
  removeListener?: (evento: EventoPhantom, cb: (arg?: unknown) => void) => void;
};

declare global {
  interface Window {
    phantom?: { solana?: ProviderPhantom };
    solana?: ProviderPhantom;
  }
}

export function providerPhantom(): ProviderPhantom | null {
  if (typeof window === "undefined") return null;
  return window.phantom?.solana ?? window.solana ?? null;
}

// ── estado da conexão (store externo, lido com useSyncExternalStore) ─────────────────────────────

type EstadoCarteira = { disponivel: boolean; endereco: string | null; iniciado: boolean };

const SERVIDOR: EstadoCarteira = { disponivel: false, endereco: null, iniciado: false };
let estado: EstadoCarteira = SERVIDOR;
const ouvintes = new Set<() => void>();
let iniciado = false;

function definir(novo: Partial<EstadoCarteira>) {
  estado = { ...estado, ...novo };
  ouvintes.forEach((cb) => cb());
}

function iniciar() {
  if (iniciado || typeof window === "undefined") return;
  iniciado = true;
  const p = providerPhantom();
  estado = { disponivel: Boolean(p), endereco: p?.publicKey?.toBase58() ?? null, iniciado: true };
  if (!p) return;
  p.on?.("connect", () => definir({ endereco: p.publicKey?.toBase58() ?? null }));
  p.on?.("disconnect", () => definir({ endereco: null }));
  p.on?.("accountChanged", (nova) => {
    const chave = nova as PublicKey | null | undefined;
    definir({ endereco: chave ? chave.toBase58() : null });
  });
  // Reconexão silenciosa: só funciona se o usuário já tiver autorizado este site antes — nunca abre
  // pop-up sozinho.
  p.connect({ onlyIfTrusted: true }).then(
    (r) => definir({ endereco: r.publicKey.toBase58() }),
    () => undefined,
  );
}

function assinar(cb: () => void) {
  iniciar();
  ouvintes.add(cb);
  return () => {
    ouvintes.delete(cb);
  };
}

export function useCarteiraSolana() {
  const atual = useSyncExternalStore(
    assinar,
    () => {
      iniciar();
      return estado;
    },
    () => SERVIDOR,
  );

  async function conectar(): Promise<string> {
    const p = providerPhantom();
    if (!p) throw new Error("Nenhuma carteira Solana encontrada. Instale a Phantom.");
    const r = await p.connect();
    const endereco = r.publicKey.toBase58();
    definir({ endereco });
    return endereco;
  }

  async function desconectar() {
    await providerPhantom()?.disconnect();
    definir({ endereco: null });
  }

  return { ...atual, conectar, desconectar };
}

// ── envio de transação ──────────────────────────────────────────────────────────────────────────

export type TransacaoAssinada = {
  assinada: Transaction;
  /** Assinatura do pagador em base58 — o identificador da transação na Solana, já conhecido antes do envio. */
  assinatura: string;
  blockhash: string;
  lastValidBlockHeight: number;
};

/**
 * Simula (sem pedir assinatura) e pede a assinatura da carteira. NÃO envia. A simulação antes da
 * assinatura é o equivalente do `simulateContract` da Sepolia: uma regra do programa que
 * reprovaria a transação (meta máxima, teto, prazo…) aparece como mensagem legível ANTES da
 * carteira abrir, nunca como uma transação falha paga pelo usuário.
 */
export async function simularEAssinar(connection: Connection, tx: Transaction): Promise<TransacaoAssinada> {
  const p = providerPhantom();
  if (!p?.publicKey) throw new Error("Conecte a carteira Solana (Phantom) para continuar.");
  try {
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    // Normaliza a chave para a classe PublicKey DESTE bundle — a da carteira pode ser de outra
    // versão do @solana/web3.js, e a montagem da mensagem compara por classe.
    tx.feePayer = new PublicKey(p.publicKey.toBase58());
    tx.recentBlockhash = blockhash;

    const simulacao = await connection.simulateTransaction(tx);
    if (simulacao.value.err) {
      throw Object.assign(new Error("simulação falhou"), { logs: simulacao.value.logs ?? [], err: simulacao.value.err });
    }

    const assinada = await p.signTransaction(tx);
    const sig = assinada.signature;
    if (!sig) throw new Error("A carteira não devolveu a assinatura da transação.");
    return { assinada, assinatura: utils.bytes.bs58.encode(sig), blockhash, lastValidBlockHeight };
  } catch (erro) {
    throw new Error(descreverErroSolana(erro));
  }
}

/** Envia pelo RPC da devnet e espera a confirmação ("confirmed"). Lança com mensagem traduzida. */
export async function enviarEConfirmar(connection: Connection, t: TransacaoAssinada): Promise<string> {
  try {
    await connection.sendRawTransaction(t.assinada.serialize(), { preflightCommitment: "confirmed" });
    const resultado = await connection.confirmTransaction(
      { signature: t.assinatura, blockhash: t.blockhash, lastValidBlockHeight: t.lastValidBlockHeight },
      "confirmed",
    );
    if (resultado.value.err) {
      const detalhe = await connection.getTransaction(t.assinatura, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
      throw Object.assign(new Error("transação falhou"), { logs: detalhe?.meta?.logMessages ?? [], err: resultado.value.err });
    }
    return t.assinatura;
  } catch (erro) {
    throw new Error(descreverErroSolana(erro));
  }
}

/** Simula, assina, envia e confirma. `aoAssinar` é chamado assim que a carteira devolve a assinatura. */
export async function assinarEEnviar(
  connection: Connection,
  tx: Transaction,
  aoAssinar?: (assinatura: string) => void,
): Promise<string> {
  const assinada = await simularEAssinar(connection, tx);
  aoAssinar?.(assinada.assinatura);
  return enviarEConfirmar(connection, assinada);
}

import "server-only";

// Leituras da Solana feitas NO SERVIDOR para conferir uma publicação self-service — equivalente da
// parte on-chain de src/app/empresa/ofertas/onchain-actions.ts (Sepolia).
//
// Mesma regra de ouro do lado EVM: nada aqui confia no que o cliente diz. A autenticidade da
// publicação sai de duas leituras independentes da própria rede:
//   1. o evento `OfertaCriada` nos logs da transação, aceito SÓ quando quem estava executando no
//      momento do "Program data:" era o programa niara-pmes-solana (pilha de invoke) — outro
//      programa não consegue forjar um evento citando o nosso endereço;
//   2. a conta da oferta, lida direto da rede, com dono = o programa (o runtime da Solana só deixa o
//      próprio programa criar e escrever contas que ele possui).
import { PublicKey } from "@solana/web3.js";
import { conexaoSolana, normalizarOferta, programaPmes, type OfertaSolana } from "./program";
import { PMES_SOLANA_PROGRAM_ID } from "./config";
import { descreverErroSolana } from "./errors";

export type OfertaCriadaEvento = {
  oferta: string;
  emissor: string;
  mintCota: string;
  empresa: string;
  cnpjRefHex: string;
  serie: string;
  metaMinima: bigint;
  metaMaxima: bigint;
  precoPorCota: bigint;
  prazo: number;
  taxaBps: number;
};

export type LeituraTxPublicacao =
  | { status: "nao-encontrada"; jaExpirou: boolean }
  | { status: "falhou"; motivo: string }
  | { status: "ok"; eventos: OfertaCriadaEvento[] };

/** "Program data:" emitidos pelo NOSSO programa (topo da pilha de invoke no momento do log). */
function dadosDoPrograma(logs: string[]): string[] {
  const id = PMES_SOLANA_PROGRAM_ID.toBase58();
  const pilha: string[] = [];
  const dados: string[] = [];
  for (const linha of logs) {
    const invoke = /^Program (\S+) invoke \[\d+\]$/.exec(linha);
    if (invoke) {
      pilha.push(invoke[1]);
      continue;
    }
    if (/^Program \S+ (success|failed)/.test(linha)) {
      pilha.pop();
      continue;
    }
    if (linha.startsWith("Program data: ") && pilha[pilha.length - 1] === id) {
      dados.push(linha.slice("Program data: ".length).trim());
    }
  }
  return dados;
}

const big = (v: { toString(): string }) => BigInt(v.toString());

export async function lerTxPublicacao(assinatura: string): Promise<LeituraTxPublicacao> {
  const connection = conexaoSolana();
  const tx = await connection.getTransaction(assinatura, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });

  if (!tx) {
    // Distingue "ainda não chegou" de "nunca vai chegar": sem status nenhum E com o blockhash da
    // transação já vencido, ela não entra mais na rede. Quem decide o que fazer com isso é o
    // chamador (ver confirmarPublicacaoSolana).
    const status = await connection.getSignatureStatus(assinatura, { searchTransactionHistory: true });
    return { status: "nao-encontrada", jaExpirou: status.value === null };
  }

  const logs = tx.meta?.logMessages ?? [];
  if (tx.meta?.err) {
    return { status: "falhou", motivo: descreverErroSolana({ logs, err: tx.meta.err }) };
  }

  const coder = programaPmes(connection).coder;
  const eventos: OfertaCriadaEvento[] = [];
  for (const base64 of dadosDoPrograma(logs)) {
    const evento = coder.events.decode(base64);
    if (!evento || evento.name !== "ofertaCriada") continue;
    const d = evento.data as Record<string, unknown> & {
      oferta: PublicKey;
      emissor: PublicKey;
      mintCota: PublicKey;
      cnpjRef: number[];
    };
    eventos.push({
      oferta: d.oferta.toBase58(),
      emissor: d.emissor.toBase58(),
      mintCota: d.mintCota.toBase58(),
      empresa: String(d.empresa),
      cnpjRefHex: `0x${d.cnpjRef.map((b) => b.toString(16).padStart(2, "0")).join("")}`,
      serie: String(d.serie),
      metaMinima: big(d.metaMinima as { toString(): string }),
      metaMaxima: big(d.metaMaxima as { toString(): string }),
      precoPorCota: big(d.precoPorCota as { toString(): string }),
      prazo: Number((d.prazo as { toString(): string }).toString()),
      taxaBps: Number(d.taxaBps),
    });
  }
  return { status: "ok", eventos };
}

/** Conta da oferta lida da rede, só se o dono for o programa niara-pmes-solana. */
export async function lerContaOfertaVerificada(endereco: string): Promise<OfertaSolana | null> {
  const connection = conexaoSolana();
  const chave = new PublicKey(endereco);
  const info = await connection.getAccountInfo(chave, "confirmed");
  if (!info || !info.owner.equals(PMES_SOLANA_PROGRAM_ID)) return null;
  const conta = programaPmes(connection).coder.accounts.decode("oferta", info.data);
  return normalizarOferta(chave, conta);
}

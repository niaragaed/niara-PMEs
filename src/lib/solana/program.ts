// Cliente do programa `niara-pmes-solana` (Anchor) — usado tanto no navegador (hooks de leitura e
// escrita) quanto no servidor (loaders e verificação de publicação). Nada aqui assina nem envia
// transação: isso fica em ./phantom.ts (cliente) — o servidor só lê.
//
// Usa o coder do próprio Anchor a partir do IDL gerado pelo `anchor build` (copiado de
// niaragaed/niara-pmes-solana/idl/), em vez de codificar instruções à mão: são 9 instruções e 4
// tipos de conta, e o IDL é a fonte única dos discriminadores e do layout Borsh. Se o programa
// mudar, basta copiar o IDL novo para ./idl/.
import { BN, Program, type IdlAccounts, type Provider } from "@anchor-lang/core";
import { Connection, PublicKey } from "@solana/web3.js";
import idlJson from "./idl/niara_pmes_solana.json";
import type { NiaraPmesSolana } from "./idl/niara_pmes_solana";
import { PMES_SOLANA_PROGRAM_ID, SOLANA_RPC_URL } from "./config";

export const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

export function conexaoSolana(): Connection {
  return new Connection(SOLANA_RPC_URL, "confirmed");
}

/** Programa só de leitura/montagem de instrução — sem carteira (quem assina é a Phantom). */
export function programaPmes(connection: Connection): Program<NiaraPmesSolana> {
  const idl = { ...(idlJson as NiaraPmesSolana), address: PMES_SOLANA_PROGRAM_ID.toBase58() };
  return new Program<NiaraPmesSolana>(idl, { connection } as Provider);
}

// ── PDAs (mesmas seeds de programs/niara-pmes-solana/src/constants.rs) ─────────────────────────

const enc = (s: string) => new TextEncoder().encode(s);
const pda = (...seeds: Uint8Array[]) => PublicKey.findProgramAddressSync(seeds, PMES_SOLANA_PROGRAM_ID)[0];

export const pdaConfig = () => pda(enc("config"));
export const pdaMintMbrl = () => pda(enc("mbrl"));
export const pdaEmissor = (wallet: PublicKey) => pda(enc("emissor"), wallet.toBytes());
export const pdaPosicao = (oferta: PublicKey, investidor: PublicKey) => pda(enc("posicao"), oferta.toBytes(), investidor.toBytes());
export function pdaOferta(emissorWallet: PublicKey, indice: number): PublicKey {
  const idx = new Uint8Array(4);
  new DataView(idx.buffer).setUint32(0, indice, true);
  return pda(enc("oferta"), emissorWallet.toBytes(), idx);
}

/** Conta associada de token (ATA) — derivação padrão, sem depender de @solana/spl-token. */
export function ata(dono: PublicKey, mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([dono.toBytes(), TOKEN_PROGRAM_ID.toBytes(), mint.toBytes()], ASSOCIATED_TOKEN_PROGRAM_ID)[0];
}

// ── Tipos normalizados (bigint/strings, sem BN nem PublicKey vazando para a UI) ─────────────────

export type EstadoOfertaSolana = "Aberta" | "EncerradaSucesso" | "EncerradaFalha";

export type OfertaSolana = {
  endereco: string;
  emissor: string;
  indice: number;
  mintCota: string;
  cofre: string;
  nome: string;
  simbolo: string;
  empresa: string;
  serie: string;
  cnpjRefHex: string;
  metaMinima: bigint;
  metaMaxima: bigint;
  precoPorCota: bigint;
  abertura: number;
  prazo: number;
  tetoPorInvestidor: bigint;
  taxaBps: number;
  protocoloWallet: string;
  estado: EstadoOfertaSolana;
  pausada: boolean;
  totalArrecadado: bigint;
  totalInvestidores: number;
  recursosLiberados: boolean;
};

type ContaOferta = IdlAccounts<NiaraPmesSolana>["oferta"];

const big = (v: BN) => BigInt(v.toString());

function estadoDe(conta: ContaOferta["estado"]): EstadoOfertaSolana {
  if ("encerradaSucesso" in conta) return "EncerradaSucesso";
  if ("encerradaFalha" in conta) return "EncerradaFalha";
  return "Aberta";
}

function hex(bytes: number[]): string {
  return `0x${bytes.map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export function normalizarOferta(endereco: PublicKey, o: ContaOferta): OfertaSolana {
  return {
    endereco: endereco.toBase58(),
    emissor: o.emissor.toBase58(),
    indice: o.indice,
    mintCota: o.mintCota.toBase58(),
    cofre: o.cofre.toBase58(),
    nome: o.nome,
    simbolo: o.simbolo,
    empresa: o.empresa,
    serie: o.serie,
    cnpjRefHex: hex(o.cnpjRef),
    metaMinima: big(o.metaMinima),
    metaMaxima: big(o.metaMaxima),
    precoPorCota: big(o.precoPorCota),
    abertura: o.abertura.toNumber(),
    prazo: o.prazo.toNumber(),
    tetoPorInvestidor: big(o.tetoPorInvestidor),
    taxaBps: o.taxaBps,
    protocoloWallet: o.protocoloWallet.toBase58(),
    estado: estadoDe(o.estado),
    pausada: o.pausada,
    totalArrecadado: big(o.totalArrecadado),
    totalInvestidores: o.totalInvestidores,
    recursosLiberados: o.recursosLiberados,
  };
}

export async function lerOfertaSolana(connection: Connection, endereco: string): Promise<OfertaSolana | null> {
  const chave = new PublicKey(endereco);
  const conta = await programaPmes(connection).account.oferta.fetchNullable(chave);
  return conta ? normalizarOferta(chave, conta) : null;
}

/** Todas as ofertas do programa (getProgramAccounts filtrado pelo discriminador da conta). */
export async function listarOfertasSolana(connection: Connection): Promise<OfertaSolana[]> {
  const todas = await programaPmes(connection).account.oferta.all();
  return todas.map(({ publicKey, account }) => normalizarOferta(publicKey, account));
}

export type PosicaoSolana = { aportado: bigint; cotasResgatadas: boolean; reembolsado: boolean };

export async function lerPosicaoSolana(connection: Connection, oferta: string, investidor: string): Promise<PosicaoSolana> {
  const conta = await programaPmes(connection).account.posicao.fetchNullable(
    pdaPosicao(new PublicKey(oferta), new PublicKey(investidor)),
  );
  if (!conta) return { aportado: BigInt(0), cotasResgatadas: false, reembolsado: false };
  return { aportado: big(conta.aportado), cotasResgatadas: conta.cotasResgatadas, reembolsado: conta.reembolsado };
}

export type EmissorSolana = { autorizado: boolean; ofertaAberta: string | null; totalOfertas: number };

export async function lerEmissorSolana(connection: Connection, wallet: string): Promise<EmissorSolana | null> {
  const conta = await programaPmes(connection).account.emissor.fetchNullable(pdaEmissor(new PublicKey(wallet)));
  if (!conta) return null;
  return { autorizado: conta.autorizado, ofertaAberta: conta.ofertaAberta?.toBase58() ?? null, totalOfertas: conta.totalOfertas };
}

/** Saldo de uma conta de token SPL; conta inexistente = 0 (nunca lança por isso). */
export async function saldoTokenSolana(connection: Connection, conta: PublicKey): Promise<bigint> {
  const info = await connection.getAccountInfo(conta, "confirmed");
  if (!info) return BigInt(0);
  const r = await connection.getTokenAccountBalance(conta, "confirmed");
  return BigInt(r.value.amount);
}

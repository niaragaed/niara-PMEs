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
import { SMES_SOLANA_PROGRAM_ID, SOLANA_RPC_URL } from "./config";

export const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

export function solanaConnection(): Connection {
  return new Connection(SOLANA_RPC_URL, "confirmed");
}

/** Programa só de leitura/montagem de instrução — sem carteira (quem assina é a Phantom). */
export function smesProgram(connection: Connection): Program<NiaraPmesSolana> {
  const idl = { ...(idlJson as NiaraPmesSolana), address: SMES_SOLANA_PROGRAM_ID.toBase58() };
  return new Program<NiaraPmesSolana>(idl, { connection } as Provider);
}

// ── PDAs (mesmas seeds de programs/niara-pmes-solana/src/constants.rs) ─────────────────────────

const enc = (s: string) => new TextEncoder().encode(s);
const pda = (...seeds: Uint8Array[]) => PublicKey.findProgramAddressSync(seeds, SMES_SOLANA_PROGRAM_ID)[0];

export const pdaConfig = () => pda(enc("config"));
export const pdaMintMbrl = () => pda(enc("mbrl"));
export const issuerPda = (wallet: PublicKey) => pda(enc("emissor"), wallet.toBytes());
export const positionPda = (offering: PublicKey, investor: PublicKey) => pda(enc("posicao"), offering.toBytes(), investor.toBytes());
export function offeringPda(issuerWallet: PublicKey, index: number): PublicKey {
  const idx = new Uint8Array(4);
  new DataView(idx.buffer).setUint32(0, index, true);
  return pda(enc("oferta"), issuerWallet.toBytes(), idx);
}

/** Conta associada de token (ATA) — derivação padrão, sem depender de @solana/spl-token. */
export function minutes(owner: PublicKey, mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([owner.toBytes(), TOKEN_PROGRAM_ID.toBytes(), mint.toBytes()], ASSOCIATED_TOKEN_PROGRAM_ID)[0];
}

// ── Tipos normalizados (bigint/strings, sem BN nem PublicKey vazando para a UI) ─────────────────

export type SolanaOfferingState = "Aberta" | "EncerradaSucesso" | "EncerradaFalha";

export type SolanaOffering = {
  address: string;
  issuer: string;
  index: number;
  shareMint: string;
  vault: string;
  name: string;
  symbol: string;
  company: string;
  series: string;
  cnpjRefHex: string;
  minTarget: bigint;
  maxTarget: bigint;
  pricePerShare: bigint;
  opening: number;
  deadline: number;
  capPerInvestor: bigint;
  feeBps: number;
  protocolWallet: string;
  state: SolanaOfferingState;
  paused: boolean;
  totalRaised: bigint;
  totalInvestors: number;
  fundsReleased: boolean;
};

type OfferingAccount = IdlAccounts<NiaraPmesSolana>["oferta"];

const big = (v: BN) => BigInt(v.toString());

function stateOf(account: OfferingAccount["estado"]): SolanaOfferingState {
  if ("encerradaSucesso" in account) return "EncerradaSucesso";
  if ("encerradaFalha" in account) return "EncerradaFalha";
  return "Aberta";
}

function hex(bytes: number[]): string {
  return `0x${bytes.map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export function normalizeOffering(address: PublicKey, o: OfferingAccount): SolanaOffering {
  return {
    address: address.toBase58(),
    issuer: o.emissor.toBase58(),
    index: o.indice,
    shareMint: o.mintCota.toBase58(),
    vault: o.cofre.toBase58(),
    name: o.nome,
    symbol: o.simbolo,
    company: o.empresa,
    series: o.serie,
    cnpjRefHex: hex(o.cnpjRef),
    minTarget: big(o.metaMinima),
    maxTarget: big(o.metaMaxima),
    pricePerShare: big(o.precoPorCota),
    opening: o.abertura.toNumber(),
    deadline: o.prazo.toNumber(),
    capPerInvestor: big(o.tetoPorInvestidor),
    feeBps: o.taxaBps,
    protocolWallet: o.protocoloWallet.toBase58(),
    state: stateOf(o.estado),
    paused: o.pausada,
    totalRaised: big(o.totalArrecadado),
    totalInvestors: o.totalInvestidores,
    fundsReleased: o.recursosLiberados,
  };
}

export async function readSolanaOffering(connection: Connection, address: string): Promise<SolanaOffering | null> {
  const key = new PublicKey(address);
  const account = await smesProgram(connection).account.oferta.fetchNullable(key);
  return account ? normalizeOffering(key, account) : null;
}

/** Todas as ofertas do programa (getProgramAccounts filtrado pelo discriminador da conta). */
export async function listSolanaOfferings(connection: Connection): Promise<SolanaOffering[]> {
  const all = await smesProgram(connection).account.oferta.all();
  return all.map(({ publicKey, account }) => normalizeOffering(publicKey, account));
}

export type SolanaPosition = { invested: bigint; sharesRedeemed: boolean; refunded: boolean };

export async function readSolanaPosition(connection: Connection, offering: string, investor: string): Promise<SolanaPosition> {
  const account = await smesProgram(connection).account.posicao.fetchNullable(
    positionPda(new PublicKey(offering), new PublicKey(investor)),
  );
  if (!account) return { invested: BigInt(0), sharesRedeemed: false, refunded: false };
  return { invested: big(account.aportado), sharesRedeemed: account.cotasResgatadas, refunded: account.reembolsado };
}

export type SolanaIssuer = { authorized: boolean; openOffering: string | null; totalOfferings: number };

export async function readSolanaIssuer(connection: Connection, wallet: string): Promise<SolanaIssuer | null> {
  const account = await smesProgram(connection).account.emissor.fetchNullable(issuerPda(new PublicKey(wallet)));
  if (!account) return null;
  return { authorized: account.autorizado, openOffering: account.ofertaAberta?.toBase58() ?? null, totalOfferings: account.totalOfertas };
}

/** Saldo de uma conta de token SPL; conta inexistente = 0 (nunca lança por isso). */
export async function solanaTokenBalance(connection: Connection, account: PublicKey): Promise<bigint> {
  const info = await connection.getAccountInfo(account, "confirmed");
  if (!info) return BigInt(0);
  const r = await connection.getTokenAccountBalance(account, "confirmed");
  return BigInt(r.value.amount);
}

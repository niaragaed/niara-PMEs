// Building the niara-pmes-solana transactions. Each function returns a Transaction ready for
// signAndSend() (phantom.ts) — none of them signs or sends on its own.
//
// Every account that depends on on-chain data (the offering's issuer, vault, shares mint,
// protocol wallet) comes from the offering read done by the caller and is passed
// explicitly, instead of letting the Anchor resolver fetch it again from the network. The program
// checks each one (seeds/`address = oferta.cofre` etc.) — passing a wrong account only makes the
// transaction fail, it never diverts value.
import { BN } from "@anchor-lang/core";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { minutes, issuerPda, pdaMintMbrl, offeringPda, smesProgram, type SolanaOffering } from "./program";

const pk = (v: string) => new PublicKey(v);
const bn = (v: bigint) => new BN(v.toString());

export async function txFaucet(connection: Connection, user: string, value: bigint): Promise<Transaction> {
  return smesProgram(connection)
    .methods.faucetMbrl(bn(value))
    .accountsPartial({ usuario: pk(user), mintMoeda: pdaMintMbrl() })
    .transaction();
}

export async function txInvest(connection: Connection, investor: string, offering: SolanaOffering, value: bigint): Promise<Transaction> {
  const mint = pdaMintMbrl();
  return smesProgram(connection)
    .methods.aportar(bn(value))
    .accountsPartial({
      investidor: pk(investor),
      oferta: pk(offering.address),
      origem: minutes(pk(investor), mint),
      cofre: pk(offering.vault),
      mintMoeda: mint,
    })
    .transaction();
}

export async function txClose(connection: Connection, offering: SolanaOffering): Promise<Transaction> {
  return smesProgram(connection)
    .methods.encerrar()
    .accountsPartial({ oferta: pk(offering.address), emissor: issuerPda(pk(offering.issuer)) })
    .transaction();
}

export async function txRedeem(connection: Connection, investor: string, offering: SolanaOffering): Promise<Transaction> {
  return smesProgram(connection)
    .methods.resgatarCotas()
    .accountsPartial({ investidor: pk(investor), oferta: pk(offering.address), mintCota: pk(offering.shareMint) })
    .transaction();
}

export async function txRefund(connection: Connection, investor: string, offering: SolanaOffering): Promise<Transaction> {
  return smesProgram(connection)
    .methods.reembolsar()
    .accountsPartial({
      investidor: pk(investor),
      oferta: pk(offering.address),
      cofre: pk(offering.vault),
      mintMoeda: pdaMintMbrl(),
    })
    .transaction();
}

export async function txRelease(connection: Connection, payer: string, offering: SolanaOffering): Promise<Transaction> {
  return smesProgram(connection)
    .methods.liberarParaEmissor()
    .accountsPartial({
      pagador: pk(payer),
      oferta: pk(offering.address),
      cofre: pk(offering.vault),
      mintMoeda: pdaMintMbrl(),
      emissorWallet: pk(offering.issuer),
      protocoloWallet: pk(offering.protocolWallet),
    })
    .transaction();
}

export type CreateOfferingParams = {
  name: string;
  symbol: string;
  company: string;
  /** keccak256(CNPJ) in hex 0x… — the same `cnpjRef` as the Sepolia publication. */
  cnpjRefHex: string;
  series: string;
  minTarget: bigint;
  maxTarget: bigint;
  pricePerShare: bigint;
  deadlineUnix: number;
};

/**
 * `offeringIndex` = `Emissor.total_ofertas` read now: it's the seed of this issuer's next offering.
 * Also returns the address the offering will have, for the caller to show/check later.
 */
export async function txCreateOffering(
  connection: Connection,
  issuerWallet: string,
  offeringIndex: number,
  p: CreateOfferingParams,
): Promise<{ tx: Transaction; oferta: string }> {
  const clean = p.cnpjRefHex.replace(/^0x/, "");
  if (!/^[0-9a-fA-F]{64}$/.test(clean)) throw new Error("Invalid cnpjRef.");
  const cnpjRef = Array.from({ length: 32 }, (_, i) => parseInt(clean.slice(i * 2, i * 2 + 2), 16));
  const wallet = pk(issuerWallet);
  const offering = offeringPda(wallet, offeringIndex);

  const tx = await smesProgram(connection)
    .methods.criarOferta({
      nome: p.name,
      simbolo: p.symbol,
      empresa: p.company,
      cnpjRef,
      serie: p.series,
      metaMinima: bn(p.minTarget),
      metaMaxima: bn(p.maxTarget),
      precoPorCota: bn(p.pricePerShare),
      prazo: new BN(p.deadlineUnix),
    })
    .accountsPartial({ emissorWallet: wallet, emissor: issuerPda(wallet), oferta: offering, mintMoeda: pdaMintMbrl() })
    .transaction();
  return { tx, oferta: offering.toBase58() };
}

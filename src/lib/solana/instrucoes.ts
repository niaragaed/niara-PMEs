// Montagem das transações do niara-pmes-solana. Cada função devolve uma Transaction pronta para
// assinarEEnviar() (phantom.ts) — nenhuma assina nem envia sozinha.
//
// Todas as contas que dependem de dados on-chain (emissor da oferta, cofre, mint de cotas,
// carteira do protocolo) vêm da leitura da oferta feita pelo chamador e são passadas
// explicitamente, em vez de deixar o resolvedor do Anchor buscar de novo na rede. O programa
// confere cada uma (seeds/`address = oferta.cofre` etc.) — passar uma conta errada só faz a
// transação falhar, nunca desviar valor.
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
  /** keccak256(CNPJ) em hex 0x… — o mesmo `cnpjRef` da publicação na Sepolia. */
  cnpjRefHex: string;
  series: string;
  minTarget: bigint;
  maxTarget: bigint;
  pricePerShare: bigint;
  deadlineUnix: number;
};

/**
 * `indiceOferta` = `Emissor.total_ofertas` lido agora: é a seed da próxima oferta deste emissor.
 * Devolve também o endereço que a oferta vai ter, para o chamador mostrar/conferir depois.
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

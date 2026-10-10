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
import { ata, pdaEmissor, pdaMintMbrl, pdaOferta, programaPmes, type OfertaSolana } from "./program";

const pk = (v: string) => new PublicKey(v);
const bn = (v: bigint) => new BN(v.toString());

export async function txFaucet(connection: Connection, usuario: string, valor: bigint): Promise<Transaction> {
  return programaPmes(connection)
    .methods.faucetMbrl(bn(valor))
    .accountsPartial({ usuario: pk(usuario), mintMoeda: pdaMintMbrl() })
    .transaction();
}

export async function txAportar(connection: Connection, investidor: string, oferta: OfertaSolana, valor: bigint): Promise<Transaction> {
  const mint = pdaMintMbrl();
  return programaPmes(connection)
    .methods.aportar(bn(valor))
    .accountsPartial({
      investidor: pk(investidor),
      oferta: pk(oferta.endereco),
      origem: ata(pk(investidor), mint),
      cofre: pk(oferta.cofre),
      mintMoeda: mint,
    })
    .transaction();
}

export async function txEncerrar(connection: Connection, oferta: OfertaSolana): Promise<Transaction> {
  return programaPmes(connection)
    .methods.encerrar()
    .accountsPartial({ oferta: pk(oferta.endereco), emissor: pdaEmissor(pk(oferta.emissor)) })
    .transaction();
}

export async function txResgatar(connection: Connection, investidor: string, oferta: OfertaSolana): Promise<Transaction> {
  return programaPmes(connection)
    .methods.resgatarCotas()
    .accountsPartial({ investidor: pk(investidor), oferta: pk(oferta.endereco), mintCota: pk(oferta.mintCota) })
    .transaction();
}

export async function txReembolsar(connection: Connection, investidor: string, oferta: OfertaSolana): Promise<Transaction> {
  return programaPmes(connection)
    .methods.reembolsar()
    .accountsPartial({
      investidor: pk(investidor),
      oferta: pk(oferta.endereco),
      cofre: pk(oferta.cofre),
      mintMoeda: pdaMintMbrl(),
    })
    .transaction();
}

export async function txLiberar(connection: Connection, pagador: string, oferta: OfertaSolana): Promise<Transaction> {
  return programaPmes(connection)
    .methods.liberarParaEmissor()
    .accountsPartial({
      pagador: pk(pagador),
      oferta: pk(oferta.endereco),
      cofre: pk(oferta.cofre),
      mintMoeda: pdaMintMbrl(),
      emissorWallet: pk(oferta.emissor),
      protocoloWallet: pk(oferta.protocoloWallet),
    })
    .transaction();
}

export type ParametrosCriarOferta = {
  nome: string;
  simbolo: string;
  empresa: string;
  /** keccak256(CNPJ) em hex 0x… — o mesmo `cnpjRef` da publicação na Sepolia. */
  cnpjRefHex: string;
  serie: string;
  metaMinima: bigint;
  metaMaxima: bigint;
  precoPorCota: bigint;
  prazoUnix: number;
};

/**
 * `indiceOferta` = `Emissor.total_ofertas` lido agora: é a seed da próxima oferta deste emissor.
 * Devolve também o endereço que a oferta vai ter, para o chamador mostrar/conferir depois.
 */
export async function txCriarOferta(
  connection: Connection,
  emissorWallet: string,
  indiceOferta: number,
  p: ParametrosCriarOferta,
): Promise<{ tx: Transaction; oferta: string }> {
  const limpo = p.cnpjRefHex.replace(/^0x/, "");
  if (!/^[0-9a-fA-F]{64}$/.test(limpo)) throw new Error("cnpjRef inválido.");
  const cnpjRef = Array.from({ length: 32 }, (_, i) => parseInt(limpo.slice(i * 2, i * 2 + 2), 16));
  const wallet = pk(emissorWallet);
  const oferta = pdaOferta(wallet, indiceOferta);

  const tx = await programaPmes(connection)
    .methods.criarOferta({
      nome: p.nome,
      simbolo: p.simbolo,
      empresa: p.empresa,
      cnpjRef,
      serie: p.serie,
      metaMinima: bn(p.metaMinima),
      metaMaxima: bn(p.metaMaxima),
      precoPorCota: bn(p.precoPorCota),
      prazo: new BN(p.prazoUnix),
    })
    .accountsPartial({ emissorWallet: wallet, emissor: pdaEmissor(wallet), oferta, mintMoeda: pdaMintMbrl() })
    .transaction();
  return { tx, oferta: oferta.toBase58() };
}

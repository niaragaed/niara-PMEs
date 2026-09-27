"use server";

// Server Actions da Fase 3, sub-etapa 4 (ver PLANO_FASE_3_PUBLICACAO_ONCHAIN.md) — publicação
// self-service da oferta em Sepolia. REGRA DE OURO: nenhuma delas aceita de ninguém o valor
// final de contract_address/token_address/onchain_emissor_wallet — esses três só saem de uma
// leitura verificada do próprio servidor contra a chain (confirmarPublicacao), nunca de um
// parâmetro. issuer_id/accountId sempre vem de resolveAccount() (sessão no servidor), nunca do
// cliente — mesmo padrão de toda outra Server Action deste projeto.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { decodeEventLog, TransactionReceiptNotFoundError } from "viem";
import { resolveAccount } from "@/lib/auth/resolveInvestor";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrquestradorContract, ORQUESTRADOR_CHAIN_ID } from "@/lib/web3/orquestrador";
import { publicClient } from "@/lib/web3/eventsCore";
import { describeOnChainError } from "@/lib/web3/errors";
import { UNIDADE_ON_CHAIN } from "@/lib/web3/gates";

export type RegistrarTentativaState = { status: "success" } | { status: "error"; message: string };

const registrarTentativaSchema = z.object({
  offeringId: z.string().uuid(),
  txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/, "Hash de transação inválido."),
  prazoUnixSeconds: z.number().int().positive(),
});

/**
 * Chamada pelo client assim que a wallet devolve o hash da transação — ANTES de esperar
 * confirmação (cobre o caso "usuário fecha a aba logo após assinar": o hash já fica salvo).
 * `prazoUnixSeconds` é o mesmo valor exato usado como argumento `prazo` da transação (calculado
 * no client, uma única vez, imediatamente antes de montar a chamada) — grava opens_at/closes_at
 * com ele para "congelar" a janela real que foi para a chain, já que a oferta on-chain é
 * imutável e a linha do Supabase não é (ver seção 5 do plano).
 */
export async function registrarTentativa(input: unknown): Promise<RegistrarTentativaState> {
  const { role, accountId } = await resolveAccount();
  if (role !== "issuer" || !accountId) {
    return { status: "error", message: "Apenas empresas cadastradas podem publicar ofertas." };
  }

  const parsed = registrarTentativaSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Dados inválidos para registrar a publicação." };
  }
  const { offeringId, txHash, prazoUnixSeconds } = parsed.data;

  const admin = createAdminClient();
  const opensAt = new Date();
  const closesAt = new Date(prazoUnixSeconds * 1000);

  // Atômico: quem chegar primeiro numa corrida de dois cliques ganha (mesmo padrão de
  // activateOffering) — a condição `sync_status='nao_onchain'` garante que só a PRIMEIRA
  // tentativa é registrada.
  const { data, error } = await admin
    .from("offerings")
    .update({
      tx_hash: txHash,
      chain_id: ORQUESTRADOR_CHAIN_ID,
      sync_status: "pendente",
      opens_at: opensAt.toISOString(),
      closes_at: closesAt.toISOString(),
    })
    .eq("id", offeringId)
    .eq("issuer_id", accountId)
    .eq("sync_status", "nao_onchain")
    .select("id");

  if (error) {
    console.error("registrarTentativa: erro inesperado do banco", error);
    return { status: "error", message: "Não foi possível registrar a tentativa de publicação." };
  }
  if (!data || data.length === 0) {
    return { status: "error", message: "Já existe uma tentativa de publicação em andamento para esta oferta." };
  }

  revalidatePath(`/empresa/ofertas/${offeringId}/publicar`);
  return { status: "success" };
}

export type ConfirmarPublicacaoState =
  | { status: "pendente" }
  | { status: "confirmada"; contractAddress: string; tokenAddress: string }
  | { status: "revertida"; motivo: string }
  | { status: "divergente"; motivo: string }
  | { status: "error"; message: string };

/**
 * Nunca confia em nada vindo do client além do `offeringId`. Lê o `tx_hash` da própria linha,
 * busca o recibo no servidor, confere que é uma chamada bem-sucedida ao endereço esperado do
 * orquestrador, decodifica o evento `OfertaCompletaCriada` e só grava `contract_address`/
 * `token_address`/`onchain_emissor_wallet` depois de conferir que os parâmetros do evento
 * batem com os que a própria oferta tinha no momento em que a transação foi montada (ver
 * `registrarTentativa`) — nunca uma alegação aceita de ninguém, sempre uma leitura verificada.
 */
export async function confirmarPublicacao(offeringId: string): Promise<ConfirmarPublicacaoState> {
  const { role, accountId } = await resolveAccount();
  if (role !== "issuer" || !accountId) {
    return { status: "error", message: "Apenas empresas cadastradas podem confirmar publicações." };
  }

  const parsedId = z.string().uuid().safeParse(offeringId);
  if (!parsedId.success) {
    return { status: "error", message: "Oferta inválida." };
  }

  const admin = createAdminClient();
  const { data: offering, error: fetchError } = await admin
    .from("offerings")
    .select("id, tx_hash, sync_status, target_min_cents, hard_cap_cents, share_price_cents, closes_at, contract_address, token_address")
    .eq("id", parsedId.data)
    .eq("issuer_id", accountId)
    .maybeSingle();

  if (fetchError || !offering) {
    return { status: "error", message: "Oferta não encontrada." };
  }

  if (offering.sync_status === "confirmada") {
    // Idempotente: já confirmada antes (ex.: o client chamou de novo à toa) — só devolve o
    // que já está gravado, sem tocar a chain de novo.
    return {
      status: "confirmada",
      contractAddress: offering.contract_address as string,
      tokenAddress: offering.token_address as string,
    };
  }
  if (offering.sync_status !== "pendente" || !offering.tx_hash) {
    return { status: "error", message: "Esta oferta não está com uma publicação pendente." };
  }

  const orquestrador = getOrquestradorContract();
  if (!orquestrador) {
    return { status: "error", message: "Contrato não configurado." };
  }

  const client = publicClient();

  let receipt;
  try {
    receipt = await client.getTransactionReceipt({ hash: offering.tx_hash as `0x${string}` });
  } catch (e) {
    if (e instanceof TransactionReceiptNotFoundError) {
      return { status: "pendente" };
    }
    // RPC fora do ar, timeout etc. — nunca confundir com "ainda minerando".
    return { status: "error", message: describeOnChainError(e) };
  }

  if (receipt.to?.toLowerCase() !== orquestrador.address.toLowerCase()) {
    const motivo = "O recibo desta transação não corresponde ao contrato OfertaOrquestrador esperado.";
    await marcarDivergente(admin, parsedId.data, accountId, motivo);
    return { status: "divergente", motivo };
  }

  if (receipt.status === "reverted") {
    await admin
      .from("offerings")
      .update({ sync_status: "nao_onchain", tx_hash: null, onchain_last_error: "A transação reverteu on-chain." })
      .eq("id", parsedId.data)
      .eq("issuer_id", accountId)
      .eq("sync_status", "pendente");
    revalidatePath(`/empresa/ofertas/${parsedId.data}/publicar`);
    return { status: "revertida", motivo: "A transação reverteu on-chain — tente publicar de novo." };
  }

  const log = receipt.logs.find((l) => l.address.toLowerCase() === orquestrador.address.toLowerCase());
  if (!log) {
    const motivo = "Nenhum evento do OfertaOrquestrador encontrado neste recibo.";
    await marcarDivergente(admin, parsedId.data, accountId, motivo);
    return { status: "divergente", motivo };
  }

  let decoded;
  try {
    decoded = decodeEventLog({ abi: orquestrador.abi, data: log.data, topics: log.topics, eventName: "OfertaCompletaCriada" });
  } catch {
    const motivo = "Não foi possível decodificar o evento OfertaCompletaCriada deste recibo.";
    await marcarDivergente(admin, parsedId.data, accountId, motivo);
    return { status: "divergente", motivo };
  }

  const { emissor, token, oferta, metaMinima, metaMaxima, precoPorCota, prazo } = decoded.args;

  const metaMinimaEsperada = BigInt(offering.target_min_cents) * UNIDADE_ON_CHAIN;
  const metaMaximaEsperada = BigInt(offering.hard_cap_cents) * UNIDADE_ON_CHAIN;
  const precoPorCotaEsperado = BigInt(offering.share_price_cents as number) * UNIDADE_ON_CHAIN;
  const prazoEsperado = BigInt(Math.floor(new Date(offering.closes_at as string).getTime() / 1000));

  if (
    metaMinima !== metaMinimaEsperada ||
    metaMaxima !== metaMaximaEsperada ||
    precoPorCota !== precoPorCotaEsperado ||
    prazo !== prazoEsperado
  ) {
    const motivo = "Os parâmetros do evento on-chain não batem com os desta oferta no Supabase.";
    await marcarDivergente(admin, parsedId.data, accountId, motivo);
    return { status: "divergente", motivo };
  }

  const { error: updateError } = await admin
    .from("offerings")
    .update({
      contract_address: oferta,
      token_address: token,
      onchain_emissor_wallet: emissor,
      sync_status: "confirmada",
      onchain_confirmed_at: new Date().toISOString(),
    })
    .eq("id", parsedId.data)
    .eq("issuer_id", accountId)
    .eq("sync_status", "pendente");

  if (updateError) {
    console.error("confirmarPublicacao: erro ao gravar confirmação", updateError);
    return { status: "error", message: "A transação confirmou on-chain, mas não foi possível gravar no banco — tente de novo." };
  }

  revalidatePath(`/empresa/ofertas/${parsedId.data}/publicar`);
  return { status: "confirmada", contractAddress: oferta, tokenAddress: token };
}

async function marcarDivergente(
  admin: ReturnType<typeof createAdminClient>,
  offeringId: string,
  accountId: string,
  motivo: string,
) {
  await admin
    .from("offerings")
    .update({ sync_status: "divergente", onchain_last_error: motivo })
    .eq("id", offeringId)
    .eq("issuer_id", accountId)
    .eq("sync_status", "pendente");
  revalidatePath(`/empresa/ofertas/${offeringId}/publicar`);
}

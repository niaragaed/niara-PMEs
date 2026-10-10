"use server";

// Server Actions da publicação self-service na Solana Devnet — par de onchain-actions.ts (Sepolia),
// com as MESMAS regras de ouro (ler o cabeçalho daquele arquivo antes de mexer aqui):
//   - contract_address/token_address/onchain_emissor_wallet nunca vêm do cliente: só de leitura
//     verificada do próprio servidor contra a rede (confirmarPublicacaoSolana);
//   - issuer_id/accountId sempre de resolveAccount();
//   - o emissor do evento é comparado com `expected_emissor_wallet`, congelado por
//     registrarTentativaSolana a partir de issuers.solana_wallet_address lido AQUI, nunca com uma
//     releitura ao vivo.
//
// Diferenças de mecânica em relação à Sepolia:
//   - A assinatura da transação (o "tx_hash" da Solana) já é conhecida ANTES do envio — ela é a
//     própria assinatura do pagador. Por isso a tentativa é registrada antes de a transação ir para
//     a rede: se o registro falhar, nada é enviado e não sobra oferta órfã on-chain.
//   - Uma transação da Solana que não entra na rede até o blockhash vencer (~1–2 min) nunca mais
//     entra. confirmarPublicacaoSolana reconhece esse caso e devolve a oferta para 'nao_onchain', em
//     vez de deixá-la 'pendente' para sempre.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { resolveAccount } from "@/lib/auth/resolveInvestor";
import { createAdminClient } from "@/lib/supabase/admin";
import { BASE58_ASSINATURA, REDE_SOLANA, UNIDADE_ON_CHAIN_SOLANA } from "@/lib/solana/config";
import { keccak256, toHex } from "viem";
import { alturaDeBlocoAtual, lerContaOfertaVerificada, lerTxPublicacao } from "@/lib/solana/servidor";
import { descreverErroSolana } from "@/lib/solana/errors";
import { formatBRL } from "@/lib/format";
import type { ConfirmarPublicacaoState, RegistrarTentativaState, VerificarConsistenciaState } from "./onchain-actions";

/** Fallback (linha sem lastValidBlockHeight): depois disso sem sinal na rede, o blockhash venceu. */
const EXPIRACAO_TENTATIVA_MS = 3 * 60 * 1000;
const FOLGA_RELOGIO_S = 120;

const registrarSchema = z.object({
  offeringId: z.string().uuid(),
  assinatura: z.string().regex(BASE58_ASSINATURA, "Assinatura de transação inválida."),
  prazoUnixSeconds: z.number().int().positive(),
  /** lastValidBlockHeight do blockhash da transação assinada (só decide quando ela expirou). */
  ultimoBlocoValido: z.number().int().positive(),
});

/**
 * Chamada pelo cliente com a transação JÁ ASSINADA pela Phantom e ainda NÃO enviada. Congela
 * opens_at/closes_at (o `prazo` exato que foi para a transação) e expected_emissor_wallet
 * (issuers.solana_wallet_address lido aqui). Atômico como na Sepolia: só a primeira tentativa de
 * uma oferta 'nao_onchain' é registrada.
 */
export async function registrarTentativaSolana(input: unknown): Promise<RegistrarTentativaState> {
  const { role, accountId } = await resolveAccount();
  if (role !== "issuer" || !accountId) {
    return { status: "error", message: "Apenas empresas cadastradas podem publicar ofertas." };
  }

  const parsed = registrarSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Dados inválidos para registrar a publicação." };
  }
  const { offeringId, assinatura, prazoUnixSeconds, ultimoBlocoValido } = parsed.data;

  const admin = createAdminClient();
  const { data: issuer, error: issuerError } = await admin
    .from("issuers")
    .select("solana_wallet_address")
    .eq("id", accountId)
    .maybeSingle();
  if (issuerError) {
    console.error("registrarTentativaSolana: erro ao ler carteira do emissor", issuerError);
    return { status: "error", message: "Não foi possível registrar a tentativa de publicação." };
  }
  const walletVinculada = (issuer?.solana_wallet_address as string | null) ?? null;
  if (!walletVinculada) {
    return { status: "error", message: "Nenhuma carteira Solana vinculada a esta conta — não é possível registrar a publicação." };
  }

  const { data, error } = await admin
    .from("offerings")
    .update({
      rede: REDE_SOLANA,
      tx_hash: assinatura,
      chain_id: null,
      sync_status: "pendente",
      opens_at: new Date().toISOString(),
      closes_at: new Date(prazoUnixSeconds * 1000).toISOString(),
      expected_emissor_wallet: walletVinculada,
      solana_ultimo_bloco_valido: ultimoBlocoValido,
      onchain_last_error: null,
    })
    .eq("id", offeringId)
    .eq("issuer_id", accountId)
    .eq("sync_status", "nao_onchain")
    .select("id");

  if (error) {
    console.error("registrarTentativaSolana: erro inesperado do banco", error);
    return { status: "error", message: "Não foi possível registrar a tentativa de publicação." };
  }
  if (!data || data.length === 0) {
    return { status: "error", message: "Já existe uma tentativa de publicação em andamento para esta oferta." };
  }

  revalidatePath(`/empresa/ofertas/${offeringId}/publicar`);
  return { status: "success" };
}

async function marcarDivergente(admin: ReturnType<typeof createAdminClient>, offeringId: string, accountId: string, motivo: string) {
  await admin
    .from("offerings")
    .update({ sync_status: "divergente", onchain_last_error: motivo })
    .eq("id", offeringId)
    .eq("issuer_id", accountId)
    .in("sync_status", ["pendente", "divergente"]);
  revalidatePath(`/empresa/ofertas/${offeringId}/publicar`);
}

async function voltarParaNaoOnchain(admin: ReturnType<typeof createAdminClient>, offeringId: string, accountId: string, motivo: string) {
  // Mesma regra da Sepolia: tx_hash e expected_emissor_wallet pertencem à MESMA tentativa e voltam
  // a null juntos, para uma nova tentativa recongelar os dois do zero.
  await admin
    .from("offerings")
    .update({
      sync_status: "nao_onchain",
      tx_hash: null,
      expected_emissor_wallet: null,
      solana_ultimo_bloco_valido: null,
      onchain_last_error: motivo,
    })
    .eq("id", offeringId)
    .eq("issuer_id", accountId)
    .in("sync_status", ["pendente", "divergente"]);
  revalidatePath(`/empresa/ofertas/${offeringId}/publicar`);
}

/**
 * Lê a transação da própria linha na devnet e confere, nesta ordem:
 *   1. a transação existe e não falhou (falhou → volta a 'nao_onchain' com o motivo do programa);
 *   2. há exatamente um evento OfertaCriada emitido pelo programa niara-pmes-solana;
 *   3. emissor do evento = expected_emissor_wallet; meta mínima, meta máxima, preço por cota e prazo
 *      batem com a linha (centavos × 10^4);
 *   4. a conta da oferta existe na rede, pertence ao programa, e o emissor/mint gravados nela são os
 *      mesmos do evento.
 * Só então grava os endereços — sempre os lidos da rede.
 */
export async function confirmarPublicacaoSolana(offeringId: string): Promise<ConfirmarPublicacaoState> {
  const { role, accountId } = await resolveAccount();
  if (role !== "issuer" || !accountId) {
    return { status: "error", message: "Apenas empresas cadastradas podem confirmar publicações." };
  }
  const parsedId = z.string().uuid().safeParse(offeringId);
  if (!parsedId.success) return { status: "error", message: "Oferta inválida." };

  const admin = createAdminClient();
  const { data: offering, error: fetchError } = await admin
    .from("offerings")
    .select(
      "id, rede, tx_hash, sync_status, target_min_cents, hard_cap_cents, share_price_cents, opens_at, closes_at, contract_address, token_address, expected_emissor_wallet, solana_ultimo_bloco_valido",
    )
    .eq("id", parsedId.data)
    .eq("issuer_id", accountId)
    .maybeSingle();

  if (fetchError || !offering) return { status: "error", message: "Oferta não encontrada." };
  if (offering.rede !== REDE_SOLANA) return { status: "error", message: "Esta oferta não foi publicada na Solana." };

  if (offering.sync_status === "confirmada") {
    return { status: "confirmada", contractAddress: offering.contract_address as string, tokenAddress: offering.token_address as string };
  }
  if (!["pendente", "divergente"].includes(offering.sync_status as string) || !offering.tx_hash) {
    return { status: "error", message: "Esta oferta não está com uma publicação pendente." };
  }
  const walletEsperada = (offering.expected_emissor_wallet as string | null) ?? null;
  if (!walletEsperada) {
    return { status: "error", message: "Esta oferta não tem uma carteira esperada congelada — não é possível confirmar." };
  }

  let leitura;
  try {
    leitura = await lerTxPublicacao(offering.tx_hash as string);
  } catch (e) {
    // RPC fora do ar — nunca confundir com "a transação não existe".
    return { status: "error", message: descreverErroSolana(e) };
  }

  if (leitura.status === "nao-encontrada") {
    // Só descarta quando é CERTO que a transação não entra mais: sem nenhum sinal dela na rede E
    // com a rede já além do lastValidBlockHeight do blockhash que ela usou. (Linha sem esse valor:
    // fallback de tempo, folgado.)
    const desde = Date.now() - new Date(offering.opens_at as string).getTime();
    const ultimoValido = offering.solana_ultimo_bloco_valido === null ? null : Number(offering.solana_ultimo_bloco_valido);
    let venceu = desde > EXPIRACAO_TENTATIVA_MS;
    if (ultimoValido !== null) {
      try {
        venceu = (await alturaDeBlocoAtual()) > ultimoValido;
      } catch (e) {
        return { status: "error", message: descreverErroSolana(e) };
      }
    }
    if (leitura.jaExpirou && venceu) {
      const motivo = "A transação não chegou à rede antes de expirar (nada foi gravado on-chain) — pode publicar de novo.";
      await voltarParaNaoOnchain(admin, parsedId.data, accountId, motivo);
      return { status: "revertida", motivo };
    }
    return { status: "pendente" };
  }

  if (leitura.status === "falhou") {
    await voltarParaNaoOnchain(admin, parsedId.data, accountId, leitura.motivo);
    return { status: "revertida", motivo: leitura.motivo };
  }

  if (leitura.eventos.length !== 1) {
    const motivo =
      leitura.eventos.length === 0
        ? "Nenhum evento OfertaCriada emitido pelo programa niara-pmes-solana foi encontrado nesta transação."
        : "Mais de um evento OfertaCriada nesta transação — esperado exatamente um.";
    await marcarDivergente(admin, parsedId.data, accountId, motivo);
    return { status: "divergente", motivo };
  }
  const ev = leitura.eventos[0];

  // A transação tem que ser DESTA tentativa: confirmada depois de registrada (o registro acontece
  // antes do envio, com folga para relógios) — uma assinatura antiga de outra oferta não serve.
  const registradaEm = Math.floor(new Date(offering.opens_at as string).getTime() / 1000);
  if (leitura.blockTime !== null && leitura.blockTime < registradaEm - FOLGA_RELOGIO_S) {
    const motivo = "A transação é anterior a esta tentativa de publicação — não pertence a esta oferta.";
    await marcarDivergente(admin, parsedId.data, accountId, motivo);
    return { status: "divergente", motivo };
  }

  // E da empresa DESTA conta: o cnpjRef do evento é keccak256 do CNPJ cadastrado (mesmo cálculo
  // de publicar/page.tsx).
  const { data: issuer } = await admin.from("issuers").select("tax_id").eq("id", accountId).maybeSingle();
  if (ev.cnpjRefHex.toLowerCase() !== keccak256(toHex((issuer?.tax_id as string | null) ?? "")).toLowerCase()) {
    const motivo = "O CNPJ (hash) gravado na oferta on-chain não é o desta empresa.";
    await marcarDivergente(admin, parsedId.data, accountId, motivo);
    return { status: "divergente", motivo };
  }

  const esperado = {
    metaMinima: BigInt(offering.target_min_cents) * UNIDADE_ON_CHAIN_SOLANA,
    metaMaxima: BigInt(offering.hard_cap_cents) * UNIDADE_ON_CHAIN_SOLANA,
    precoPorCota: BigInt(offering.share_price_cents as number) * UNIDADE_ON_CHAIN_SOLANA,
    prazo: Math.floor(new Date(offering.closes_at as string).getTime() / 1000),
  };
  if (
    ev.emissor !== walletEsperada ||
    ev.metaMinima !== esperado.metaMinima ||
    ev.metaMaxima !== esperado.metaMaxima ||
    ev.precoPorCota !== esperado.precoPorCota ||
    ev.prazo !== esperado.prazo
  ) {
    const motivo = "Os parâmetros do evento on-chain não batem com os desta oferta (ou com a carteira Solana vinculada) no Supabase.";
    await marcarDivergente(admin, parsedId.data, accountId, motivo);
    return { status: "divergente", motivo };
  }

  let conta;
  try {
    conta = await lerContaOfertaVerificada(ev.oferta);
  } catch (e) {
    return { status: "error", message: descreverErroSolana(e) };
  }
  if (!conta || conta.emissor !== ev.emissor || conta.mintCota !== ev.mintCota) {
    const motivo = "A conta da oferta citada no evento não existe na rede, não pertence ao programa niara-pmes-solana ou não bate com o evento.";
    await marcarDivergente(admin, parsedId.data, accountId, motivo);
    return { status: "divergente", motivo };
  }

  const { error: updateError } = await admin
    .from("offerings")
    .update({
      contract_address: ev.oferta,
      token_address: ev.mintCota,
      onchain_emissor_wallet: ev.emissor,
      sync_status: "confirmada",
      onchain_confirmed_at: new Date().toISOString(),
      onchain_last_error: null,
    })
    .eq("id", parsedId.data)
    .eq("issuer_id", accountId)
    .in("sync_status", ["pendente", "divergente"]);

  if (updateError) {
    console.error("confirmarPublicacaoSolana: erro ao gravar confirmação", updateError);
    return { status: "error", message: "A transação confirmou on-chain, mas não foi possível gravar no banco — tente de novo." };
  }

  revalidatePath(`/empresa/ofertas/${parsedId.data}/publicar`);
  revalidatePath("/empresa/ofertas");
  return { status: "confirmada", contractAddress: ev.oferta, tokenAddress: ev.mintCota };
}

/**
 * Reconciliação contínua — mesma ideia de verificarConsistencia (Sepolia): relê a conta da oferta
 * (meta mínima, meta máxima, preço por cota e prazo são gravados uma vez em criar_oferta e nunca
 * mudam) e compara com a linha do Supabase. Só sinaliza; nunca corrige nenhum dos lados.
 */
export async function verificarConsistenciaSolana(offeringId: string): Promise<VerificarConsistenciaState> {
  const { role, accountId } = await resolveAccount();
  if (role !== "issuer" || !accountId) {
    return { status: "error", message: "Apenas empresas cadastradas podem verificar publicações." };
  }
  const parsedId = z.string().uuid().safeParse(offeringId);
  if (!parsedId.success) return { status: "error", message: "Oferta inválida." };

  const admin = createAdminClient();
  const { data: offering, error: fetchError } = await admin
    .from("offerings")
    .select("id, rede, sync_status, contract_address, target_min_cents, hard_cap_cents, share_price_cents, closes_at")
    .eq("id", parsedId.data)
    .eq("issuer_id", accountId)
    .maybeSingle();

  if (fetchError || !offering) return { status: "error", message: "Oferta não encontrada." };
  if (offering.rede !== REDE_SOLANA) return { status: "error", message: "Esta oferta não foi publicada na Solana." };
  if (!["confirmada", "divergente"].includes(offering.sync_status as string) || !offering.contract_address) {
    return { status: "error", message: "Esta oferta ainda não tem uma publicação confirmada para verificar." };
  }

  let conta;
  try {
    conta = await lerContaOfertaVerificada(offering.contract_address as string);
  } catch (e) {
    return { status: "error", message: descreverErroSolana(e) };
  }
  if (!conta) {
    return { status: "error", message: "A conta da oferta não foi encontrada na rede agora — tente de novo em instantes." };
  }

  const cents = (v: bigint) => Number(v / UNIDADE_ON_CHAIN_SOLANA);
  const data = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
  const diffs: string[] = [];
  if (conta.metaMinima !== BigInt(offering.target_min_cents) * UNIDADE_ON_CHAIN_SOLANA) {
    diffs.push(`meta mínima: Supabase ${formatBRL(offering.target_min_cents / 100)} ≠ on-chain ${formatBRL(cents(conta.metaMinima) / 100)}`);
  }
  if (conta.metaMaxima !== BigInt(offering.hard_cap_cents) * UNIDADE_ON_CHAIN_SOLANA) {
    diffs.push(`hard cap: Supabase ${formatBRL(offering.hard_cap_cents / 100)} ≠ on-chain ${formatBRL(cents(conta.metaMaxima) / 100)}`);
  }
  if (conta.precoPorCota !== BigInt(offering.share_price_cents as number) * UNIDADE_ON_CHAIN_SOLANA) {
    diffs.push(
      `valor por cota: Supabase ${formatBRL((offering.share_price_cents as number) / 100)} ≠ on-chain ${formatBRL(cents(conta.precoPorCota) / 100)}`,
    );
  }
  if (conta.prazo !== Math.floor(new Date(offering.closes_at as string).getTime() / 1000)) {
    diffs.push(`prazo: Supabase ${data.format(new Date(offering.closes_at as string))} ≠ on-chain ${data.format(new Date(conta.prazo * 1000))}`);
  }

  if (diffs.length > 0) {
    const motivo = `Divergência de consistência (Supabase mudou depois da confirmação) — ${diffs.join("; ")}.`;
    await admin
      .from("offerings")
      .update({ sync_status: "divergente", onchain_last_error: motivo })
      .eq("id", parsedId.data)
      .eq("issuer_id", accountId)
      .in("sync_status", ["confirmada", "divergente"]);
    revalidatePath(`/empresa/ofertas/${parsedId.data}/publicar`);
    revalidatePath("/empresa/ofertas");
    return { status: "divergente", motivo };
  }

  await admin
    .from("offerings")
    .update({ sync_status: "confirmada", onchain_last_error: null })
    .eq("id", parsedId.data)
    .eq("issuer_id", accountId)
    .in("sync_status", ["confirmada", "divergente"]);
  revalidatePath(`/empresa/ofertas/${parsedId.data}/publicar`);
  revalidatePath("/empresa/ofertas");
  return { status: "confirmada" };
}

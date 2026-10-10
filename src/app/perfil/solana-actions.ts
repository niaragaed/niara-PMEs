"use server";

// Vínculo da carteira Solana à conta (migration 0017, `solana_wallet_address`) — par de
// saveWallet/unlinkWallet (EVM) em actions.ts, com uma diferença deliberada: aqui o vínculo exige
// PROVA DE POSSE. A carteira assina (signMessage, sem transação e sem custo) uma mensagem emitida
// pelo servidor que cita esta conta e o horário de emissão; o servidor confere a assinatura ed25519
// contra o endereço antes de gravar. Sem isso, qualquer pessoa poderia vincular à própria conta o
// endereço de outra — e é este vínculo que libera a publicação de ofertas na Solana (gate de
// titularidade + expected_emissor_wallet).
import { createPublicKey, verify } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { PublicKey } from "@solana/web3.js";
import { utils } from "@anchor-lang/core";
import { resolveAccount } from "@/lib/auth/resolveInvestor";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { BASE58_PUBKEY } from "@/lib/solana/config";
import type { UpdateProfileState } from "./actions";

const VALIDADE_MS = 10 * 60 * 1000;
// Prefixo DER (SubjectPublicKeyInfo) de uma chave pública ed25519 de 32 bytes.
const PREFIXO_SPKI_ED25519 = Buffer.from("302a300506032b6570032100", "hex");

async function contaAtual() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const { role, accountId } = await resolveAccount();
  if (!role || !accountId) redirect("/cadastro");
  return { role, accountId };
}

/** Domínio que pediu a assinatura — um site de phishing não consegue emitir a mesma mensagem. */
async function dominio(): Promise<string> {
  return (await headers()).get("host") ?? "niara-pmes";
}

function mensagemDeVinculo(dominioAtual: string, endereco: string, accountId: string, emitidoEm: string) {
  return [
    `${dominioAtual} quer vincular sua carteira Solana à sua conta na Niara PMEs.`,
    `Carteira: ${endereco}`,
    `Conta: ${accountId}`,
    `Emitido em: ${emitidoEm}`,
    "Esta assinatura não cria transação nem tem custo.",
  ].join("\n");
}

/** Mensagem que a carteira vai assinar. Vale por 10 minutos e só para esta conta e este endereço. */
export async function prepararVinculoSolana(enderecoInput: unknown): Promise<{ status: "success"; mensagem: string } | { status: "error"; message: string }> {
  const { accountId } = await contaAtual();
  const endereco = z.string().trim().regex(BASE58_PUBKEY).safeParse(enderecoInput);
  if (!endereco.success) return { status: "error", message: "Endereço de carteira Solana inválido." };
  return { status: "success", mensagem: mensagemDeVinculo(await dominio(), endereco.data, accountId, new Date().toISOString()) };
}

const vinculoSchema = z.object({
  endereco: z.string().trim().regex(BASE58_PUBKEY),
  mensagem: z.string().max(400),
  assinatura: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{64,90}$/),
});

export async function saveSolanaWallet(input: unknown): Promise<UpdateProfileState> {
  const { role, accountId } = await contaAtual();
  const parsed = vinculoSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Dados de vínculo inválidos." };
  const { endereco, mensagem, assinatura } = parsed.data;

  // A mensagem tem que ser exatamente a que este servidor emitiria para esta conta e este
  // endereço, e ainda estar no prazo — o horário vem de dentro da própria mensagem assinada.
  const emitidoEm = /^Emitido em: (.+)$/m.exec(mensagem)?.[1] ?? "";
  const quando = Date.parse(emitidoEm);
  if (mensagem !== mensagemDeVinculo(await dominio(), endereco, accountId, emitidoEm) || !Number.isFinite(quando)) {
    return { status: "error", message: "Mensagem de vínculo inválida — tente vincular de novo." };
  }
  if (Date.now() - quando > VALIDADE_MS || quando - Date.now() > 60_000) {
    return { status: "error", message: "A assinatura de vínculo expirou — tente vincular de novo." };
  }

  let valida = false;
  try {
    const chave = createPublicKey({
      key: Buffer.concat([PREFIXO_SPKI_ED25519, Buffer.from(new PublicKey(endereco).toBytes())]),
      format: "der",
      type: "spki",
    });
    valida = verify(null, Buffer.from(mensagem, "utf8"), chave, Buffer.from(utils.bytes.bs58.decode(assinatura)));
  } catch {
    valida = false;
  }
  if (!valida) return { status: "error", message: "A assinatura não confere com esta carteira — o vínculo não foi salvo." };

  const admin = createAdminClient();
  const tabela = role === "investor" ? "investors" : "issuers";
  const { error } = await admin.from(tabela).update({ solana_wallet_address: endereco }).eq("id", accountId);
  if (error) {
    if (error.code === "23505") return { status: "error", message: "Esta carteira Solana já está vinculada a outra conta." };
    console.error("saveSolanaWallet: erro inesperado do banco", error);
    return { status: "error", message: "Não foi possível salvar a carteira. Tente novamente em instantes." };
  }

  revalidatePath("/perfil");
  return { status: "success" };
}

export async function unlinkSolanaWallet(): Promise<UpdateProfileState> {
  const { role, accountId } = await contaAtual();
  const admin = createAdminClient();
  const tabela = role === "investor" ? "investors" : "issuers";
  const { error } = await admin.from(tabela).update({ solana_wallet_address: null }).eq("id", accountId);
  if (error) {
    console.error("unlinkSolanaWallet: erro inesperado do banco", error);
    return { status: "error", message: "Não foi possível desvincular a carteira. Tente novamente em instantes." };
  }
  revalidatePath("/perfil");
  return { status: "success" };
}

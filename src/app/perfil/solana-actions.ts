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

const VALIDITY_MS = 10 * 60 * 1000;
// Prefixo DER (SubjectPublicKeyInfo) de uma chave pública ed25519 de 32 bytes.
const PREFIX_SPKI_ED25519 = Buffer.from("302a300506032b6570032100", "hex");

async function currentAccount() {
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
async function domain(): Promise<string> {
  return (await headers()).get("host") ?? "niara-pmes";
}

function linkMessage(currentDomain: string, address: string, accountId: string, issuedOn: string) {
  return [
    `${currentDomain} quer vincular sua carteira Solana à sua conta na Niara PMEs.`,
    `Carteira: ${address}`,
    `Conta: ${accountId}`,
    `Emitido em: ${issuedOn}`,
    "Esta assinatura não cria transação nem tem custo.",
  ].join("\n");
}

/** Mensagem que a carteira vai assinar. Vale por 10 minutos e só para esta conta e este endereço. */
export async function prepareSolanaLink(addressInput: unknown): Promise<{ status: "success"; message: string } | { status: "error"; message: string }> {
  const { accountId } = await currentAccount();
  const address = z.string().trim().regex(BASE58_PUBKEY).safeParse(addressInput);
  if (!address.success) return { status: "error", message: "Endereço de carteira Solana inválido." };
  return { status: "success", message: linkMessage(await domain(), address.data, accountId, new Date().toISOString()) };
}

const linkSchema = z.object({
  address: z.string().trim().regex(BASE58_PUBKEY),
  message: z.string().max(400),
  signature: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{64,90}$/),
});

export async function saveSolanaWallet(input: unknown): Promise<UpdateProfileState> {
  const { role, accountId } = await currentAccount();
  const parsed = linkSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Dados de vínculo inválidos." };
  const { address, message, signature } = parsed.data;

  // A mensagem tem que ser exatamente a que este servidor emitiria para esta conta e este
  // endereço, e ainda estar no prazo — o horário vem de dentro da própria mensagem assinada.
  const issuedOn = /^Emitido em: (.+)$/m.exec(message)?.[1] ?? "";
  const when = Date.parse(issuedOn);
  if (message !== linkMessage(await domain(), address, accountId, issuedOn) || !Number.isFinite(when)) {
    return { status: "error", message: "Mensagem de vínculo inválida — tente vincular de novo." };
  }
  if (Date.now() - when > VALIDITY_MS || when - Date.now() > 60_000) {
    return { status: "error", message: "A assinatura de vínculo expirou — tente vincular de novo." };
  }

  let valid = false;
  try {
    const key = createPublicKey({
      key: Buffer.concat([PREFIX_SPKI_ED25519, Buffer.from(new PublicKey(address).toBytes())]),
      format: "der",
      type: "spki",
    });
    valid = verify(null, Buffer.from(message, "utf8"), key, Buffer.from(utils.bytes.bs58.decode(signature)));
  } catch {
    valid = false;
  }
  if (!valid) return { status: "error", message: "A assinatura não confere com esta carteira — o vínculo não foi salvo." };

  const admin = createAdminClient();
  const table = role === "investor" ? "investors" : "issuers";
  const { error } = await admin.from(table).update({ solana_wallet_address: address }).eq("id", accountId);
  if (error) {
    if (error.code === "23505") return { status: "error", message: "Esta carteira Solana já está vinculada a outra conta." };
    console.error("saveSolanaWallet: erro inesperado do banco", error);
    return { status: "error", message: "Não foi possível salvar a carteira. Tente novamente em instantes." };
  }

  revalidatePath("/perfil");
  return { status: "success" };
}

export async function unlinkSolanaWallet(): Promise<UpdateProfileState> {
  const { role, accountId } = await currentAccount();
  const admin = createAdminClient();
  const table = role === "investor" ? "investors" : "issuers";
  const { error } = await admin.from(table).update({ solana_wallet_address: null }).eq("id", accountId);
  if (error) {
    console.error("unlinkSolanaWallet: erro inesperado do banco", error);
    return { status: "error", message: "Não foi possível desvincular a carteira. Tente novamente em instantes." };
  }
  revalidatePath("/perfil");
  return { status: "success" };
}

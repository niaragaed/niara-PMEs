"use server";

// Linking the Solana wallet to the account (migration 0017, `solana_wallet_address`) — the
// counterpart of saveWallet/unlinkWallet (EVM) in actions.ts, with one deliberate difference: here
// the link requires PROOF OF OWNERSHIP. The wallet signs (signMessage, no transaction and no cost)
// a message issued by the server that names this account and the time it was issued; the server
// checks the ed25519 signature against the address before saving. Without this, anyone could link
// someone else's address to their own account — and it's this link that unlocks publishing
// offerings on Solana (ownership gate + expected_emissor_wallet).
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
import { getDictionary } from "@/lib/i18n/server";

const VALIDITY_MS = 10 * 60 * 1000;
// DER prefix (SubjectPublicKeyInfo) of a 32-byte ed25519 public key.
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

/** The domain that asked for the signature — a phishing site can't issue the same message. */
async function domain(): Promise<string> {
  return (await headers()).get("host") ?? "niara-pmes";
}

/**
 * The message the wallet signs. It's a protocol artifact, not interface copy: always in English,
 * whatever the interface language, because the server rebuilds it word for word to check the
 * signature (a language switch between prepare and save would otherwise break the comparison).
 */
function linkMessage(currentDomain: string, address: string, accountId: string, issuedOn: string) {
  return [
    `${currentDomain} wants to link your Solana wallet to your Niara PMEs account.`,
    `Wallet: ${address}`,
    `Account: ${accountId}`,
    `Issued at: ${issuedOn}`,
    "This signature doesn't create a transaction and has no cost.",
  ].join("\n");
}

/** The message the wallet will sign. Valid for 10 minutes, and only for this account and this address. */
export async function prepareSolanaLink(addressInput: unknown): Promise<{ status: "success"; message: string } | { status: "error"; message: string }> {
  const { accountId } = await currentAccount();
  const e = (await getDictionary()).serverErrors;
  const address = z.string().trim().regex(BASE58_PUBKEY).safeParse(addressInput);
  if (!address.success) return { status: "error", message: e.solanaLink.invalidAddress };
  return { status: "success", message: linkMessage(await domain(), address.data, accountId, new Date().toISOString()) };
}

const linkSchema = z.object({
  address: z.string().trim().regex(BASE58_PUBKEY),
  message: z.string().max(400),
  signature: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{64,90}$/),
});

export async function saveSolanaWallet(input: unknown): Promise<UpdateProfileState> {
  const { role, accountId } = await currentAccount();
  const e = (await getDictionary()).serverErrors;
  const parsed = linkSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: e.solanaLink.invalidData };
  const { address, message, signature } = parsed.data;

  // The message must be exactly the one this server would issue for this account and this address,
  // and still be within its validity — the time comes from inside the signed message itself.
  const issuedOn = /^Issued at: (.+)$/m.exec(message)?.[1] ?? "";
  const when = Date.parse(issuedOn);
  if (message !== linkMessage(await domain(), address, accountId, issuedOn) || !Number.isFinite(when)) {
    return { status: "error", message: e.solanaLink.invalidMessage };
  }
  if (Date.now() - when > VALIDITY_MS || when - Date.now() > 60_000) {
    return { status: "error", message: e.solanaLink.expired };
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
  if (!valid) return { status: "error", message: e.solanaLink.signatureMismatch };

  const admin = createAdminClient();
  const table = role === "investor" ? "investors" : "issuers";
  const { error } = await admin.from(table).update({ solana_wallet_address: address }).eq("id", accountId);
  if (error) {
    if (error.code === "23505") return { status: "error", message: e.solanaLink.alreadyLinked };
    console.error("saveSolanaWallet: unexpected database error", error);
    return { status: "error", message: e.wallet.saveFailed };
  }

  revalidatePath("/perfil");
  return { status: "success" };
}

export async function unlinkSolanaWallet(): Promise<UpdateProfileState> {
  const { role, accountId } = await currentAccount();
  const e = (await getDictionary()).serverErrors;
  const admin = createAdminClient();
  const table = role === "investor" ? "investors" : "issuers";
  const { error } = await admin.from(table).update({ solana_wallet_address: null }).eq("id", accountId);
  if (error) {
    console.error("unlinkSolanaWallet: unexpected database error", error);
    return { status: "error", message: e.wallet.unlinkFailed };
  }
  revalidatePath("/perfil");
  return { status: "success" };
}

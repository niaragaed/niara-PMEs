"use server";

// Server Actions for the self-service publication on Solana Devnet — the counterpart of
// onchain-actions.ts (Sepolia), with the SAME golden rules (read that file's header before
// touching this one):
//   - contract_address/token_address/onchain_emissor_wallet never come from the client: only from
//     a verified read by the server itself against the network (confirmPublicationSolana);
//   - issuer_id/accountId always from resolveAccount();
//   - the event's issuer is compared with `expected_emissor_wallet`, frozen by
//     registerAttemptSolana from issuers.solana_wallet_address read HERE, never with a live
//     re-read.
//
// Mechanical differences from Sepolia:
//   - The transaction signature (Solana's "tx_hash") is known BEFORE sending — it's the payer's
//     own signature. That's why the attempt is recorded before the transaction goes to the
//     network: if the recording fails, nothing is sent and no orphan offering is left on-chain.
//   - A Solana transaction that doesn't land before its blockhash expires (~1–2 min) never lands.
//     confirmPublicationSolana recognizes that case and sends the offering back to 'nao_onchain',
//     instead of leaving it 'pendente' forever.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { resolveAccount } from "@/lib/auth/resolveInvestor";
import { createAdminClient } from "@/lib/supabase/admin";
import { BASE58_SIGNATURE, NETWORK_SOLANA, UNIT_ON_CHAIN_SOLANA } from "@/lib/solana/config";
import { keccak256, toHex } from "viem";
import { currentBlockHeight, readVerifiedOfferingAccount, readPublicationTx } from "@/lib/solana/servidor";
import { describeSolanaError } from "@/lib/solana/errors";
import { formatBRL } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/server";
import type { ConfirmPublicationState, RegisterAttemptState, CheckConsistencyState } from "./onchain-actions";

/** Fallback (row without lastValidBlockHeight): after this with no sign on the network, the blockhash expired. */
const ATTEMPT_EXPIRATION_MS = 3 * 60 * 1000;
const CLOCK_SKEW_S = 120;

const registerSchema = z.object({
  offeringId: z.string().uuid(),
  signature: z.string().regex(BASE58_SIGNATURE),
  deadlineUnixSeconds: z.number().int().positive(),
  /** lastValidBlockHeight of the signed transaction's blockhash (only decides when it expired). */
  lastValidBlockHeight: z.number().int().positive(),
});

/**
 * Called by the client with the transaction ALREADY SIGNED by Phantom and NOT sent yet. Freezes
 * opens_at/closes_at (the exact `prazo` that went into the transaction) and
 * expected_emissor_wallet (issuers.solana_wallet_address read here). Atomic like on Sepolia: only
 * the first attempt of a 'nao_onchain' offering is recorded.
 */
export async function registerAttemptSolana(input: unknown): Promise<RegisterAttemptState> {
  const e = (await getDictionary()).serverErrors;
  const { role, accountId } = await resolveAccount();
  if (role !== "issuer" || !accountId) {
    return { status: "error", message: e.issuersOnly.publish };
  }

  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: e.publication.invalidData };
  }
  const { offeringId, signature, deadlineUnixSeconds, lastValidBlockHeight } = parsed.data;

  const admin = createAdminClient();
  const { data: issuer, error: issuerError } = await admin
    .from("issuers")
    .select("solana_wallet_address")
    .eq("id", accountId)
    .maybeSingle();
  if (issuerError) {
    console.error("registerAttemptSolana: failed to read the issuer's wallet", issuerError);
    return { status: "error", message: e.publication.attemptFailed };
  }
  const linkedWallet = (issuer?.solana_wallet_address as string | null) ?? null;
  if (!linkedWallet) {
    return { status: "error", message: e.publication.noLinkedSolanaWallet };
  }

  const { data, error } = await admin
    .from("offerings")
    .update({
      rede: NETWORK_SOLANA,
      tx_hash: signature,
      chain_id: null,
      sync_status: "pendente",
      opens_at: new Date().toISOString(),
      closes_at: new Date(deadlineUnixSeconds * 1000).toISOString(),
      expected_emissor_wallet: linkedWallet,
      solana_ultimo_bloco_valido: lastValidBlockHeight,
      onchain_last_error: null,
    })
    .eq("id", offeringId)
    .eq("issuer_id", accountId)
    .eq("sync_status", "nao_onchain")
    .select("id");

  if (error) {
    console.error("registerAttemptSolana: unexpected database error", error);
    return { status: "error", message: e.publication.attemptFailed };
  }
  if (!data || data.length === 0) {
    return { status: "error", message: e.publication.attemptInProgress };
  }

  revalidatePath(`/empresa/ofertas/${offeringId}/publicar`);
  return { status: "success" };
}

async function markDivergent(admin: ReturnType<typeof createAdminClient>, offeringId: string, accountId: string, reason: string) {
  await admin
    .from("offerings")
    .update({ sync_status: "divergente", onchain_last_error: reason })
    .eq("id", offeringId)
    .eq("issuer_id", accountId)
    .in("sync_status", ["pendente", "divergente"]);
  revalidatePath(`/empresa/ofertas/${offeringId}/publicar`);
}

async function resetToNotOnchain(admin: ReturnType<typeof createAdminClient>, offeringId: string, accountId: string, reason: string) {
  // Same rule as Sepolia: tx_hash and expected_emissor_wallet belong to the SAME attempt and go
  // back to null together, so a new attempt can freeze both again from scratch.
  await admin
    .from("offerings")
    .update({
      sync_status: "nao_onchain",
      tx_hash: null,
      expected_emissor_wallet: null,
      solana_ultimo_bloco_valido: null,
      onchain_last_error: reason,
    })
    .eq("id", offeringId)
    .eq("issuer_id", accountId)
    .in("sync_status", ["pendente", "divergente"]);
  revalidatePath(`/empresa/ofertas/${offeringId}/publicar`);
}

/**
 * Reads the row's own transaction on devnet and checks, in this order:
 *   1. the transaction exists and didn't fail (failed → back to 'nao_onchain' with the program's
 *      reason);
 *   2. there's exactly one OfertaCriada event emitted by the niara-pmes-solana program;
 *   3. the event's issuer = expected_emissor_wallet; minimum target, maximum target, price per
 *      share and deadline match the row (cents × 10^4);
 *   4. the offering account exists on the network, belongs to the program, and the issuer/mint
 *      stored in it are the same as the event's.
 * Only then stores the addresses — always the ones read from the network.
 */
export async function confirmPublicationSolana(offeringId: string): Promise<ConfirmPublicationState> {
  const dict = await getDictionary();
  const e = dict.serverErrors;
  const solanaMessages = dict.chainErrors.solana;
  const { role, accountId } = await resolveAccount();
  if (role !== "issuer" || !accountId) {
    return { status: "error", message: e.issuersOnly.confirm };
  }
  const parsedId = z.string().uuid().safeParse(offeringId);
  if (!parsedId.success) return { status: "error", message: e.invalidOffering };

  const admin = createAdminClient();
  const { data: offering, error: fetchError } = await admin
    .from("offerings")
    .select(
      "id, rede, tx_hash, sync_status, target_min_cents, hard_cap_cents, share_price_cents, opens_at, closes_at, contract_address, token_address, expected_emissor_wallet, solana_ultimo_bloco_valido",
    )
    .eq("id", parsedId.data)
    .eq("issuer_id", accountId)
    .maybeSingle();

  if (fetchError || !offering) return { status: "error", message: e.offeringNotFound };
  if (offering.rede !== NETWORK_SOLANA) return { status: "error", message: e.publication.notOnSolana };

  if (offering.sync_status === "confirmada") {
    return { status: "confirmada", contractAddress: offering.contract_address as string, tokenAddress: offering.token_address as string };
  }
  if (!["pendente", "divergente"].includes(offering.sync_status as string) || !offering.tx_hash) {
    return { status: "error", message: e.publication.notPending };
  }
  const expectedWallet = (offering.expected_emissor_wallet as string | null) ?? null;
  if (!expectedWallet) {
    return { status: "error", message: e.publication.noFrozenWallet };
  }

  let read;
  try {
    read = await readPublicationTx(offering.tx_hash as string, solanaMessages);
  } catch (err) {
    // RPC down — never mistake it for "the transaction doesn't exist".
    return { status: "error", message: describeSolanaError(err, solanaMessages) };
  }

  if (read.status === "not-found") {
    // Only discards when it's CERTAIN the transaction won't land anymore: no sign of it on the
    // network AND the network already past the lastValidBlockHeight of the blockhash it used. (Row
    // without that value: a generous time fallback.)
    const since = Date.now() - new Date(offering.opens_at as string).getTime();
    const lastValid = offering.solana_ultimo_bloco_valido === null ? null : Number(offering.solana_ultimo_bloco_valido);
    let expired = since > ATTEMPT_EXPIRATION_MS;
    if (lastValid !== null) {
      try {
        expired = (await currentBlockHeight()) > lastValid;
      } catch (err) {
        return { status: "error", message: describeSolanaError(err, solanaMessages) };
      }
    }
    if (read.alreadyExpired && expired) {
      const reason = e.publication.solanaExpired;
      await resetToNotOnchain(admin, parsedId.data, accountId, reason);
      return { status: "reverted", reason };
    }
    return { status: "pendente" };
  }

  if (read.status === "failed") {
    await resetToNotOnchain(admin, parsedId.data, accountId, read.reason);
    return { status: "reverted", reason: read.reason };
  }

  if (read.events.length !== 1) {
    const reason =
      read.events.length === 0
        ? e.publication.noOfferingCreatedEvent
        : e.publication.multipleEvents;
    await markDivergent(admin, parsedId.data, accountId, reason);
    return { status: "divergente", reason };
  }
  const ev = read.events[0];

  // The transaction must belong to THIS attempt: confirmed after being recorded (the recording
  // happens before sending, with slack for clocks) — an old signature from another offering won't
  // do.
  const registeredOn = Math.floor(new Date(offering.opens_at as string).getTime() / 1000);
  if (read.blockTime !== null && read.blockTime < registeredOn - CLOCK_SKEW_S) {
    const reason = e.publication.txBeforeAttempt;
    await markDivergent(admin, parsedId.data, accountId, reason);
    return { status: "divergente", reason };
  }

  // And from THIS account's company: the event's cnpjRef is keccak256 of the registered CNPJ (same
  // computation as publicar/page.tsx).
  const { data: issuer } = await admin.from("issuers").select("tax_id").eq("id", accountId).maybeSingle();
  if (ev.cnpjRefHex.toLowerCase() !== keccak256(toHex((issuer?.tax_id as string | null) ?? "")).toLowerCase()) {
    const reason = e.publication.cnpjMismatch;
    await markDivergent(admin, parsedId.data, accountId, reason);
    return { status: "divergente", reason };
  }

  const expected = {
    metaMinima: BigInt(offering.target_min_cents) * UNIT_ON_CHAIN_SOLANA,
    metaMaxima: BigInt(offering.hard_cap_cents) * UNIT_ON_CHAIN_SOLANA,
    precoPorCota: BigInt(offering.share_price_cents as number) * UNIT_ON_CHAIN_SOLANA,
    prazo: Math.floor(new Date(offering.closes_at as string).getTime() / 1000),
  };
  if (
    ev.emissor !== expectedWallet ||
    ev.metaMinima !== expected.metaMinima ||
    ev.metaMaxima !== expected.metaMaxima ||
    ev.precoPorCota !== expected.precoPorCota ||
    ev.prazo !== expected.prazo
  ) {
    const reason = e.publication.eventMismatchSolana;
    await markDivergent(admin, parsedId.data, accountId, reason);
    return { status: "divergente", reason };
  }

  let account;
  try {
    account = await readVerifiedOfferingAccount(ev.oferta);
  } catch (err) {
    return { status: "error", message: describeSolanaError(err, solanaMessages) };
  }
  if (!account || account.issuer !== ev.emissor || account.shareMint !== ev.mintCota) {
    const reason = e.publication.accountMismatch;
    await markDivergent(admin, parsedId.data, accountId, reason);
    return { status: "divergente", reason };
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
    console.error("confirmPublicationSolana: failed to store the confirmation", updateError);
    return { status: "error", message: e.publication.saveFailed };
  }

  revalidatePath(`/empresa/ofertas/${parsedId.data}/publicar`);
  revalidatePath("/empresa/ofertas");
  return { status: "confirmada", contractAddress: ev.oferta, tokenAddress: ev.mintCota };
}

/**
 * Continuous reconciliation — the same idea as checkConsistency (Sepolia): re-reads the offering
 * account (minimum target, maximum target, price per share and deadline are written once in
 * criar_oferta and never change) and compares it with the Supabase row. It only flags; it never
 * fixes either side.
 */
export async function verifyConsistencySolana(offeringId: string): Promise<CheckConsistencyState> {
  const dict = await getDictionary();
  const e = dict.serverErrors;
  const { role, accountId } = await resolveAccount();
  if (role !== "issuer" || !accountId) {
    return { status: "error", message: e.issuersOnly.verify };
  }
  const parsedId = z.string().uuid().safeParse(offeringId);
  if (!parsedId.success) return { status: "error", message: e.invalidOffering };

  const admin = createAdminClient();
  const { data: offering, error: fetchError } = await admin
    .from("offerings")
    .select("id, rede, sync_status, contract_address, target_min_cents, hard_cap_cents, share_price_cents, closes_at")
    .eq("id", parsedId.data)
    .eq("issuer_id", accountId)
    .maybeSingle();

  if (fetchError || !offering) return { status: "error", message: e.offeringNotFound };
  if (offering.rede !== NETWORK_SOLANA) return { status: "error", message: e.publication.notOnSolana };
  if (!["confirmada", "divergente"].includes(offering.sync_status as string) || !offering.contract_address) {
    return { status: "error", message: e.publication.notConfirmedYet };
  }

  let account;
  try {
    account = await readVerifiedOfferingAccount(offering.contract_address as string);
  } catch (err) {
    return { status: "error", message: describeSolanaError(err, dict.chainErrors.solana) };
  }
  if (!account) {
    return { status: "error", message: e.publication.accountNotFoundNow };
  }

  const cents = (v: bigint) => Number(v / UNIT_ON_CHAIN_SOLANA);
  const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
  const diffs: string[] = [];
  if (account.minTarget !== BigInt(offering.target_min_cents) * UNIT_ON_CHAIN_SOLANA) {
    diffs.push(e.publication.diffMinTarget(formatBRL(offering.target_min_cents / 100), formatBRL(cents(account.minTarget) / 100)));
  }
  if (account.maxTarget !== BigInt(offering.hard_cap_cents) * UNIT_ON_CHAIN_SOLANA) {
    diffs.push(e.publication.diffHardCap(formatBRL(offering.hard_cap_cents / 100), formatBRL(cents(account.maxTarget) / 100)));
  }
  if (account.pricePerShare !== BigInt(offering.share_price_cents as number) * UNIT_ON_CHAIN_SOLANA) {
    diffs.push(
      e.publication.diffSharePrice(formatBRL((offering.share_price_cents as number) / 100), formatBRL(cents(account.pricePerShare) / 100)),
    );
  }
  if (account.deadline !== Math.floor(new Date(offering.closes_at as string).getTime() / 1000)) {
    diffs.push(
      e.publication.diffDeadline(
        dateFormatter.format(new Date(offering.closes_at as string)),
        dateFormatter.format(new Date(account.deadline * 1000)),
      ),
    );
  }

  if (diffs.length > 0) {
    const reason = e.publication.consistencyDrift(diffs.join("; "));
    await admin
      .from("offerings")
      .update({ sync_status: "divergente", onchain_last_error: reason })
      .eq("id", parsedId.data)
      .eq("issuer_id", accountId)
      .in("sync_status", ["confirmada", "divergente"]);
    revalidatePath(`/empresa/ofertas/${parsedId.data}/publicar`);
    revalidatePath("/empresa/ofertas");
    return { status: "divergente", reason };
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

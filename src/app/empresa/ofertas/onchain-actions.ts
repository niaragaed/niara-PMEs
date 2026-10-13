"use server";

// Phase 3, sub-step 4 Server Actions (see PLANO_FASE_3_PUBLICACAO_ONCHAIN.md) — self-service
// publication of the offering on Sepolia. GOLDEN RULE: none of them accepts from anyone the final
// value of contract_address/token_address/onchain_emissor_wallet — those three only come from a
// verified read by the server itself against the chain (confirmPublication), never from a
// parameter. issuer_id/accountId always come from resolveAccount() (session on the server), never
// from the client — the same pattern as every other Server Action in this project.
//
// 🔴 confirmPublication() NEVER validates by `receipt.to` — a real incident documented in
// CLAUDE.md: MetaMask can rewrite the transaction into an EIP-7702 envelope (type 4), and in that
// case `receipt.to` is an executor contract of MetaMask itself, not OfertaOrquestrador, even
// though the call was executed correctly inside. The correct validation is by the LOGS: only
// OfertaOrquestrador itself can emit a log whose `address` is its own — that's unforgeable,
// unlike `to`, which the wallet can freely rewrite before signing.
//
// 🔴 confirmPublication() also NEVER compares the event's issuer against a LIVE read of
// issuers.wallet_address — a second real bug, found when adding the "Reprocess" button (which
// exists precisely to run this function at any distance in time from the original signature).
// issuers.wallet_address can change between the signature and a future reprocessing; comparing
// against the current value answers "who is linked now?", not "who had authority at the moment
// they signed?" — the two only coincide by chance while the confirmation runs right after the
// signature. The correct anchor is `offerings.expected_emissor_wallet` (migration 0016), frozen
// by registerAttempt from the SERVER's OWN read of issuers.wallet_address at the moment of the
// attempt — never accepted from the client, for the same reason accountId/issuer_id never come
// from the client in any Server Action in this project.
//
// The `reason` strings recorded in offerings.onchain_last_error are written in the language of
// whoever triggered the check (they're shown back as recorded).
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { decodeEventLog, decodeFunctionData, TransactionReceiptNotFoundError } from "viem";
import { resolveAccount } from "@/lib/auth/resolveInvestor";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrchestratorContract, ORCHESTRATOR_CHAIN_ID, type OrchestratorContract } from "@/lib/web3/orquestrador";
import { participacaoTokenFactoryAbi } from "@/lib/web3/abis/participacaoTokenFactory";
import { ofertaCaptacaoFactoryAbi } from "@/lib/web3/abis/ofertaCaptacaoFactory";
import { ofertaCaptacaoAbi } from "@/lib/web3/abis/ofertaCaptacao";
import { publicClient } from "@/lib/web3/eventsCore";
import { describeOnChainError } from "@/lib/web3/errors";
import { UNIT_ON_CHAIN } from "@/lib/web3/gates";
import { formatBRL } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export type RegisterAttemptState = { status: "success" } | { status: "error"; message: string };

const registerAttemptSchema = z.object({
  offeringId: z.string().uuid(),
  txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  deadlineUnixSeconds: z.number().int().positive(),
});

/**
 * Called by the client as soon as the wallet returns the transaction hash — BEFORE waiting for
 * confirmation (covers the "user closes the tab right after signing" case: the hash is already
 * saved). `deadlineUnixSeconds` is the exact same value used as the transaction's `prazo`
 * argument (computed on the client, a single time, right before building the call) — it stores
 * opens_at/closes_at with it to "freeze" the real window that went to the chain, since the
 * on-chain offering is immutable and the Supabase row isn't (see section 5 of the plan).
 *
 * It also freezes `expected_emissor_wallet` (migration 0016) from its own read of
 * issuers.wallet_address, done HERE, on the server — never accepted from the client. It's this
 * value, never a future re-read of issuers.wallet_address, that confirmPublication compares
 * against the mined event's `emissor`, even in a reprocessing long after the signature.
 * Fail-closed: without a linked wallet, the attempt isn't even recorded (gate 5 on the client
 * should already have prevented getting here — this is just the same check, on the server).
 */
export async function registerAttempt(input: unknown): Promise<RegisterAttemptState> {
  const e = (await getDictionary()).serverErrors;
  const { role, accountId } = await resolveAccount();
  if (role !== "issuer" || !accountId) {
    return { status: "error", message: e.issuersOnly.publish };
  }

  const parsed = registerAttemptSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: e.publication.invalidData };
  }
  const { offeringId, txHash, deadlineUnixSeconds } = parsed.data;

  const admin = createAdminClient();

  const { data: issuer, error: issuerError } = await admin
    .from("issuers")
    .select("wallet_address")
    .eq("id", accountId)
    .maybeSingle();
  if (issuerError) {
    console.error("registerAttempt: failed to read the issuer's wallet", issuerError);
    return { status: "error", message: e.publication.attemptFailed };
  }
  const linkedWallet = (issuer?.wallet_address as string | null) ?? null;
  if (!linkedWallet) {
    return { status: "error", message: e.publication.noLinkedWallet };
  }

  const opensAt = new Date();
  const closesAt = new Date(deadlineUnixSeconds * 1000);

  // Atomic: whoever gets there first in a race between two clicks wins (same pattern as
  // activateOffering) — the `sync_status='nao_onchain'` condition guarantees only the FIRST
  // attempt is recorded.
  const { data, error } = await admin
    .from("offerings")
    .update({
      // Explicit network (migration 0017): a previous attempt reverted on Solana may have left the
      // row with rede='solana-devnet' — this attempt is on Sepolia.
      rede: "sepolia",
      tx_hash: txHash,
      chain_id: ORCHESTRATOR_CHAIN_ID,
      sync_status: "pendente",
      opens_at: opensAt.toISOString(),
      closes_at: closesAt.toISOString(),
      expected_emissor_wallet: linkedWallet,
    })
    .eq("id", offeringId)
    .eq("issuer_id", accountId)
    .eq("sync_status", "nao_onchain")
    .select("id");

  if (error) {
    console.error("registerAttempt: unexpected database error", error);
    return { status: "error", message: e.publication.attemptFailed };
  }
  if (!data || data.length === 0) {
    return { status: "error", message: e.publication.attemptInProgress };
  }

  revalidatePath(`/empresa/ofertas/${offeringId}/publicar`);
  return { status: "success" };
}

export type ConfirmPublicationState =
  | { status: "pendente" }
  | { status: "confirmada"; contractAddress: string; tokenAddress: string }
  | { status: "reverted"; reason: string }
  | { status: "divergente"; reason: string }
  | { status: "error"; message: string };

/**
 * Never trusts anything from the client besides `offeringId`. Reads the `tx_hash` from the row
 * itself, fetches the receipt on the server and validates the publication's authenticity
 * ENTIRELY by logs + the clones' provenance, never by `receipt.to` (see the note at the top of the
 * file):
 *
 *   1. There's a log in the receipt whose `address` is exactly the configured OfertaOrquestrador,
 *      and which decodes as `OfertaCompletaCriada` — only the contract itself can emit a log with
 *      its own address.
 *   2. The event's `emissor` matches `offerings.expected_emissor_wallet` — the issuers.wallet_address
 *      value FROZEN by `registerAttempt` at the moment of the attempt, never a live re-read of
 *      issuers (see migration 0016) — and metaMinima/metaMaxima/precoPorCota/prazo match what the
 *      offering had when the transaction was built (see `registerAttempt`).
 *   3. The event's `token`/`oferta` are REALLY registered in the right factories
 *      (`ParticipacaoTokenFactory.isOferta` / `OfertaCaptacaoFactory.isCaptacao`) — confirms the
 *      clones' provenance, not just that "some contract exists at that address".
 *
 * Only after the three checks are contract_address/token_address/onchain_emissor_wallet stored —
 * always the values read from the event, never a claim accepted from anyone.
 */
export async function confirmPublication(offeringId: string): Promise<ConfirmPublicationState> {
  const dict = await getDictionary();
  const e = dict.serverErrors;
  const { role, accountId } = await resolveAccount();
  if (role !== "issuer" || !accountId) {
    return { status: "error", message: e.issuersOnly.confirm };
  }

  const parsedId = z.string().uuid().safeParse(offeringId);
  if (!parsedId.success) {
    return { status: "error", message: e.invalidOffering };
  }

  const admin = createAdminClient();
  const { data: offering, error: fetchError } = await admin
    .from("offerings")
    .select(
      "id, rede, tx_hash, sync_status, target_min_cents, hard_cap_cents, share_price_cents, closes_at, contract_address, token_address, expected_emissor_wallet",
    )
    .eq("id", parsedId.data)
    .eq("issuer_id", accountId)
    .maybeSingle();

  if (fetchError || !offering) {
    return { status: "error", message: e.offeringNotFound };
  }
  // A Solana publication is checked by solana-actions.ts — never read a base58 signature as an EVM
  // hash.
  if (offering.rede !== "sepolia") {
    return { status: "error", message: e.publication.publishedOnSolana };
  }

  if (offering.sync_status === "confirmada") {
    // Idempotent: already confirmed before (e.g. the client called it again for nothing) — only
    // returns what's already stored, without touching the chain again.
    return {
      status: "confirmada",
      contractAddress: offering.contract_address as string,
      tokenAddress: offering.token_address as string,
    };
  }
  // 'divergente' can also be reprocessed here (not only 'pendente') — that's exactly the normal
  // path to fix a false positive from the checker (e.g. the EIP-7702 incident, see CLAUDE.md),
  // without a manual UPDATE. tx_hash is never cleared when marking divergent (only on a real
  // revert), so it's still available for reprocessing.
  if (!["pendente", "divergente"].includes(offering.sync_status as string) || !offering.tx_hash) {
    return { status: "error", message: e.publication.notPending };
  }

  // Defensive: the sync_status_tem_wallet_esperada constraint (migration 0016) already guarantees
  // this in the database for any new row, but the code doesn't blindly trust it — same pattern
  // already used above for tx_hash.
  const linkedWallet = (offering.expected_emissor_wallet as string | null) ?? null;
  if (!linkedWallet) {
    return { status: "error", message: e.publication.noFrozenWallet };
  }

  const orchestrator = getOrchestratorContract();
  if (!orchestrator) {
    return { status: "error", message: e.publication.contractNotConfigured };
  }

  const client = publicClient();

  let receipt;
  try {
    receipt = await client.getTransactionReceipt({ hash: offering.tx_hash as `0x${string}` });
  } catch (err) {
    if (err instanceof TransactionReceiptNotFoundError) {
      return { status: "pendente" };
    }
    // RPC down, timeout etc. — never mistake it for "still mining".
    return { status: "error", message: describeOnChainError(err, dict.chainErrors.evm) };
  }

  if (receipt.status === "reverted") {
    // 🔴 Real bug fixed here: until this fix, this branch NEVER tried to decode the revert reason —
    // it always stored the same generic sentence ("the transaction reverted on-chain — try
    // publishing again"), even when the real reason was a Res. 88 limit violation (e.g.
    // LoteAdicionalExcedeLimite), in which case "try again" is WRONG advice: the offering's values
    // are the same, so it would revert again, every time. The custom error mapping
    // (chainErrors.evm.custom, see errors.ts) already covered that case since sub-step 4 — it was
    // just never consulted on this specific path (only in the client-side catch, which only fires
    // when signing/estimation fails BEFORE mining; here the transaction already mined and
    // reverted, without throwing anything for the client to catch).
    //
    // The receipt doesn't keep the revert reason (the EVM doesn't write it to the receipt) — the
    // only way to get the real reason is to RE-SIMULATE the SAME calldata that was mined (never
    // rebuilt from Supabase, which may have changed since the signature) against the chain state
    // of that time.
    const reason = await describeRevertReason(client, orchestrator, offering.tx_hash as `0x${string}`, receipt.blockNumber, dict);

    // expected_emissor_wallet goes back to null together with tx_hash: both belong to the SAME
    // attempt (the one that reverted) and a new one, via registerAttempt, must be able to freeze
    // both again from scratch. Allowed by the 0016 trigger because the target is 'nao_onchain'.
    await admin
      .from("offerings")
      .update({
        sync_status: "nao_onchain",
        tx_hash: null,
        // Cleared together (migration 0017): without a stored address, chain_id isn't final yet —
        // and leaving it filled would block a new attempt on Solana.
        chain_id: null,
        expected_emissor_wallet: null,
        onchain_last_error: reason,
      })
      .eq("id", parsedId.data)
      .eq("issuer_id", accountId)
      .in("sync_status", ["pendente", "divergente"]);
    revalidatePath(`/empresa/ofertas/${parsedId.data}/publicar`);
    return { status: "reverted", reason };
  }

  // A log from OfertaOrquestrador itself — unforgeable: only the contract at that address can emit
  // a log with that `address`, no matter what the transaction's top-level `to` was.
  const log = receipt.logs.find((l) => l.address.toLowerCase() === orchestrator.address.toLowerCase());
  if (!log) {
    const reason = e.publication.noOrchestratorEvent;
    await markDivergent(admin, parsedId.data, accountId, reason);
    return { status: "divergente", reason };
  }

  let decoded;
  try {
    decoded = decodeEventLog({ abi: orchestrator.abi, data: log.data, topics: log.topics, eventName: "OfertaCompletaCriada" });
  } catch {
    const reason = e.publication.wrongEvent;
    await markDivergent(admin, parsedId.data, accountId, reason);
    return { status: "divergente", reason };
  }

  const { emissor: issuer, token, oferta, metaMinima: minTarget, metaMaxima: maxTarget, precoPorCota: pricePerShare, prazo: deadline } = decoded.args;

  const expectedMinTarget = BigInt(offering.target_min_cents) * UNIT_ON_CHAIN;
  const expectedMaxTarget = BigInt(offering.hard_cap_cents) * UNIT_ON_CHAIN;
  const expectedPricePerShare = BigInt(offering.share_price_cents as number) * UNIT_ON_CHAIN;
  const expectedDeadline = BigInt(Math.floor(new Date(offering.closes_at as string).getTime() / 1000));

  if (
    issuer.toLowerCase() !== linkedWallet.toLowerCase() ||
    minTarget !== expectedMinTarget ||
    maxTarget !== expectedMaxTarget ||
    pricePerShare !== expectedPricePerShare ||
    deadline !== expectedDeadline
  ) {
    const reason = e.publication.eventMismatch;
    await markDivergent(admin, parsedId.data, accountId, reason);
    return { status: "divergente", reason };
  }

  // The clones' provenance: confirms token/offering were REALLY registered by the orchestrator's
  // own factories (read from it, never from a loose env var) — "some contract exists at that
  // address" isn't enough.
  const [tokenFactoryAddress, fundraisingFactoryAddress] = await Promise.all([
    client.readContract({ address: orchestrator.address, abi: orchestrator.abi, functionName: "tokenFactory" }),
    client.readContract({ address: orchestrator.address, abi: orchestrator.abi, functionName: "captacaoFactory" }),
  ]);
  const [tokenRegistered, offeringRegistered] = await Promise.all([
    client.readContract({ address: tokenFactoryAddress, abi: participacaoTokenFactoryAbi, functionName: "isOferta", args: [token] }),
    client.readContract({ address: fundraisingFactoryAddress, abi: ofertaCaptacaoFactoryAbi, functionName: "isCaptacao", args: [oferta] }),
  ]);

  if (!tokenRegistered || !offeringRegistered) {
    const reason = e.publication.notInFactories;
    await markDivergent(admin, parsedId.data, accountId, reason);
    return { status: "divergente", reason };
  }

  const { error: updateError } = await admin
    .from("offerings")
    .update({
      contract_address: oferta,
      token_address: token,
      onchain_emissor_wallet: issuer,
      sync_status: "confirmada",
      onchain_confirmed_at: new Date().toISOString(),
    })
    .eq("id", parsedId.data)
    .eq("issuer_id", accountId)
    .in("sync_status", ["pendente", "divergente"]);

  if (updateError) {
    console.error("confirmPublication: failed to store the confirmation", updateError);
    return { status: "error", message: e.publication.saveFailed };
  }

  revalidatePath(`/empresa/ofertas/${parsedId.data}/publicar`);
  return { status: "confirmada", contractAddress: oferta, tokenAddress: token };
}

async function markDivergent(
  admin: ReturnType<typeof createAdminClient>,
  offeringId: string,
  accountId: string,
  reason: string,
) {
  await admin
    .from("offerings")
    .update({ sync_status: "divergente", onchain_last_error: reason })
    .eq("id", offeringId)
    .eq("issuer_id", accountId)
    .in("sync_status", ["pendente", "divergente"]);
  revalidatePath(`/empresa/ofertas/${offeringId}/publicar`);
}

/**
 * Decodes the real reason for a MINED transaction with `status: "reverted"` — the receipt doesn't
 * keep the reason (the EVM doesn't write it there), so the only reliable way is to re-simulate
 * the SAME calldata that was mined (decoded back from the transaction's own `input`, never rebuilt
 * from Supabase — which may already have changed since the signature) against the chain state at
 * the block where it reverted. `simulateContract` decodes custom errors into
 * `ContractFunctionRevertedError` the way `describeOnChainError` already knows how to translate —
 * the same function used in the client-side catch (usePublicarOfertaOnChain.ts), never a second
 * translation logic. Never throws — always returns a string, with a fallback only if the decoding
 * itself fails (e.g. the transaction reverted for a reason that no longer reproduces).
 */
async function describeRevertReason(
  client: ReturnType<typeof publicClient>,
  orchestrator: OrchestratorContract,
  txHash: `0x${string}`,
  blockNumber: bigint,
  dict: Dictionary,
): Promise<string> {
  try {
    const tx = await client.getTransaction({ hash: txHash });
    const decoded = decodeFunctionData({ abi: orchestrator.abi, data: tx.input });
    if (decoded.functionName !== "criarOfertaCompleta" || !decoded.args) {
      return dict.serverErrors.publication.revertUndecodable;
    }

    await client.simulateContract({
      address: orchestrator.address,
      abi: orchestrator.abi,
      functionName: "criarOfertaCompleta",
      args: decoded.args as readonly [string, string, string, `0x${string}`, string, bigint, bigint, bigint, bigint],
      account: tx.from,
      blockNumber,
    });

    // Shouldn't get here: if the re-simulation doesn't revert, the mined transaction reverted for a
    // reason that no longer reproduces now (e.g. the state changed between the mined block and the
    // call above) — rare enough not to deserve its own sentence, but better than inventing a
    // reason.
    return dict.serverErrors.publication.revertNotReproduced;
  } catch (error) {
    return describeOnChainError(error, dict.chainErrors.evm);
  }
}

export type CheckConsistencyState =
  | { status: "confirmada" }
  | { status: "divergente"; reason: string }
  | { status: "error"; message: string };

/**
 * Sub-step 5 of the plan (see PLANO_FASE_3_PUBLICACAO_ONCHAIN.md, section 4.2) — continuous
 * reconciliation. The on-chain offering is IMMUTABLE once created, but the `offerings` row isn't:
 * nothing prevents a manual UPDATE of `hard_cap_cents`/`share_price_cents`/`target_min_cents`/
 * `closes_at` after the confirmation. This function only COMPARES both sides and flags — it NEVER
 * fixes either of them (neither Supabase from the chain, nor the chain from Supabase, which is
 * immutable anyway). The fix, when there is one, is always human: someone edits Supabase back to
 * match the chain (the chain never changes), and a new call here clears the `divergente`.
 *
 * Runs against `contract_address` directly (the `metaMinima`/`metaMaxima`/`precoPorCota`/`prazo`
 * getters of the `OfertaCaptacao` clone itself) — it doesn't need the `tx_hash` nor to decode the
 * event again (unlike `confirmPublication`), because those four values are effectively
 * `immutable` in the contract (written once in `initialize`, never changed afterwards) — reading
 * them directly today is as valid as the original event.
 *
 * Only runs when `contract_address` already exists — i.e. when the offering has been confirmed at
 * least once (the current `sync_status` can be `confirmada` or `divergente`: a previous
 * `divergente` from this SAME function, already fixed in Supabase, must be able to go back to
 * `confirmada` here). A `divergente` offering that was never confirmed (missing log, wrong event,
 * unregistered clone — a `confirmPublication` failure) has no `contract_address` to compare; that
 * one is still resolved by "Reprocess", not by this function.
 */
export async function checkConsistency(offeringId: string): Promise<CheckConsistencyState> {
  const dict = await getDictionary();
  const e = dict.serverErrors;
  const { role, accountId } = await resolveAccount();
  if (role !== "issuer" || !accountId) {
    return { status: "error", message: e.issuersOnly.verify };
  }

  const parsedId = z.string().uuid().safeParse(offeringId);
  if (!parsedId.success) {
    return { status: "error", message: e.invalidOffering };
  }

  const admin = createAdminClient();
  const { data: offering, error: fetchError } = await admin
    .from("offerings")
    .select("id, rede, sync_status, contract_address, target_min_cents, hard_cap_cents, share_price_cents, closes_at")
    .eq("id", parsedId.data)
    .eq("issuer_id", accountId)
    .maybeSingle();

  if (fetchError || !offering) {
    return { status: "error", message: e.offeringNotFound };
  }

  if (offering.rede !== "sepolia") {
    return { status: "error", message: e.publication.publishedOnSolana };
  }
  if (!["confirmada", "divergente"].includes(offering.sync_status as string) || !offering.contract_address) {
    return { status: "error", message: e.publication.notConfirmedYet };
  }

  const client = publicClient();
  const contractAddress = offering.contract_address as `0x${string}`;

  let onchain;
  try {
    const [metaMinima, metaMaxima, precoPorCota, prazo] = await Promise.all([
      client.readContract({ address: contractAddress, abi: ofertaCaptacaoAbi, functionName: "metaMinima" }),
      client.readContract({ address: contractAddress, abi: ofertaCaptacaoAbi, functionName: "metaMaxima" }),
      client.readContract({ address: contractAddress, abi: ofertaCaptacaoAbi, functionName: "precoPorCota" }),
      client.readContract({ address: contractAddress, abi: ofertaCaptacaoAbi, functionName: "prazo" }),
    ]);
    onchain = { metaMinima, metaMaxima, precoPorCota, prazo };
  } catch (err) {
    // RPC down, timeout etc. — never marks divergent for not having been able to ask.
    return { status: "error", message: describeOnChainError(err, dict.chainErrors.evm) };
  }

  const expectedMinTarget = BigInt(offering.target_min_cents) * UNIT_ON_CHAIN;
  const expectedMaxTarget = BigInt(offering.hard_cap_cents) * UNIT_ON_CHAIN;
  const expectedPricePerShare = BigInt(offering.share_price_cents as number) * UNIT_ON_CHAIN;
  const expectedDeadline = BigInt(Math.floor(new Date(offering.closes_at as string).getTime() / 1000));

  const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
  const centsFromChain = (amountWei: bigint) => Number(amountWei / UNIT_ON_CHAIN);

  const diffs: string[] = [];
  if (onchain.metaMinima !== expectedMinTarget) {
    diffs.push(
      e.publication.diffMinTarget(formatBRL(offering.target_min_cents / 100), formatBRL(centsFromChain(onchain.metaMinima) / 100)),
    );
  }
  if (onchain.metaMaxima !== expectedMaxTarget) {
    diffs.push(e.publication.diffHardCap(formatBRL(offering.hard_cap_cents / 100), formatBRL(centsFromChain(onchain.metaMaxima) / 100)));
  }
  if (onchain.precoPorCota !== expectedPricePerShare) {
    diffs.push(
      e.publication.diffSharePrice(
        formatBRL((offering.share_price_cents as number) / 100),
        formatBRL(centsFromChain(onchain.precoPorCota) / 100),
      ),
    );
  }
  if (onchain.prazo !== expectedDeadline) {
    diffs.push(
      e.publication.diffDeadline(
        dateFormatter.format(new Date(offering.closes_at as string)),
        dateFormatter.format(new Date(Number(onchain.prazo) * 1000)),
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

  // No differences: guarantees 'confirmada' (it may be coming from 'divergente', if the drift
  // detected before has already been fixed in Supabase) and clears the previous error.
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

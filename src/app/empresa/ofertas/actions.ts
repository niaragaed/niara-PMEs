"use server";

// Fundraising offering Server Actions — only a COMPANY (issuer) creates/activates. HONESTY RULE:
// this actually WRITES to the database. issuer_id never comes from the client, always from
// resolveAccount() (session on the server). zod only checks FORMAT/basic UX ranges; the Res. 88
// rules (R$15M cap, additional lot <=25%, deadline <=180d, target<=cap) are checked by the
// database — the action attempts the operation and translates the CHECK that failed. None of
// these rules is replicated here beyond what's needed to avoid sending obvious garbage to the
// database (e.g. a percentage outside 0-25, a deadline outside 1-180).
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";
import { chain } from "@/lib/adapters";
import { resolveAccount } from "@/lib/auth/resolveInvestor";
import { createAdminClient } from "@/lib/supabase/admin";
import { MONEY_FORMAT, reaisToCents } from "@/lib/money";
import { getDictionary } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { firstFieldErrors } from "@/lib/registration-schemas";

export type OfferingActionState =
  | { status: "success" }
  | { status: "error"; message: string; fieldErrors?: Partial<Record<string, string>> };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Same set of categories as the offerings.category CHECK (0009) and the TokenCategory type
// (src/lib/mock/assets.ts) — all selectable in this demo; the database CHECK remains the real
// backstop. The values are database codes, not interface copy.
const OFFERING_CATEGORIES = ["pmes", "agro", "imobiliario", "auto", "divida"] as const;

function createOfferingSchema(e: Dictionary["serverErrors"]) {
  return z.object({
    baseCapReais: z.string().trim().min(1, e.offerings.valueRequired).regex(MONEY_FORMAT, e.moneyFormat),
    targetMinReais: z.string().trim().min(1, e.offerings.minTargetRequired).regex(MONEY_FORMAT, e.moneyFormat),
    additionalLotPct: z.coerce.number().int().min(0).max(25),
    windowDays: z.coerce.number().int().min(1).max(180),
    sharePriceReais: z.string().trim().min(1, e.offerings.valuePerShareRequired).regex(MONEY_FORMAT, e.moneyFormat),
    category: z.enum(OFFERING_CATEGORIES, { message: e.offerings.selectCategory }),
    // The network the offering will be published on (offerings.rede, migration 0017). Only the
    // intent: until there is a publication attempt, the publish screen still lets the issuer switch,
    // and the definitive network is written by registerAttempt/registerSolanaAttempt.
    network: z.enum(["sepolia", "solana-devnet"], { message: e.offerings.selectNetwork }),
  });
}

// hard_cap = base + floor(base * pct / 100), all in BigInt/integer cents — never float. With
// pct=0 the result is EXACTLY base (adding zero doesn't change the value). BigInt division
// truncates toward zero, which for non-negative values is floor — the same semantics as the
// integer division the database's "additional_lot" CHECK uses (base_cap_cents / 4).
// Mathematically, floor(base*25/100) == floor(base/4) for every integer base (25/100 and 1/4 are
// the same exact fraction), so with pct in the validated range [0,25] the result never exceeds
// the CHECK's cap — it only reinforces, never replaces, the database validation.
function computeHardCapCents(baseCapCents: bigint, additionalLotPct: number): bigint {
  return baseCapCents + (baseCapCents * BigInt(additionalLotPct)) / BigInt(100);
}

function translateOfferingDbError(error: PostgrestError, e: Dictionary["serverErrors"]): OfferingActionState {
  if (error.code === "23514") {
    if (error.message.includes("cap_le_15m")) {
      return { status: "error", message: e.offerings.capAbove15m };
    }
    if (error.message.includes("additional_lot")) {
      return { status: "error", message: e.offerings.lotAbove25 };
    }
    if (error.message.includes("window_le_180d")) {
      return { status: "error", message: e.offerings.windowAbove180 };
    }
    if (error.message.includes("min_le_hardcap")) {
      return { status: "error", message: e.offerings.minAboveCap };
    }
    if (error.message.includes("offerings_share_price_cents_check")) {
      return {
        status: "error",
        message: e.offerings.notMultiple,
        fieldErrors: { sharePriceReais: e.offerings.notMultipleField },
      };
    }
  }
  console.error("offerings: unexpected database error", error);
  return { status: "error", message: e.offerings.operationFailed };
}

export async function createOffering(dataInput: unknown): Promise<OfferingActionState> {
  const e = (await getDictionary()).serverErrors;
  const { role, accountId } = await resolveAccount();
  if (role !== "issuer" || !accountId) {
    return { status: "error", message: e.issuersOnly.createOfferings };
  }

  const parsed = createOfferingSchema(e).safeParse(dataInput);
  if (!parsed.success) {
    return { status: "error", message: e.fixFields, fieldErrors: firstFieldErrors(parsed.error) };
  }

  const baseCapCents = reaisToCents(parsed.data.baseCapReais);
  const targetMinCents = reaisToCents(parsed.data.targetMinReais);
  const sharePriceCents = reaisToCents(parsed.data.sharePriceReais);
  if (baseCapCents === null || targetMinCents === null || sharePriceCents === null) {
    return {
      status: "error",
      message: e.fixFields,
      fieldErrors: {
        ...(baseCapCents === null ? { baseCapReais: e.moneyFormat } : {}),
        ...(targetMinCents === null ? { targetMinReais: e.moneyFormat } : {}),
        ...(sharePriceCents === null ? { sharePriceReais: e.moneyFormat } : {}),
      },
    };
  }

  const hardCapCents = computeHardCapCents(baseCapCents, parsed.data.additionalLotPct);

  const opensAt = new Date();
  const closesAt = new Date(opensAt.getTime() + parsed.data.windowDays * MS_PER_DAY);

  const admin = createAdminClient();
  const { error } = await admin.from("offerings").insert({
    issuer_id: accountId,
    status: "draft",
    target_min_cents: targetMinCents.toString(),
    base_cap_cents: baseCapCents.toString(),
    hard_cap_cents: hardCapCents.toString(),
    share_price_cents: sharePriceCents.toString(),
    category: parsed.data.category,
    rede: parsed.data.network,
    opens_at: opensAt.toISOString(),
    closes_at: closesAt.toISOString(),
    is_demo: process.env.NIARA_ENV === "demo",
  });

  if (error) {
    return translateOfferingDbError(error, e);
  }

  revalidatePath("/empresa/ofertas");
  return { status: "success" };
}

export async function activateOffering(offeringId: string): Promise<OfferingActionState> {
  const e = (await getDictionary()).serverErrors;
  const { role, accountId } = await resolveAccount();
  if (role !== "issuer" || !accountId) {
    return { status: "error", message: e.issuersOnly.activateOfferings };
  }

  const admin = createAdminClient();

  const { data: offering, error: fetchError } = await admin
    .from("offerings")
    .select("opens_at, closes_at, status")
    .eq("id", offeringId)
    .eq("issuer_id", accountId)
    .maybeSingle();

  if (fetchError) {
    return translateOfferingDbError(fetchError, e);
  }
  if (!offering) {
    return { status: "error", message: e.offeringNotFound };
  }
  if (offering.status !== "draft") {
    return { status: "error", message: e.offerings.onlyDraftActivate };
  }

  // Recomputes the window from the ORIGINAL deadline (in days, derived from the draft) — the
  // offering can't start active already outside its window just because it sat in draft for a few
  // days before being activated. opens_at also becomes the moment of activation, not the draft's
  // creation.
  const originalOpensAt = new Date(offering.opens_at as string);
  const originalClosesAt = new Date(offering.closes_at as string);
  const windowDays = Math.round((originalClosesAt.getTime() - originalOpensAt.getTime()) / MS_PER_DAY);

  const newOpensAt = new Date();
  const newClosesAt = new Date(newOpensAt.getTime() + windowDays * MS_PER_DAY);

  // Atomic UPDATE: restates id + issuer_id + status='draft' in the WHERE clause itself (there's no
  // status transition trigger on `offerings`, unlike `investments`) — protects against a race
  // between the SELECT above and this UPDATE (two almost simultaneous clicks, for example). If no
  // row comes back, the offering stopped belonging to the issuer/stopped being a draft between the
  // two calls.
  const { data: updated, error: updateError } = await admin
    .from("offerings")
    .update({
      status: "active",
      opens_at: newOpensAt.toISOString(),
      closes_at: newClosesAt.toISOString(),
    })
    .eq("id", offeringId)
    .eq("issuer_id", accountId)
    .eq("status", "draft")
    .select("id");

  if (updateError) {
    return translateOfferingDbError(updateError, e);
  }
  if (!updated || updated.length === 0) {
    return { status: "error", message: e.offerings.activateFailed };
  }

  revalidatePath("/empresa/ofertas");
  return { status: "success" };
}

// Closing (3b-4) — settle_offering/mark_offering_settled (0002) are the AUTHORITY that decides
// funded/failed and adjusts the investments; this action only calls the RPCs and, in the funded
// case, issues the mock token per paid investment before settling. No minimum target rule is
// replicated here.
export type CloseOfferingState =
  | { status: "success"; result: "funded" | "failed" }
  | { status: "error"; message: string };

function translateCloseOfferingDbError(error: PostgrestError, e: Dictionary["serverErrors"]): CloseOfferingState {
  if (error.code === "23514" && error.message.includes("nao esta ativa")) {
    return { status: "error", message: e.offerings.alreadyClosed };
  }
  console.error("offerings: unexpected error while closing the fundraising", error);
  return { status: "error", message: e.offerings.closeFailed };
}

export async function closeOffering(offeringIdInput: unknown): Promise<CloseOfferingState> {
  const e = (await getDictionary()).serverErrors;
  const { role, accountId } = await resolveAccount();
  if (role !== "issuer" || !accountId) {
    return { status: "error", message: e.issuersOnly.closeFundraising };
  }

  const parsedId = z.string().uuid().safeParse(offeringIdInput);
  if (!parsedId.success) {
    return { status: "error", message: e.invalidOffering };
  }
  const offeringId = parsedId.data;

  const admin = createAdminClient();

  // Checks that the offering belongs to the signed-in issuer before acting — offeringId alone
  // doesn't authorize anything. status comes along so a close that already reached 'funded' in a
  // previous attempt can be resumed without calling settle_offering again (it only accepts an
  // 'active' offering).
  const { data: offering, error: fetchError } = await admin
    .from("offerings")
    .select("id, status")
    .eq("id", offeringId)
    .eq("issuer_id", accountId)
    .maybeSingle();

  if (fetchError) {
    console.error("offerings: failed to fetch the offering for closing", fetchError);
    return { status: "error", message: e.offerings.closeFailed };
  }
  if (!offering) {
    return { status: "error", message: e.offeringNotFound };
  }

  let settleResult: "funded" | "failed";

  if (offering.status === "funded") {
    // Resume: a previous attempt already resolved the offering as funded but didn't finish the
    // token issuance / mark_offering_settled. Doesn't call settle_offering again (it only accepts
    // status 'active').
    settleResult = "funded";
  } else {
    const { data: rpcResult, error: settleError } = await admin.rpc("settle_offering", {
      p_offering_id: offeringId,
    });
    if (settleError) {
      return translateCloseOfferingDbError(settleError, e);
    }
    settleResult = rpcResult as "funded" | "failed";
  }

  if (settleResult === "failed") {
    revalidatePath("/empresa/ofertas");
    return { status: "success", result: "failed" };
  }

  // funded: issues the mock token per PAID investment before settling. Idempotent per investment —
  // idempotency_key = 'tokens-'||investment.id, the same key on any re-run, so a retry (or a race
  // between two clicks) doesn't duplicate issuance: the payment_events unique constraint blocks
  // the second write and the 23505 is treated as "already issued, carry on", not as an error.
  const { data: paidInvestments, error: paidError } = await admin
    .from("investments")
    .select("id, investor_id, amount_cents")
    .eq("offering_id", offeringId)
    .eq("status", "paid");

  if (paidError) {
    console.error("offerings: failed to fetch paid investments for issuance", paidError);
    return { status: "error", message: e.offerings.issuanceFailed };
  }

  for (const investment of paidInvestments ?? []) {
    const idempotencyKey = `tokens-${investment.id}`;

    const issuance = await chain.issueTokens({
      offeringId,
      investorId: investment.investor_id as string,
      quantity: Number(investment.amount_cents),
    });

    const { error: insertError } = await admin.from("payment_events").insert({
      investment_id: investment.id,
      event_type: "tokens_issued",
      external_ref: issuance.ref,
      idempotency_key: idempotencyKey,
    });

    if (insertError && insertError.code !== "23505") {
      console.error("offerings: failed to record the token issuance", insertError);
      return { status: "error", message: e.offerings.issuanceFailed };
    }
    // 23505 (idempotency_key already exists) = this investment already had its token issued in a
    // previous attempt — carry on without duplicating, it's not an error.
  }

  const { error: settledError } = await admin.rpc("mark_offering_settled", {
    p_offering_id: offeringId,
  });

  if (settledError) {
    return translateCloseOfferingDbError(settledError, e);
  }

  revalidatePath("/empresa/ofertas");
  return { status: "success", result: "funded" };
}

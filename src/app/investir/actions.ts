"use server";

// Investment reservation Server Action — only an INVESTOR reserves (status 'reserved'). HONESTY
// RULE: this actually WRITES to the database; investor_id never comes from the client, always from
// resolveAccount() (session on the server). zod only checks format/basic UX ranges; what blocks
// the Res. 88 limits (the investor's annual cap, the offering's hard_cap, the offering's
// window/status) is the DATABASE via triggers (see supabase/migrations/0001_core.sql) — the action
// attempts the insert and translates the error the trigger raised. None of those limits is
// replicated here.
//
// 🔴 translateInvestmentDbError matches substrings of the Portuguese RAISE EXCEPTION messages in
// the migrations ("teto anual do investidor", "estoura o hard_cap", ...). They are database
// values, not interface copy — never translate them here without changing the migration too.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";
import { resolveAccount } from "@/lib/auth/resolveInvestor";
import { payments } from "@/lib/adapters";
import { CAP_OCCUPYING_STATUSES } from "@/lib/investments";
import { maskCnpjPublic } from "@/lib/masks";
import type { TokenCategory } from "@/lib/mock/assets";
import { createAdminClient } from "@/lib/supabase/admin";
import { MONEY_FORMAT, reaisToCents } from "@/lib/money";
import { getIssuerLogoVersion, issuerLogoUrl } from "@/lib/storage/issuer-logo";
import { getDictionary } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { firstFieldErrors } from "@/lib/registration-schemas";

export type ReserveInvestmentState =
  | { status: "success" }
  | { status: "error"; message: string; fieldErrors?: Partial<Record<string, string>> };

function reserveInvestmentSchema(e: Dictionary["serverErrors"]) {
  return z.object({
    offeringId: z.string().uuid(e.invalidOffering),
    amountReais: z.string().trim().min(1, e.invest.amountRequired).regex(MONEY_FORMAT, e.amountFormat),
  });
}

function translateInvestmentDbError(error: PostgrestError, e: Dictionary["serverErrors"]): ReserveInvestmentState {
  if (error.code === "23514") {
    if (error.message.includes("teto anual do investidor")) {
      return { status: "error", message: e.invest.annualLimit };
    }
    if (error.message.includes("estoura o hard_cap")) {
      return { status: "error", message: e.invest.capReached };
    }
    if (error.message.includes("nao esta ativa") || error.message.includes("fora da janela")) {
      return { status: "error", message: e.invest.notOpen };
    }
  }
  console.error("invest: unexpected database error", error);
  return { status: "error", message: e.invest.reserveFailed };
}

// Join used only by reserveInvestment's defense-in-depth check below — resolves the user_id of
// the issuer that owns the offering, to compare against the signed-in investor's userId (accountId
// doesn't work here: with role==='investor', accountId is always investors.id, never equal to
// issuers.id, even if the same user_id ended up linked to both accounts).
type OfferingIssuerLinkRow = {
  issuers: { user_id: string } | { user_id: string }[] | null;
};

function firstIssuerUserId(issuers: OfferingIssuerLinkRow["issuers"]): string | null {
  if (!issuers) return null;
  const issuerRow = Array.isArray(issuers) ? issuers[0] : issuers;
  return issuerRow?.user_id ?? null;
}

export async function reserveInvestment(dataInput: unknown): Promise<ReserveInvestmentState> {
  const e = (await getDictionary()).serverErrors;
  const { role, accountId, userId } = await resolveAccount();
  if (role !== "investor" || !accountId) {
    return { status: "error", message: e.investorsOnly.reserve };
  }

  const parsed = reserveInvestmentSchema(e).safeParse(dataInput);
  if (!parsed.success) {
    return { status: "error", message: e.fixFields, fieldErrors: firstFieldErrors(parsed.error) };
  }

  const amountCents = reaisToCents(parsed.data.amountReais);
  if (amountCents === null) {
    return { status: "error", message: e.fixFields, fieldErrors: { amountReais: e.amountFormat } };
  }

  const admin = createAdminClient();

  // Defense in depth: the role==='investor' gate above should already be enough (an account is an
  // investor OR a company, never both — see resolveInvestor.ts), but here we explicitly reinforce,
  // via user_id, that the signed-in investor isn't the owner of the company issuing this offering.
  // Never trusts accountId for this comparison (different account types).
  const { data: offeringLink, error: offeringLinkError } = await admin
    .from("offerings")
    .select("issuers(user_id)")
    .eq("id", parsed.data.offeringId)
    .maybeSingle();

  if (offeringLinkError) {
    console.error("invest: failed to check the offering owner", offeringLinkError);
    return { status: "error", message: e.invest.reserveFailed };
  }

  const issuerUserId = offeringLink ? firstIssuerUserId((offeringLink as OfferingIssuerLinkRow).issuers) : null;
  if (issuerUserId !== null && issuerUserId === userId) {
    return { status: "error", message: e.invest.ownOffering };
  }

  const { error } = await admin.from("investments").insert({
    offering_id: parsed.data.offeringId,
    investor_id: accountId,
    amount_cents: amountCents.toString(),
    is_demo: process.env.NIARA_ENV === "demo",
  });

  if (error) {
    return translateInvestmentDbError(error, e);
  }

  revalidatePath("/investir");
  return { status: "success" };
}

// Payment confirmation (reserved -> paid) — 3b-3. HONESTY RULE: the escrow is a MOCK
// (src/lib/mocks.ts, see src/lib/adapters.ts) — the ref stored as payment_ref always starts with
// "MOCK-". The confirm_investment function (supabase/migrations/0005_confirm_investment.sql) is
// what atomically decides whether the transition can happen (idempotency + KYC gate via trigger);
// this action doesn't re-check any of that in JS, it only calls the RPC and translates the
// result/error.
export type ConfirmInvestmentState =
  | { status: "success"; message: string }
  | { status: "error"; message: string; kycRequired?: boolean };

function translateConfirmInvestmentDbError(error: PostgrestError, e: Dictionary["serverErrors"]): ConfirmInvestmentState {
  if (error.code === "23514" && error.message.includes("KYC nao aprovado")) {
    return { status: "error", message: e.invest.kycRequired, kycRequired: true };
  }
  console.error("invest: unexpected error while confirming the payment", error);
  return { status: "error", message: e.invest.confirmFailed };
}

export async function confirmInvestment(investmentIdInput: unknown): Promise<ConfirmInvestmentState> {
  const e = (await getDictionary()).serverErrors;
  const { role, accountId } = await resolveAccount();
  if (role !== "investor" || !accountId) {
    return { status: "error", message: e.investorsOnly.confirmPayment };
  }

  const parsedId = z.string().uuid().safeParse(investmentIdInput);
  if (!parsedId.success) {
    return { status: "error", message: e.invest.invalidInvestment };
  }
  const investmentId = parsedId.data;

  const admin = createAdminClient();

  // Checks that the investment belongs to the signed-in investor before acting — investor_id never
  // comes from the client, and the investment id alone doesn't authorize anything.
  const { data: investment, error: fetchError } = await admin
    .from("investments")
    .select("id, investor_id, offering_id, amount_cents, status")
    .eq("id", investmentId)
    .maybeSingle();

  if (fetchError) {
    console.error("invest: failed to fetch the investment for confirmation", fetchError);
    return { status: "error", message: e.invest.confirmFailed };
  }
  if (!investment || investment.investor_id !== accountId) {
    return { status: "error", message: e.invest.investmentNotFound };
  }
  if (investment.status === "paid") {
    return { status: "success", message: e.invest.alreadyPaid };
  }

  const escrow = await payments.createEscrowIntent({
    offeringId: investment.offering_id as string,
    investorId: accountId,
    amountCents: Number(investment.amount_cents),
  });
  const confirmedEscrow = await payments.confirmPayment(escrow.ref);

  const { data: rpcResult, error: rpcError } = await admin.rpc("confirm_investment", {
    p_investment_id: investmentId,
    p_external_ref: confirmedEscrow.ref,
    p_idempotency_key: `confirm-${investmentId}`,
  });

  if (rpcError) {
    return translateConfirmInvestmentDbError(rpcError, e);
  }

  revalidatePath("/investir");

  if (rpcResult === "already_paid" || rpcResult === "already_processed") {
    return { status: "success", message: e.invest.alreadyPaid };
  }
  return { status: "success", message: e.invest.paid };
}

// Public read for the offering detail page (3b-4c) — GOLDEN RULE: any signed-in investor can see
// any company's offering, so the SELECT is an explicit ALLOWLIST, never select('*') on the issuer.
// phone, full address, wallet_address and gross revenue are NEVER fetched here — it isn't just a
// matter of not showing them in the JSX, the field never leaves the database, which also
// guarantees they never show up in the served HTML (view-source).
export type PublicOfferingIssuer = {
  legalName: string;
  tradeName: string | null;
  sector: string | null;
  businessSummary: string | null;
  city: string | null;
  state: string | null;
  /** null if the company didn't opt in to publishing it (issuers.publish_cnpj = false) — in that case tax_id isn't even read from the database. */
  cnpjMasked: string | null;
  logoUrl: string | null;
};

export type PublicOffering = {
  id: string;
  targetMinCents: number;
  baseCapCents: number;
  hardCapCents: number;
  sharePriceCents: number | null;
  category: TokenCategory | null;
  opensAt: string;
  closesAt: string;
  raisedCents: number;
  issuer: PublicOfferingIssuer;
};

type PublicOfferingIssuerRow = {
  legal_name: string;
  trade_name: string | null;
  sector: string | null;
  business_summary: string | null;
  addr_city: string | null;
  addr_state: string | null;
  publish_cnpj: boolean;
  logo_path: string | null;
};

type PublicOfferingRow = {
  id: string;
  issuer_id: string;
  target_min_cents: number;
  base_cap_cents: number;
  hard_cap_cents: number;
  share_price_cents: number | null;
  category: string | null;
  opens_at: string;
  closes_at: string;
  issuers: PublicOfferingIssuerRow | PublicOfferingIssuerRow[] | null;
};

function firstIssuer(issuers: PublicOfferingRow["issuers"]): PublicOfferingIssuerRow | null {
  if (!issuers) return null;
  return Array.isArray(issuers) ? (issuers[0] ?? null) : issuers;
}

export async function loadPublicOffering(offeringIdInput: unknown): Promise<PublicOffering | null> {
  const parsedId = z.string().uuid().safeParse(offeringIdInput);
  if (!parsedId.success) return null;
  const offeringId = parsedId.data;

  const admin = createAdminClient();

  // Step 1: allowlist, WITHOUT tax_id — publish_cnpj comes along only to decide whether step 2
  // (which reads tax_id) runs or not.
  const { data, error } = await admin
    .from("offerings")
    .select(
      "id, issuer_id, target_min_cents, base_cap_cents, hard_cap_cents, share_price_cents, category, opens_at, closes_at, issuers(legal_name, trade_name, sector, business_summary, addr_city, addr_state, publish_cnpj, logo_path)",
    )
    .eq("id", offeringId)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return null;

  const offering = data as unknown as PublicOfferingRow;
  const issuerRow = firstIssuer(offering.issuers);
  if (!issuerRow) return null;

  // Step 2: only fetches tax_id if the company opted in to publishing it — for those who didn't,
  // the CNPJ isn't read from the database, not just "not shown" in the JSX.
  let cnpjMasked: string | null = null;
  if (issuerRow.publish_cnpj) {
    const { data: taxIdRow } = await admin
      .from("issuers")
      .select("tax_id")
      .eq("id", offering.issuer_id)
      .maybeSingle();
    if (taxIdRow?.tax_id) {
      cnpjMasked = maskCnpjPublic(taxIdRow.tax_id);
    }
  }

  const { data: investmentsData } = await admin
    .from("investments")
    .select("amount_cents")
    .eq("offering_id", offeringId)
    .in("status", CAP_OCCUPYING_STATUSES);

  const raisedCents = (investmentsData ?? []).reduce(
    (total, investment) => total + Number(investment.amount_cents),
    0,
  );

  const logoUrl = issuerRow.logo_path
    ? issuerLogoUrl(issuerRow.logo_path, await getIssuerLogoVersion(admin, issuerRow.logo_path))
    : null;

  return {
    id: offering.id,
    targetMinCents: Number(offering.target_min_cents),
    baseCapCents: Number(offering.base_cap_cents),
    hardCapCents: Number(offering.hard_cap_cents),
    sharePriceCents: offering.share_price_cents === null ? null : Number(offering.share_price_cents),
    category: offering.category as TokenCategory | null,
    opensAt: offering.opens_at,
    closesAt: offering.closes_at,
    raisedCents,
    issuer: {
      legalName: issuerRow.legal_name,
      tradeName: issuerRow.trade_name,
      sector: issuerRow.sector,
      businessSummary: issuerRow.business_summary,
      city: issuerRow.addr_city,
      state: issuerRow.addr_state,
      cnpjMasked,
      logoUrl,
    },
  };
}

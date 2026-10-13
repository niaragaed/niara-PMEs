import "server-only";

// Public read of the offerings published through the on-chain self-service flow (Phase 3,
// /empresa/ofertas/[id]/publicar) and already confirmed — consumed by /investir/onchain
// (Phase 4, sub-step 5.1) and by the SME Token showcase in /negociar/token-pmes (see CLAUDE.md,
// "/investir/onchain screen" → "Phase 4"). GOLDEN RULE (same as src/lib/investments.ts): an
// explicit allowlist, never `select('*')` — the issuer's CNPJ, phone, full address, revenue and
// wallet are never fetched here.
//
// offerings.status always stays 'draft' for these rows (a Phase 3 decision — see CLAUDE.md,
// "/empresa/ofertas screen"), so the right filter is sync_status='confirmada', not status='active'.
// contract_address/token_address only exist (non-null) when sync_status is already 'confirmada' or
// 'divergente' — filtering by 'confirmada' already guarantees both are present (CHECK
// sync_status_confirmada_tem_enderecos, migration 0015), but the extra filter below is defensive,
// the same pattern already used in onchain-actions.ts.
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TokenCategory } from "@/lib/mock/ativos";
import { getIssuerLogoVersion, issuerLogoUrl } from "@/lib/storage/issuer-logo";
import { getIssuerBannerVersion, issuerBannerUrl } from "@/lib/storage/issuer-banner";

/** The network the offering was published on (migration 0017, `offerings.rede`). */
export type OfferingNetwork = "sepolia" | "solana-devnet";

/**
 * Addresses per network — a union discriminated by `rede` so that no EVM (viem/wagmi) consumer
 * receives a Solana base58 address by mistake: whoever needs a `0x${string}` has to check
 * `rede === "sepolia"` first, and the compiler enforces it.
 *   - Sepolia: `contractAddress` = OfertaCaptacao, `tokenAddress` = ParticipacaoToken.
 *   - Solana:  `contractAddress` = the offering account (a PDA of the niara-pmes-solana program),
 *              `tokenAddress` = the shares' SPL mint.
 */
export type OfferingAddressesByNetwork =
  | { rede: "sepolia"; contractAddress: `0x${string}`; tokenAddress: `0x${string}` }
  | { rede: "solana-devnet"; contractAddress: string; tokenAddress: string };

export type ConfirmedOnChainOffering = OfferingAddressesByNetwork & ConfirmedOnChainOfferingBase;

type ConfirmedOnChainOfferingBase = {
  id: string;
  /** `offerings.issuer_id` — the same id as `issuers.id` (accountId, see resolveAccount()). Used
   * only to decide "is this THIS signed-in company's offering?" (e.g. unlocking the "Close
   * offering" button for the issuing company, not just partners) — never exposed as contact data
   * nor used to authorize anything on its own (the role decision still comes from resolveAccount(), on the server). */
  issuerAccountId: string;
  /** `offerings.category` — nullable in the column, but createOffering() always requires a value for
   * self-service offerings; `null` here is only possible for a row outside the normal flow. */
  category: TokenCategory | null;
  issuerLegalName: string;
  issuerTradeName: string | null;
  issuerSector: string | null;
  /** Business summary filled in by the issuer itself on /perfil — real data, not fictitious. */
  issuerBusinessSummary: string | null;
  /** Real logo/banner uploaded by the issuer (a real upload, Supabase Storage) — see
   * src/lib/storage/issuer-logo.ts / issuer-banner.ts. `null` when the issuer didn't upload one. */
  logoUrl: string | null;
  bannerUrl: string | null;
  /** Minimum target in cents — the same guarantee/unit as `hardCapCents` below. */
  targetMinCents: number;
  /**
   * Maximum target (hard cap) in cents — the same unit/column that `confirmPublication()`/
   * `checkConsistency()` (onchain-actions.ts) use to check against the `metaMaxima` already
   * mined on-chain (`UNIT_ON_CHAIN`, src/lib/web3/gates.ts: "1 MockBRL unit = 1 real
   * equivalent") — that's why it's safe to show directly, without an on-chain read per card: for an
   * offering with `sync_status='confirmada'`, this value ALREADY matched the chain at confirmation time
   * (and is checked again on each reconciliation, see "Continuous reconciliation" in CLAUDE.md).
   */
  hardCapCents: number;
  /** Price per share in cents, the same unit/guarantee as `hardCapCents` above. */
  sharePriceCents: number | null;
  /** Derived from hardCapCents/sharePriceCents (the same derivation as ActiveOfferingSummary,
   * src/lib/investments.ts) — `null` only if for some reason sharePriceCents is also `null`. */
  sharesCount: number | null;
  /** The fundraising window's deadline (frozen in registerAttempt(), see CLAUDE.md). */
  opensAt: string;
  closesAt: string;
  /** When the on-chain confirmation happened — used to sort/date this offering in chronological
   * listings (e.g. the /socios timeline), it isn't the creation date of the row in Supabase. */
  onchainConfirmedAt: string | null;
};

const SELECT_COLUMNS =
  "id, issuer_id, rede, contract_address, token_address, category, target_min_cents, hard_cap_cents, share_price_cents, opens_at, closes_at, onchain_confirmed_at, issuers(legal_name, trade_name, sector, business_summary, logo_path, banner_path)";

type ConfirmedOfferingIssuerRow = {
  legal_name: string;
  trade_name: string | null;
  sector: string | null;
  business_summary: string | null;
  logo_path: string | null;
  banner_path: string | null;
};

type ConfirmedOfferingRow = {
  id: string;
  issuer_id: string;
  rede: string;
  contract_address: string | null;
  token_address: string | null;
  category: string | null;
  target_min_cents: number;
  hard_cap_cents: number;
  share_price_cents: number | null;
  opens_at: string;
  closes_at: string;
  onchain_confirmed_at: string | null;
  issuers: ConfirmedOfferingIssuerRow | ConfirmedOfferingIssuerRow[] | null;
};

// Postgrest embedding (`issuers(...)`) returns an object or an array depending on the version/config —
// the same ambiguity already handled in investments.ts (firstIssuer), duplicated here as a small
// helper instead of imported (the same pattern of not abstracting just 2 uses, see etherscanAddress in
// OfertasPage.tsx).
function firstIssuer(issuers: ConfirmedOfferingRow["issuers"]): ConfirmedOfferingIssuerRow | null {
  if (!issuers) return null;
  return Array.isArray(issuers) ? (issuers[0] ?? null) : issuers;
}

const HEX_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const BASE58_PUBKEY = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** The format is checked again here (on top of 0017's CHECKs) — never hands over one network's address
 * typed as the other's. A row with an unknown network or an invalid format is ignored. */
function addressesByNetwork(network: string, contract: string, token: string): OfferingAddressesByNetwork | null {
  if (network === "sepolia" && HEX_ADDRESS.test(contract) && HEX_ADDRESS.test(token)) {
    return { rede: network, contractAddress: contract as `0x${string}`, tokenAddress: token as `0x${string}` };
  }
  if (network === "solana-devnet" && BASE58_PUBKEY.test(contract) && BASE58_PUBKEY.test(token)) {
    return { rede: network, contractAddress: contract, tokenAddress: token };
  }
  return null;
}

async function mapRow(row: ConfirmedOfferingRow, admin: SupabaseClient): Promise<ConfirmedOnChainOffering | null> {
  const issuerRow = firstIssuer(row.issuers);
  if (!issuerRow || !row.contract_address || !row.token_address) return null;

  const logoUrl = issuerRow.logo_path
    ? issuerLogoUrl(issuerRow.logo_path, await getIssuerLogoVersion(admin, issuerRow.logo_path))
    : null;
  const bannerUrl = issuerRow.banner_path
    ? issuerBannerUrl(issuerRow.banner_path, await getIssuerBannerVersion(admin, issuerRow.banner_path))
    : null;

  // The same derivation as ActiveOfferingSummary (src/lib/investments.ts): the number of shares is never
  // a column, always hardCap/sharePrice — safe here because the on-chain CHECK
  // (PrecoNaoDivideMetaMaxima) would already have blocked the publication if it didn't divide exactly.
  const sharesCount =
    row.share_price_cents && row.share_price_cents > 0
      ? Math.round(Number(row.hard_cap_cents) / Number(row.share_price_cents))
      : null;

  const addresses = addressesByNetwork(row.rede, row.contract_address, row.token_address);
  if (!addresses) return null;

  return {
    ...addresses,
    id: row.id,
    issuerAccountId: row.issuer_id,
    category: row.category as TokenCategory | null,
    issuerLegalName: issuerRow.legal_name,
    issuerTradeName: issuerRow.trade_name,
    issuerSector: issuerRow.sector,
    issuerBusinessSummary: issuerRow.business_summary,
    logoUrl,
    bannerUrl,
    targetMinCents: Number(row.target_min_cents),
    hardCapCents: Number(row.hard_cap_cents),
    sharePriceCents: row.share_price_cents === null ? null : Number(row.share_price_cents),
    sharesCount,
    opensAt: row.opens_at,
    closesAt: row.closes_at,
    onchainConfirmedAt: row.onchain_confirmed_at,
  };
}

/**
 * All self-service offerings already confirmed on-chain, most recent first. Returns an empty list
 * (never throws) if there are none or if the query fails — the same "never breaks the page"
 * philosophy as getOnChainAddresses()/getEventsOnChain(). Doesn't filter by category — whoever
 * needs just one category (e.g. the /negociar/token-pmes showcase) filters after reading, as
 * CategoryPage.tsx already does.
 */
export async function loadConfirmedOnChainOfferings(): Promise<ConfirmedOnChainOffering[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("offerings")
    .select(SELECT_COLUMNS)
    .eq("sync_status", "confirmada")
    .order("onchain_confirmed_at", { ascending: false });

  if (error || !data) return [];

  const rows = data as unknown as ConfirmedOfferingRow[];
  const offerings = await Promise.all(rows.map((row) => mapRow(row, admin)));

  return offerings.filter((offering): offering is ConfirmedOnChainOffering => offering !== null);
}

/**
 * One specific confirmed self-service offering, by id — used by the detail page
 * (/negociar/oferta/[slug], where a self-service offering's "slug" is the `offerings.id` uuid
 * itself, since these rows have no readable slug column, only the PK). Returns `null`
 * (never throws) when the id isn't a valid uuid, the offering doesn't exist, isn't confirmed, or
 * lacks a category (defensive: createOffering() always requires a category for self-service, so
 * this would only happen for a row outside the normal flow — without a category there's no way to
 * build CategoryBadge/OfferingBanner, so we treat it as "not found" instead of breaking the page).
 */
export async function loadConfirmedOnChainOfferingById(idInput: string): Promise<ConfirmedOnChainOffering | null> {
  const parsedId = z.string().uuid().safeParse(idInput);
  if (!parsedId.success) return null;

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("offerings")
    .select(SELECT_COLUMNS)
    .eq("id", parsedId.data)
    .eq("sync_status", "confirmada")
    .maybeSingle();

  if (error || !data) return null;

  const offering = await mapRow(data as unknown as ConfirmedOfferingRow, admin);
  if (!offering || !offering.category) return null;

  return offering;
}

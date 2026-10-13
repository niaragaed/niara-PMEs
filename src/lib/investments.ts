import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { TokenCategory } from "@/lib/mock/assets";
import { getIssuerLogoVersion, issuerLogoUrl } from "@/lib/storage/issuer-logo";
import { getIssuerBannerVersion, issuerBannerUrl } from "@/lib/storage/issuer-banner";

// The set of statuses that "occupies" an offering's hard_cap — the same set
// the enforce_offering_hard_cap trigger uses (supabase/migrations/0001_core.sql).
// Used only to display "already reserved" in the listing (/investir) and in the detail
// (/investir/[offeringId]); NEVER to decide whether to accept/block an investment —
// the database blocks it (FOR UPDATE), this sum is purely informative and
// may be momentarily outdated due to concurrency.
export const CAP_OCCUPYING_STATUSES = ["reserved", "paid", "settled"];

// Showcase card of a REAL offering, for the /negociar category pages
// (only called for a signed-in investor — see CategoryPage.tsx).
// GOLDEN RULE: an explicit allowlist, never select('*') — it brings only the
// showcase minimum (name, sector, category, target, value per share, shares,
// deadline, logo/banner). CNPJ, phone, full address, revenue and wallet are NEVER
// fetched here; whoever needs those fields is the full record in
// /investir/[offeringId] (loadPublicOffering), which already applies its own
// broader allowlist.
export type ActiveOfferingSummary = {
  id: string;
  category: TokenCategory;
  issuerLegalName: string;
  issuerTradeName: string | null;
  sector: string | null;
  baseCapCents: number;
  sharePriceCents: number | null;
  sharesCount: number | null;
  opensAt: string;
  closesAt: string;
  logoUrl: string | null;
  bannerUrl: string | null;
};

type ActiveOfferingIssuerRow = {
  legal_name: string;
  trade_name: string | null;
  sector: string | null;
  logo_path: string | null;
  banner_path: string | null;
};

type ActiveOfferingRow = {
  id: string;
  category: string | null;
  base_cap_cents: number;
  share_price_cents: number | null;
  opens_at: string;
  closes_at: string;
  issuers: ActiveOfferingIssuerRow | ActiveOfferingIssuerRow[] | null;
};

function firstIssuer(issuers: ActiveOfferingRow["issuers"]): ActiveOfferingIssuerRow | null {
  if (!issuers) return null;
  return Array.isArray(issuers) ? (issuers[0] ?? null) : issuers;
}

// issuerAccountId (optional) restricts the search to the owning company itself
// (issuers.id) — used in CategoryPage.tsx when role==='issuer', to
// show only the signed-in issuer's own offering(s), never another
// company's. Without this filter (the investor case), it brings all active ones in the
// category, unchanged behavior.
export async function loadActiveOfferingsByCategory(
  category: TokenCategory,
  issuerAccountId?: string,
): Promise<ActiveOfferingSummary[]> {
  const admin = createAdminClient();

  const baseQuery = admin
    .from("offerings")
    .select(
      "id, category, base_cap_cents, share_price_cents, opens_at, closes_at, issuers(legal_name, trade_name, sector, logo_path, banner_path)",
    )
    .eq("status", "active")
    .eq("category", category);

  const { data, error } = await (issuerAccountId ? baseQuery.eq("issuer_id", issuerAccountId) : baseQuery).order(
    "opens_at",
    { ascending: false },
  );

  if (error || !data) return [];

  const rows = data as unknown as ActiveOfferingRow[];

  const summaries = await Promise.all(
    rows.map(async (row): Promise<ActiveOfferingSummary | null> => {
      const issuerRow = firstIssuer(row.issuers);
      if (!issuerRow) return null;

      // The number of shares isn't a column: it's derived from base_cap_cents / share_price_cents
      // (the same derivation as supabase/migrations/0008_offer_details.sql), only
      // when the company has already defined a value per share.
      const sharesCount =
        row.share_price_cents && row.share_price_cents > 0
          ? Math.round(Number(row.base_cap_cents) / Number(row.share_price_cents))
          : null;

      const logoUrl = issuerRow.logo_path
        ? issuerLogoUrl(issuerRow.logo_path, await getIssuerLogoVersion(admin, issuerRow.logo_path))
        : null;
      const bannerUrl = issuerRow.banner_path
        ? issuerBannerUrl(issuerRow.banner_path, await getIssuerBannerVersion(admin, issuerRow.banner_path))
        : null;

      return {
        id: row.id,
        category,
        issuerLegalName: issuerRow.legal_name,
        issuerTradeName: issuerRow.trade_name,
        sector: issuerRow.sector,
        baseCapCents: Number(row.base_cap_cents),
        sharePriceCents: row.share_price_cents === null ? null : Number(row.share_price_cents),
        sharesCount,
        opensAt: row.opens_at,
        closesAt: row.closes_at,
        logoUrl,
        bannerUrl,
      };
    }),
  );

  return summaries.filter((summary): summary is ActiveOfferingSummary => summary !== null);
}

// Checks whether accountId (issuers.id) owns offeringId — used only to
// decide whether an issuer can see their OWN offering in /investir/[offeringId]
// (loadPublicOffering, in src/app/investir/actions.ts, still decides
// whether the offering exists/is active — this function only resolves "is it theirs?").
// Never used to decide whether they can reserve — reserving still requires
// role==='investor' (see reserveInvestment in actions.ts).
export async function isOfferingOwner(offeringId: string, issuerAccountId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("offerings")
    .select("id")
    .eq("id", offeringId)
    .eq("issuer_id", issuerAccountId)
    .maybeSingle();
  return data !== null;
}

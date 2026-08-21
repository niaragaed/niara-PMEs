import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { TokenCategory } from "@/lib/mock/ativos";
import { getIssuerLogoVersion, issuerLogoUrl } from "@/lib/storage/issuer-logo";
import { getIssuerBannerVersion, issuerBannerUrl } from "@/lib/storage/issuer-banner";

// Conjunto de status que "ocupa" o hard_cap de uma oferta — mesmo conjunto
// que o trigger enforce_offering_hard_cap usa (supabase/migrations/0001_core.sql).
// Usado só para exibir "já reservado" na listagem (/investir) e no detalhe
// (/investir/[offeringId]); NUNCA para decidir aceitar/barrar um aporte —
// quem barra é o banco (FOR UPDATE), esta soma é puramente informativa e
// pode estar um instante desatualizada por concorrência.
export const CAP_OCCUPYING_STATUSES = ["reserved", "paid", "settled"];

// Cartão de vitrine de uma oferta REAL, para as páginas de categoria de
// /negociar (só chamado para investidor logado — ver CategoryPage.tsx).
// REGRA DE OURO: lista branca explícita, nunca select('*') — traz só o
// mínimo de vitrine (nome, setor, categoria, meta, valor por cota, cotas,
// prazo, logo/banner). CNPJ, telefone, endereço completo, receita e wallet NUNCA são
// buscados aqui; quem precisa desses campos é a ficha completa em
// /investir/[offeringId] (loadPublicOffering), que já aplica sua própria
// lista branca mais ampla.
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

// issuerAccountId (opcional) restringe a busca à própria empresa dona
// (issuers.id) — usado em CategoryPage.tsx quando role==='issuer', para
// mostrar só a(s) oferta(s) do próprio issuer logado, nunca de outra
// empresa. Sem esse filtro (caso de investidor), traz todas as ativas da
// categoria, comportamento inalterado.
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

      // Numero de cotas nao e coluna: deriva de base_cap_cents / share_price_cents
      // (mesma derivacao de supabase/migrations/0008_offer_details.sql), só
      // quando a empresa já definiu um valor por cota.
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
        category: category,
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

// Confere se accountId (issuers.id) é o dono de offeringId — usado só para
// decidir se um issuer pode ver a PRÓPRIA oferta em /investir/[offeringId]
// (loadPublicOffering, em src/app/investir/actions.ts, segue sendo quem
// decide se a oferta existe/está ativa — esta função só resolve "é dele?").
// Nunca usada para decidir se pode reservar — reserva continua exigindo
// role==='investor' (ver reserveInvestment em actions.ts).
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

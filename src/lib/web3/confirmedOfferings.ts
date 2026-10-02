import "server-only";

// Leitura pública das ofertas publicadas pelo self-service on-chain (Fase 3,
// /empresa/ofertas/[id]/publicar) e já confirmadas em Sepolia — consumida por /investir/onchain
// (Fase 4, sub-etapa 5.1) e pela vitrine de Token PMEs em /negociar/token-pmes (ver CLAUDE.md,
// "Tela /investir/onchain" → "Fase 4"). REGRA DE OURO (mesma de src/lib/investments.ts): lista
// branca explícita, nunca `select('*')` — CNPJ, telefone, endereço completo, faturamento e wallet
// do emissor nunca são buscados aqui.
//
// offerings.status fica sempre 'draft' para estas linhas (decisão da Fase 3 — ver CLAUDE.md,
// "Tela /empresa/ofertas"), então o filtro certo é sync_status='confirmada', não status='active'.
// contract_address/token_address só existem (não-nulos) quando sync_status já é 'confirmada' ou
// 'divergente' — filtrar por 'confirmada' já garante os dois presentes (CHECK
// sync_status_confirmada_tem_enderecos, migration 0015), mas o filtro extra abaixo é defensivo,
// mesmo padrão já usado em onchain-actions.ts.
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TokenCategory } from "@/lib/mock/ativos";
import { getIssuerLogoVersion, issuerLogoUrl } from "@/lib/storage/issuer-logo";
import { getIssuerBannerVersion, issuerBannerUrl } from "@/lib/storage/issuer-banner";

export type ConfirmedOnChainOffering = {
  id: string;
  contractAddress: `0x${string}`;
  tokenAddress: `0x${string}`;
  /** `offerings.category` — nullable na coluna, mas createOffering() sempre exige um valor para
   * ofertas self-service; `null` aqui só é possível pra uma linha fora do fluxo normal. */
  category: TokenCategory | null;
  issuerLegalName: string;
  issuerTradeName: string | null;
  issuerSector: string | null;
  /** Resumo do negócio preenchido pelo próprio emissor em /perfil — dado real, não fictício. */
  issuerBusinessSummary: string | null;
  /** Logo/banner reais enviados pelo emissor (upload real, Supabase Storage) — ver
   * src/lib/storage/issuer-logo.ts / issuer-banner.ts. `null` quando o emissor não enviou. */
  logoUrl: string | null;
  bannerUrl: string | null;
  /**
   * Meta máxima (hard cap) em centavos — mesma unidade/coluna que `confirmarPublicacao()`/
   * `verificarConsistencia()` (onchain-actions.ts) usam para conferir contra o `metaMaxima` já
   * minerado on-chain (`UNIDADE_ON_CHAIN`, src/lib/web3/gates.ts: "1 unidade MockBRL = 1 real
   * equivalente") — por isso é seguro mostrar direto, sem leitura on-chain por card: para uma
   * oferta `sync_status='confirmada'`, este valor JÁ bateu com a chain na hora da confirmação
   * (e é checado de novo a cada reconciliação, ver "Reconciliação contínua" no CLAUDE.md).
   */
  hardCapCents: number;
  /** Preço por cota em centavos, mesma unidade/garantia de `hardCapCents` acima. */
  sharePriceCents: number | null;
  /** Derivado de hardCapCents/sharePriceCents (mesma derivação de ActiveOfferingSummary,
   * src/lib/investments.ts) — `null` só se por algum motivo sharePriceCents também for `null`. */
  sharesCount: number | null;
};

const SELECT_COLUMNS =
  "id, contract_address, token_address, category, hard_cap_cents, share_price_cents, issuers(legal_name, trade_name, sector, business_summary, logo_path, banner_path)";

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
  contract_address: string | null;
  token_address: string | null;
  category: string | null;
  hard_cap_cents: number;
  share_price_cents: number | null;
  issuers: ConfirmedOfferingIssuerRow | ConfirmedOfferingIssuerRow[] | null;
};

// Postgrest embedding (`issuers(...)`) devolve objeto ou array dependendo da versão/config —
// mesma ambiguidade já tratada em investments.ts (firstIssuer), duplicada aqui como helper
// pequeno em vez de importada (mesmo padrão de não abstrair 2 usos só, ver etherscanAddress em
// OfertasPage.tsx).
function firstIssuer(issuers: ConfirmedOfferingRow["issuers"]): ConfirmedOfferingIssuerRow | null {
  if (!issuers) return null;
  return Array.isArray(issuers) ? (issuers[0] ?? null) : issuers;
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

  // Mesma derivação de ActiveOfferingSummary (src/lib/investments.ts): número de cotas nunca é
  // coluna, sempre hardCap/sharePrice — seguro aqui porque o CHECK on-chain
  // (PrecoNaoDivideMetaMaxima) já teria barrado a publicação se não dividisse exato.
  const sharesCount =
    row.share_price_cents && row.share_price_cents > 0
      ? Math.round(Number(row.hard_cap_cents) / Number(row.share_price_cents))
      : null;

  return {
    id: row.id,
    contractAddress: row.contract_address as `0x${string}`,
    tokenAddress: row.token_address as `0x${string}`,
    category: row.category as TokenCategory | null,
    issuerLegalName: issuerRow.legal_name,
    issuerTradeName: issuerRow.trade_name,
    issuerSector: issuerRow.sector,
    issuerBusinessSummary: issuerRow.business_summary,
    logoUrl,
    bannerUrl,
    hardCapCents: Number(row.hard_cap_cents),
    sharePriceCents: row.share_price_cents === null ? null : Number(row.share_price_cents),
    sharesCount,
  };
}

/**
 * Todas as ofertas self-service já confirmadas on-chain, mais recentes primeiro. Retorna lista
 * vazia (nunca lança) se não houver nenhuma ou se a consulta falhar — mesma filosofia de "nunca
 * quebra a página" de getOnChainAddresses()/getEventosOnChain(). Não filtra por categoria — quem
 * precisa de só uma categoria (ex.: vitrine de /negociar/token-pmes) filtra depois de ler, como
 * CategoryPage.tsx já faz.
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
 * Uma oferta self-service confirmada específica, por id — usada pela página de detalhe
 * (/negociar/oferta/[slug], onde o "slug" de uma oferta self-service é o próprio uuid de
 * `offerings.id`, já que essas linhas não têm coluna de slug legível, só a PK). Retorna `null`
 * (nunca lança) quando o id não é um uuid válido, a oferta não existe, não está confirmada, ou
 * falta categoria (defensivo: createOffering() sempre exige categoria para self-service, então
 * isso só aconteceria para uma linha fora do fluxo normal — sem categoria não dá pra montar
 * CategoryBadge/OfertaBanner, então tratamos como "não encontrada" em vez de quebrar a página).
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

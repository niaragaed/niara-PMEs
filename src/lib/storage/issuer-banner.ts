import "server-only";

// Storage do bucket público 'issuer-banners' (Supabase, criado no painel).
// Mesmo padrão de issuer-logo.ts: o banner é da EMPRESA (capa da oferta),
// público por natureza — aparece no card "Sua oferta nesta categoria" em
// /negociar, ao lado da logo. Validação de tipo/tamanho é SEMPRE feita no
// servidor (ver uploadIssuerBanner em src/app/perfil/actions.ts) — a do
// input do navegador é só cortesia de UX.
import type { SupabaseClient } from "@supabase/supabase-js";

export const ISSUER_BANNER_BUCKET = "issuer-banners";
// Ligeiramente maior que ISSUER_LOGO_MAX_BYTES (2MB, issuer-logo.ts) — o
// banner tende a ser uma foto mais larga que a logo, mas o limite segue
// baixo de propósito: OfertaBanner.tsx renderiza imagens do Storage via
// <img> puro (nunca next/image, ver comentário lá), sem nenhuma otimização
// automática, então o peso do arquivo cai direto no carregamento de
// /negociar e /perfil.
export const ISSUER_BANNER_MAX_BYTES = 3 * 1024 * 1024;

export const ISSUER_BANNER_EXT_BY_TYPE = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type IssuerBannerMimeType = keyof typeof ISSUER_BANNER_EXT_BY_TYPE;

export function isIssuerBannerMimeType(type: string): type is IssuerBannerMimeType {
  return type in ISSUER_BANNER_EXT_BY_TYPE;
}

// URL pública do bucket + cache-busting — mesma técnica de issuerLogoUrl
// (issuer-logo.ts): o upload sempre sobrescreve o mesmo caminho (upsert em
// `${issuerId}/banner.<ext>`), então o `?v=` evita servir uma versão em
// cache do navegador/CDN depois de trocar o banner.
export function issuerBannerUrl(bannerPath: string | null, version: string | null): string | null {
  if (!bannerPath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const url = `${base}/storage/v1/object/public/${ISSUER_BANNER_BUCKET}/${bannerPath}`;
  return version ? `${url}?v=${encodeURIComponent(version)}` : url;
}

// Lê o updated_at do próprio objeto no Storage — mesma técnica de
// getIssuerLogoVersion (issuers não tem coluna updated_at).
export async function getIssuerBannerVersion(admin: SupabaseClient, bannerPath: string): Promise<string | null> {
  const segments = bannerPath.split("/");
  const fileName = segments.pop();
  if (!fileName) return null;
  const folder = segments.join("/");

  const { data, error } = await admin.storage.from(ISSUER_BANNER_BUCKET).list(folder, {
    search: fileName,
    limit: 1,
  });

  if (error || !data || data.length === 0) return null;
  return data[0].updated_at ?? data[0].created_at ?? null;
}

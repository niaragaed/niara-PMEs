import "server-only";

// Storage do bucket público 'issuer-logos' (Supabase, criado no painel). A
// logo é da EMPRESA (identidade de marca), pública por natureza — diferente
// do AvatarUpload (foto de perfil, 100% simulada/local, nunca sai do
// navegador). Validação de tipo/tamanho é SEMPRE feita no servidor (ver
// uploadIssuerLogo em src/app/perfil/actions.ts) — a do input do navegador
// é só cortesia de UX.
import type { SupabaseClient } from "@supabase/supabase-js";

export const ISSUER_LOGO_BUCKET = "issuer-logos";
export const ISSUER_LOGO_MAX_BYTES = 2 * 1024 * 1024;

export const ISSUER_LOGO_EXT_BY_TYPE = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type IssuerLogoMimeType = keyof typeof ISSUER_LOGO_EXT_BY_TYPE;

export function isIssuerLogoMimeType(type: string): type is IssuerLogoMimeType {
  return type in ISSUER_LOGO_EXT_BY_TYPE;
}

// URL pública do bucket + cache-busting: o upload sempre sobrescreve o mesmo
// caminho (upsert em `${issuerId}/logo.<ext>`), então a URL pura fica igual
// entre uma logo e a próxima — sem o `?v=`, o navegador (ou um CDN no meio)
// pode continuar servindo a versão antiga do cache. O valor de `version` vem
// de getIssuerLogoVersion (metadata do próprio arquivo no Storage), não de
// updated_at do banco — a tabela issuers não tem essa coluna (0010 só
// acrescentou logo_path).
export function issuerLogoUrl(logoPath: string | null, version: string | null): string | null {
  if (!logoPath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const url = `${base}/storage/v1/object/public/${ISSUER_LOGO_BUCKET}/${logoPath}`;
  return version ? `${url}?v=${encodeURIComponent(version)}` : url;
}

// Lê o updated_at do próprio objeto no Storage via list() filtrado pelo nome
// do arquivo (não a pasta inteira) — única fonte real de "quando essa logo
// mudou pela última vez", já que não há coluna updated_at em issuers.
export async function getIssuerLogoVersion(admin: SupabaseClient, logoPath: string): Promise<string | null> {
  const segments = logoPath.split("/");
  const fileName = segments.pop();
  if (!fileName) return null;
  const folder = segments.join("/");

  const { data, error } = await admin.storage.from(ISSUER_LOGO_BUCKET).list(folder, {
    search: fileName,
    limit: 1,
  });

  if (error || !data || data.length === 0) return null;
  return data[0].updated_at ?? data[0].created_at ?? null;
}

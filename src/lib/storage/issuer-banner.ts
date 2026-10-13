import "server-only";

// Storage for the public 'issuer-banners' bucket (Supabase, created in the dashboard).
// Same pattern as issuer-logo.ts: the banner belongs to the COMPANY (the offering's cover),
// public by nature — it shows up on the "Your offering in this category" card in
// /negociar, next to the logo. Type/size validation is ALWAYS done on the
// server (see uploadIssuerBanner in src/app/perfil/actions.ts) — the one in the
// browser input is just a UX courtesy.
import type { SupabaseClient } from "@supabase/supabase-js";

export const ISSUER_BANNER_BUCKET = "issuer-banners";
// Slightly bigger than ISSUER_LOGO_MAX_BYTES (2MB, issuer-logo.ts) — the
// banner tends to be a wider photo than the logo, but the limit stays
// low on purpose: OfertaBanner.tsx renders Storage images via a
// plain <img> (never next/image, see the comment there), with no automatic
// optimization, so the file's weight lands straight on the loading of
// /negociar and /perfil.
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

// The bucket's public URL + cache-busting — the same technique as issuerLogoUrl
// (issuer-logo.ts): the upload always overwrites the same path (upsert at
// `${issuerId}/banner.<ext>`), so the `?v=` avoids serving a version cached by the
// browser/CDN after the banner is swapped.
export function issuerBannerUrl(bannerPath: string | null, version: string | null): string | null {
  if (!bannerPath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const url = `${base}/storage/v1/object/public/${ISSUER_BANNER_BUCKET}/${bannerPath}`;
  return version ? `${url}?v=${encodeURIComponent(version)}` : url;
}

// Reads the updated_at of the object itself in Storage — the same technique as
// getIssuerLogoVersion (issuers has no updated_at column).
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

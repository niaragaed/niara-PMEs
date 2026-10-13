import "server-only";

// Storage for the public 'issuer-logos' bucket (Supabase, created in the dashboard). The
// logo belongs to the COMPANY (brand identity), public by nature — unlike
// AvatarUpload (profile photo, 100% simulated/local, never leaves the
// browser). Type/size validation is ALWAYS done on the server (see
// uploadIssuerLogo in src/app/perfil/actions.ts) — the one in the browser input
// is just a UX courtesy.
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

// The bucket's public URL + cache-busting: the upload always overwrites the same
// path (upsert at `${issuerId}/logo.<ext>`), so the bare URL stays the same
// between one logo and the next — without `?v=`, the browser (or a CDN in between)
// may keep serving the old cached version. The `version` value comes
// from getIssuerLogoVersion (the file's own metadata in Storage), not from a
// database updated_at — the issuers table doesn't have that column (0010 only
// added logo_path).
export function issuerLogoUrl(logoPath: string | null, version: string | null): string | null {
  if (!logoPath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const url = `${base}/storage/v1/object/public/${ISSUER_LOGO_BUCKET}/${logoPath}`;
  return version ? `${url}?v=${encodeURIComponent(version)}` : url;
}

// Reads the updated_at of the object itself in Storage via list() filtered by the
// file name (not the whole folder) — the only real source of "when this logo
// last changed", since there's no updated_at column in issuers.
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

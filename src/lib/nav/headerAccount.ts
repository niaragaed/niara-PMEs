import "server-only";

// Minimal data about the signed-in user for the Header's account menu
// (AccountMenu.tsx) — never redirects, unlike loadProfile
// (src/app/perfil/actions.ts), because the Header renders on every route,
// including the public/anonymous ones.
import { resolveAccount, type AccountRole } from "@/lib/auth/resolveInvestor";
import { createAdminClient } from "@/lib/supabase/admin";
import { getIssuerLogoVersion, issuerLogoUrl } from "@/lib/storage/issuer-logo";

export type HeaderAccount = {
  role: AccountRole;
  name: string;
  logoUrl: string | null; // only filled in for role === 'issuer'
};

export async function loadHeaderAccount(): Promise<HeaderAccount | null> {
  const { userId, role, accountId } = await resolveAccount();
  if (!userId || !role || !accountId) return null;

  const admin = createAdminClient();

  if (role === "investor") {
    const { data } = await admin.from("investors").select("full_name").eq("id", accountId).single();
    return { role, name: data?.full_name ?? "", logoUrl: null };
  }

  const { data } = await admin.from("issuers").select("trade_name, legal_name, logo_path").eq("id", accountId).single();
  const logoUrl = data?.logo_path
    ? issuerLogoUrl(data.logo_path, await getIssuerLogoVersion(admin, data.logo_path))
    : null;

  return { role, name: data?.trade_name || data?.legal_name || "", logoUrl };
}

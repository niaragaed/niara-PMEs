import "server-only";

// Dados mínimos do usuário logado para o menu de conta do Header
// (AccountMenu.tsx) — nunca redireciona, diferente de loadProfile
// (src/app/perfil/actions.ts), porque o Header renderiza em toda rota,
// inclusive as públicas/anônimas.
import { resolveAccount, type AccountRole } from "@/lib/auth/resolveInvestor";
import { createAdminClient } from "@/lib/supabase/admin";
import { getIssuerLogoVersion, issuerLogoUrl } from "@/lib/storage/issuer-logo";

export type HeaderAccount = {
  role: AccountRole;
  logoUrl: string | null; // só preenchido para role === 'issuer'
};

export async function loadHeaderAccount(): Promise<HeaderAccount | null> {
  const { userId, role, accountId } = await resolveAccount();
  if (!userId || !role || !accountId) return null;

  if (role === "investor") {
    return { role, logoUrl: null };
  }

  const admin = createAdminClient();
  const { data } = await admin.from("issuers").select("logo_path").eq("id", accountId).single();
  const logoUrl = data?.logo_path
    ? issuerLogoUrl(data.logo_path, await getIssuerLogoVersion(admin, data.logo_path))
    : null;

  return { role, logoUrl };
}

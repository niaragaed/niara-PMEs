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
  name: string;
  logoUrl: string | null; // só preenchido para role === 'issuer'
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

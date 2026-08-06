import "server-only";

// Resolve a sessão do usuário logado (se houver) e o cadastro de domínio
// vinculado a ela (se já existir) — investidor OU empresa, no máximo um dos
// dois por usuário (ver supabase/migrations/0003_auth_link.sql e
// 0004_issuer_auth_link.sql). Não cria nenhum dos dois — só resolve o
// vínculo atual. Usa o admin client (service_role) para ler `investors`/
// `issuers` porque RLS ali é default-deny e ainda não há policy de leitura
// própria do usuário.
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

export type AccountRole = "investor" | "issuer";

export type ResolvedAccount = {
  userId: string | null;
  role: AccountRole | null;
  accountId: string | null;
};

export async function resolveAccount(): Promise<ResolvedAccount> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { userId: null, role: null, accountId: null };
  }

  const admin = createAdminClient();

  const { data: investor } = await admin
    .from("investors")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (investor) {
    return { userId: user.id, role: "investor", accountId: investor.id };
  }

  const { data: issuer } = await admin
    .from("issuers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (issuer) {
    return { userId: user.id, role: "issuer", accountId: issuer.id };
  }

  return { userId: user.id, role: null, accountId: null };
}

export type ResolvedInvestor = {
  userId: string | null;
  investorId: string | null;
};

// Wrapper de compatibilidade — mantido porque já havia um caller (ver
// src/app/conta/page.tsx). Novos callers devem usar resolveAccount direto.
export async function resolveInvestor(): Promise<ResolvedInvestor> {
  const { userId, role, accountId } = await resolveAccount();
  return { userId, investorId: role === "investor" ? accountId : null };
}

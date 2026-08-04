import "server-only";

// Resolve a sessão do usuário logado (se houver) e o investor vinculado a
// ela (se já existir). Não cria investor — só resolve o vínculo atual.
// Usa o admin client (service_role) para ler `investors` porque RLS ali é
// default-deny (ver supabase/migrations/0003_auth_link.sql) e ainda não há
// policy de leitura própria do usuário.
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

export type ResolvedInvestor = {
  userId: string | null;
  investorId: string | null;
};

export async function resolveInvestor(): Promise<ResolvedInvestor> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { userId: null, investorId: null };
  }

  const admin = createAdminClient();
  const { data: investor } = await admin
    .from("investors")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  return { userId: user.id, investorId: investor?.id ?? null };
}

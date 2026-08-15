import "server-only";

// Resolve se o usuário logado é um "sócio" (acesso interno, ver /socios) — separado por
// completo de resolveAccount() (investor|issuer) em resolveInvestor.ts, nunca reaproveitado
// nem confundido com ele. Controle de acesso é só uma allowlist de e-mail lida de variável de
// ambiente (NIARA_SOCIOS_EMAILS, separada por vírgula) — nunca hardcodada no código, porque
// este repositório é público. Autenticação em si continua sendo o mesmo Supabase Auth de
// sempre (signInWithPassword) — isto aqui só decide quem, já logado, pode ver a página.
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

export type ResolvedSocio = {
  userId: string | null;
  email: string | null;
  autorizado: boolean;
};

function lerAllowlist(): string[] {
  const raw = process.env.NIARA_SOCIOS_EMAILS ?? "";
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function resolveSocio(): Promise<ResolvedSocio> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { userId: null, email: null, autorizado: false };
  }

  const allowlist = lerAllowlist();
  const autorizado = allowlist.includes(user.email.toLowerCase());

  return { userId: user.id, email: user.email, autorizado };
}

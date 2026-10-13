import "server-only";

// Resolves the signed-in user's session (if any) and the domain registration
// linked to it (if it already exists) — investor OR company, at most one of the
// two per user (see supabase/migrations/0003_auth_link.sql and
// 0004_issuer_auth_link.sql). Creates neither — it only resolves the
// current link. Uses the admin client (service_role) to read `investors`/
// `issuers` because RLS there is default-deny and there's no self-read
// policy for the user yet.
import { redirect } from "next/navigation";
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

// A simple "must be signed in" gate for screens that don't require a specific
// role (investor OR issuer both work) — /negociar/*, /ativos. Not to be
// confused with the /perfil gate, which besides requiring sign-in also requires
// a role already defined (redirects to /cadastro if signed in but without a role).
export async function requireLogin(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?aviso=login-necessario");
  }
}

export type ResolvedInvestor = {
  userId: string | null;
  investorId: string | null;
};

// Compatibility wrapper — kept because there was already a caller (see
// src/app/conta/page.tsx). New callers should use resolveAccount directly.
export async function resolveInvestor(): Promise<ResolvedInvestor> {
  const { userId, role, accountId } = await resolveAccount();
  return { userId, investorId: role === "investor" ? accountId : null };
}

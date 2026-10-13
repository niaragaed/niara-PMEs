import "server-only";

// Resolves whether the signed-in user is a "partner" (internal access, see /socios) — completely
// separate from resolveAccount() (investor|issuer) in resolveInvestor.ts, never reused
// nor mixed up with it. Access control is just an email allowlist read from an environment
// variable (NIARA_SOCIOS_EMAILS, comma-separated) — never hard-coded, because
// this repository is public. Authentication itself is still the same Supabase Auth as
// always (signInWithPassword) — this only decides who, already signed in, can see the page.
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

export type ResolvedPartner = {
  userId: string | null;
  email: string | null;
  authorized: boolean;
};

function readAllowlist(): string[] {
  const raw = process.env.NIARA_SOCIOS_EMAILS ?? "";
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function resolvePartner(): Promise<ResolvedPartner> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { userId: null, email: null, authorized: false };
  }

  const allowlist = readAllowlist();
  const authorized = allowlist.includes(user.email.toLowerCase());

  return { userId: user.id, email: user.email, authorized };
}

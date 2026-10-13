import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignUpPage } from "@/components/cadastro/CadastroPage";
import { resolveAccount } from "@/lib/auth/resolveInvestor";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
  title: `${dict.signUp.meta.title} · Niara PMEs`,
  description: dict.signUp.meta.description,
  robots: { index: false, follow: false },
};
}

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // No session: this is now the account creation screen itself (step 1 —
  // new email/password, see CadastroPage.tsx) — it no longer redirects to
  // /entrar, which became sign-in only.
  if (!user) {
    return <SignUpPage initialStep="account" email="" />;
  }

  const { role } = await resolveAccount();
  if (role) {
    redirect("/conta");
  }

  // Already has a session (came back to finish a half-done registration, or
  // signed in via /entrar) — jumps straight to the type step, without asking
  // for email/password again.
  return <SignUpPage initialStep="type" email={user.email ?? ""} />;
}

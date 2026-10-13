import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignUpPage } from "@/components/cadastro/CadastroPage";
import { resolveAccount } from "@/lib/auth/resolveInvestor";
import { pt } from "@/lib/i18n/pt-br";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: `${pt.signUp.meta.title} · Niara PMEs`,
  description: pt.signUp.meta.description,
  robots: { index: false, follow: false },
};

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sem sessão: esta é a própria tela de criação de conta agora (passo 1 —
  // email/senha novos, ver CadastroPage.tsx) — não redireciona mais pra
  // /entrar, que virou só login.
  if (!user) {
    return <SignUpPage initialStep="conta" email="" />;
  }

  const { role } = await resolveAccount();
  if (role) {
    redirect("/conta");
  }

  // Já tem sessão (voltou pra completar um cadastro que ficou pela metade,
  // ou entrou via /entrar) — pula direto pro passo de tipo, sem pedir
  // email/senha de novo.
  return <SignUpPage initialStep="tipo" email={user.email ?? ""} />;
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CadastroPage } from "@/components/cadastro/CadastroPage";
import { resolveAccount } from "@/lib/auth/resolveInvestor";
import { ptBr } from "@/lib/i18n/pt-br";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: `${ptBr.cadastro.meta.title} · Niara PMEs`,
  description: ptBr.cadastro.meta.description,
  robots: { index: false, follow: false },
};

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const { role } = await resolveAccount();
  if (role) {
    redirect("/conta");
  }

  return <CadastroPage email={user.email ?? ""} />;
}
